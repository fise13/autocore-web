import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { NotificationEventContext } from "@/domain/notifications";
import type { UserRole } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  createInboxNotification,
  hasInboxNotification,
  listTeamAdminRecipients,
} from "@/infrastructure/firestore/notification-repository.server";
import { normalizeCompanyId } from "@/lib/company-id";
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

async function appendTeamActivityLog(
  companyId: string,
  payload: {
    action: string;
    actor: string;
    actorName: string;
    target: string;
    targetId: string;
    targetName: string;
  },
): Promise<void> {
  try {
    const normalized = normalizeCompanyId(companyId);
    await getAdminFirestore()
      .collection("companies")
      .doc(normalized)
      .collection("activityLogs")
      .add({
        companyId: normalized,
        action: payload.action,
        actor: payload.actor,
        actorName: payload.actorName,
        target: payload.target,
        targetId: payload.targetId,
        targetName: payload.targetName,
        module: "employees",
        severity: "info",
        timestamp: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.warn("[team-notifications] activity log skipped", error);
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

    await appendTeamActivityLog(params.companyId, {
      action: "employee.joined_by_invite",
      actor: params.uid,
      actorName: displayName,
      target: "employee",
      targetId: params.uid,
      targetName: displayName,
    });
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

export async function emitMemberRemovedFromCompanyNotification(params: {
  companyId: string;
  companyName: string;
  targetUserId: string;
  actorUserId: string;
}): Promise<void> {
  const ctx: NotificationEventContext = {
    companyId: params.companyId,
    eventType: "employee.removed_from_company",
    actorUserId: params.actorUserId,
    aggregateType: "company",
    aggregateId: params.companyId,
    payload: {
      companyName: params.companyName,
      summary: `Вас удалили из «${params.companyName}»`,
    },
    deepLink: "autocoremobile://profile/workspace",
  };

  try {
    await deliverInboxNotification(params.targetUserId, params.companyId, ctx);
  } catch (error) {
    console.error("[team-notifications] member removed notification failed", error);
  }
}

export async function backfillTeamJoinNotificationsForCompany(params: {
  companyId: string;
  dryRun?: boolean;
}): Promise<{ created: number; skipped: number; employees: number }> {
  const companyId = normalizeCompanyId(params.companyId);
  const db = getAdminFirestore();
  const companySnap = await db.collection("companies").doc(companyId).get();
  if (!companySnap.exists) {
    return { created: 0, skipped: 0, employees: 0 };
  }

  const companyName = String(companySnap.data()?.name ?? "AutoCore");
  const ownerId = String(companySnap.data()?.ownerId ?? "");
  const employeesSnap = await db
    .collection("companies")
    .doc(companyId)
    .collection("employees")
    .where("isActive", "==", true)
    .get();

  let created = 0;
  let skipped = 0;

  for (const employeeDoc of employeesSnap.docs) {
    const employeeUid = employeeDoc.id;
    if (employeeUid === ownerId) continue;

    const employeeData = employeeDoc.data();
    const role = normalizeRole(String(employeeData.role ?? "employee"));
    const displayName =
      String(employeeData.fullName ?? "").trim() ||
      String(employeeData.email ?? "").trim() ||
      "Сотрудник";
    const roleLabel = ROLE_LABELS[role] ?? role;
    const inviteId = String(employeeData.inviteId ?? employeeUid);

    const teamAdmins = await listTeamAdminRecipients(companyId, employeeUid);
    const recipientIds = new Set(teamAdmins.map((user) => user.id));
    const inviterId = String(employeeData.invitedBy ?? "").trim();
    if (inviterId && inviterId !== employeeUid) {
      recipientIds.add(inviterId);
    }

    const adminCtx: NotificationEventContext = {
      companyId,
      eventType: "employee.joined_by_invite",
      actorUserId: employeeUid,
      actorName: displayName,
      aggregateType: "employee",
      aggregateId: employeeUid,
      eventId: `backfill:invite-accepted:${inviteId}`,
      payload: {
        summary: `${displayName} присоединился к команде`,
        role: roleLabel,
        email: String(employeeData.email ?? ""),
      },
      deepLink: "autocoremobile://profile/team",
    };

    let employeeSkipped = true;
    for (const userId of recipientIds) {
      const exists = await hasInboxNotification({
        userId,
        companyId,
        eventType: "employee.joined_by_invite",
        aggregateId: employeeUid,
      });
      if (exists) continue;

      employeeSkipped = false;
      if (!params.dryRun) {
        await deliverInboxNotification(userId, companyId, adminCtx);
      }
      created += 1;
    }

    if (employeeSkipped) {
      skipped += 1;
    }
  }

  return {
    created,
    skipped,
    employees: employeesSnap.size - (ownerId ? 1 : 0),
  };
}

function normalizeRole(role: string): UserRole {
  const normalized = role.trim().toLowerCase();
  if (
    normalized === "owner" ||
    normalized === "admin" ||
    normalized === "manager" ||
    normalized === "employee" ||
    normalized === "mechanic" ||
    normalized === "accountant" ||
    normalized === "diagnostician"
  ) {
    return normalized;
  }
  return "employee";
}

export async function emitMemberAccessSuspendedNotification(params: {
  companyId: string;
  companyName: string;
  targetUserId: string;
  actorUserId: string;
}): Promise<void> {
  const ctx: NotificationEventContext = {
    companyId: params.companyId,
    eventType: "employee.access_suspended",
    actorUserId: params.actorUserId,
    aggregateType: "company",
    aggregateId: params.companyId,
    payload: {
      companyName: params.companyName,
      summary: `Доступ к «${params.companyName}» приостановлен администратором`,
    },
    deepLink: "autocoremobile://profile/workspace",
  };

  try {
    await deliverInboxNotification(params.targetUserId, params.companyId, ctx);
  } catch (error) {
    console.error("[team-notifications] member suspended notification failed", error);
  }
}
