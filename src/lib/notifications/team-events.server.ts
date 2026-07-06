import "server-only";

import type { NotificationEventContext } from "@/domain/notifications";
import type { UserRole } from "@/domain/user";
import {
  createInboxNotification,
  listTeamAdminRecipients,
} from "@/infrastructure/firestore/notification-repository.server";
import { dispatchPushForNotification } from "@/lib/notifications/dispatch.server";

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  employee: "Сотрудник",
  mechanic: "Механик",
  accountant: "Бухгалтер",
  diagnostician: "Диагност",
};

async function deliverInboxNotification(
  userId: string,
  companyId: string,
  ctx: NotificationEventContext,
): Promise<void> {
  const record = await createInboxNotification({
    userId,
    companyId,
    ctx,
    channelsDelivered: ["inbox", "push"],
  });

  try {
    await dispatchPushForNotification(userId, record);
  } catch (error) {
    console.warn("[team-notifications] push dispatch skipped", { userId, error });
  }
}

export async function emitEmployeeJoinedByInviteNotifications(params: {
  companyId: string;
  companyName: string;
  uid: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  inviteId: string;
  inviterUserId?: string;
}): Promise<void> {
  const displayName = params.userName.trim() || params.userEmail.trim() || "Сотрудник";
  const roleLabel = ROLE_LABELS[params.role] ?? params.role;

  const welcomeCtx: NotificationEventContext = {
    companyId: params.companyId,
    eventType: "employee.joined_welcome",
    aggregateType: "invite",
    aggregateId: params.inviteId,
    payload: {
      companyName: params.companyName,
      role: roleLabel,
      summary: `Вы присоединились к «${params.companyName}»`,
    },
    title: "Добро пожаловать в команду",
    body: `Вы присоединились к «${params.companyName}»`,
    deepLink: "autocoremobile://",
  };

  const adminCtx: NotificationEventContext = {
    companyId: params.companyId,
    eventType: "employee.joined_by_invite",
    actorUserId: params.uid,
    actorName: displayName,
    aggregateType: "employee",
    aggregateId: params.uid,
    eventId: `invite-accepted:${params.inviteId}`,
    payload: {
      summary: `${displayName} присоединился к команде`,
      role: roleLabel,
      email: params.userEmail,
    },
    deepLink: "autocoremobile://profile/team",
  };

  try {
    await deliverInboxNotification(params.uid, params.companyId, welcomeCtx);

    const recipientIds = new Set<string>();
    const teamAdmins = await listTeamAdminRecipients(params.companyId, params.uid);
    for (const admin of teamAdmins) {
      recipientIds.add(admin.id);
    }

    const inviterId = params.inviterUserId?.trim();
    if (inviterId && inviterId !== params.uid) {
      recipientIds.add(inviterId);
    }

    await Promise.all(
      Array.from(recipientIds).map((userId) =>
        deliverInboxNotification(userId, params.companyId, adminCtx),
      ),
    );
  } catch (error) {
    console.error("[team-notifications] join notifications failed", error);
    throw error;
  }
}

export async function emitEmployeeInvitedNotification(params: {
  companyId: string;
  actorUserId: string;
  actorName?: string;
  email: string;
  role: UserRole;
  inviteId: string;
}): Promise<void> {
  const roleLabel = ROLE_LABELS[params.role] ?? params.role;

  const ctx: NotificationEventContext = {
    companyId: params.companyId,
    eventType: "employee.invited",
    actorUserId: params.actorUserId,
    actorName: params.actorName,
    aggregateType: "invite",
    aggregateId: params.inviteId,
    payload: {
      email: params.email,
      role: roleLabel,
      summary: `Приглашение отправлено на ${params.email}`,
    },
    deepLink: "autocoremobile://profile/team",
  };

  try {
    const recipients = await listTeamAdminRecipients(params.companyId, params.actorUserId);
    const recipientIds = new Set(recipients.map((user) => user.id));
    recipientIds.add(params.actorUserId);

    await Promise.all(
      Array.from(recipientIds).map((userId) =>
        deliverInboxNotification(userId, params.companyId, ctx),
      ),
    );
  } catch (error) {
    console.error("[team-notifications] invite notification failed", error);
  }
}
