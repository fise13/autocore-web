import "server-only";

import type { UserRole } from "@/domain/user";
import { emitNotificationEvent } from "@/lib/notifications/engine.server";

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  employee: "Сотрудник",
  mechanic: "Механик",
  accountant: "Бухгалтер",
  diagnostician: "Диагност",
};

export async function emitEmployeeJoinedByInviteNotifications(params: {
  companyId: string;
  companyName: string;
  uid: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  inviteId: string;
}): Promise<void> {
  const displayName = params.userName.trim() || params.userEmail.trim() || "Сотрудник";
  const roleLabel = ROLE_LABELS[params.role] ?? params.role;

  try {
    await emitNotificationEvent({
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
    });

    await emitNotificationEvent({
      companyId: params.companyId,
      eventType: "employee.joined_welcome",
      recipientUserIds: [params.uid],
      aggregateType: "invite",
      aggregateId: params.inviteId,
      payload: {
        companyName: params.companyName,
        role: roleLabel,
        summary: `Вы присоединились к «${params.companyName}»`,
      },
    });
  } catch (error) {
    console.error("[team-notifications] join notifications failed", error);
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

  try {
    await emitNotificationEvent({
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
    });
  } catch (error) {
    console.error("[team-notifications] invite notification failed", error);
  }
}
