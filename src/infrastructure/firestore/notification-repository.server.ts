import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type {
  NotificationDevice,
  NotificationEventContext,
  NotificationPreferences,
  NotificationRecord,
} from "@/domain/notifications";
import { getNotificationEventDefinition, PRIORITY_CHANNELS } from "@/domain/notifications";
import { hasPermission, USER_ROLES, type UserEntity, type UserRole } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  buildGroupBucketId,
  buildGroupedCopy,
  groupBucketExpiresAt,
  isGroupBucketActive,
} from "@/lib/notifications/grouping";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isCategoryEnabled,
  mergeNotificationPreferences,
  resolveChannelsForUser,
} from "@/lib/notifications/preference-resolver";

const NOTIFICATIONS = "notifications";
const PREFERENCES = "notificationPreferences";
const DEVICES = "devices";
const GROUP_BUCKETS = "notificationGroupBuckets";

export async function readNotificationPreferences(
  uid: string,
): Promise<NotificationPreferences> {
  const snap = await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .collection(PREFERENCES)
    .doc("default")
    .get();

  if (!snap.exists) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return mergeNotificationPreferences(snap.data() as Partial<NotificationPreferences>);
}

export async function writeNotificationPreferences(
  uid: string,
  preferences: NotificationPreferences,
): Promise<void> {
  await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .collection(PREFERENCES)
    .doc("default")
    .set(
      {
        ...preferences,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
}

export async function upsertNotificationDevice(
  uid: string,
  device: Omit<NotificationDevice, "lastSeenAt">,
): Promise<void> {
  await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .collection(DEVICES)
    .doc(device.id)
    .set(
      {
        ...device,
        lastSeenAt: new Date().toISOString(),
      },
      { merge: true },
    );
}

export async function listUserDevices(uid: string): Promise<NotificationDevice[]> {
  const snap = await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .collection(DEVICES)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      platform: data.platform as NotificationDevice["platform"],
      pushToken: String(data.pushToken ?? ""),
      appVersion: typeof data.appVersion === "string" ? data.appVersion : undefined,
      lastSeenAt: String(data.lastSeenAt ?? new Date().toISOString()),
    };
  });
}

async function listCompanyEmployees(companyId: string): Promise<UserEntity[]> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  const companySnap = await db.collection("companies").doc(normalized).get();
  const ownerId = String(companySnap.data()?.ownerId ?? "");

  const employeesSnap = await db
    .collection("companies")
    .doc(normalized)
    .collection("employees")
    .where("isActive", "==", true)
    .get();

  const users: UserEntity[] = [];
  for (const employeeDoc of employeesSnap.docs) {
    const uid = employeeDoc.id;
    const employeeData = employeeDoc.data();
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) continue;

    const user = mapAdminUser(uid, userSnap.data() as Record<string, unknown>);
    const employeeRole = String(employeeData.role ?? user.role);
    const roleFromEmployee = USER_ROLES.includes(employeeRole as UserRole)
      ? (employeeRole as UserRole)
      : user.role;
    const role: UserRole = uid === ownerId ? "owner" : roleFromEmployee;

    users.push({
      ...user,
      role,
      companyId: normalized,
      permissions: Array.isArray(employeeData.permissions)
        ? employeeData.permissions
        : user.permissions,
      isActive: employeeData.isActive !== false,
      isCompanyOwner: uid === ownerId || user.isCompanyOwner === true,
    });
  }

  if (ownerId && !users.some((user) => user.id === ownerId)) {
    const ownerSnap = await db.collection("users").doc(ownerId).get();
    if (ownerSnap.exists) {
      users.push({
        ...mapAdminUser(ownerId, ownerSnap.data() as Record<string, unknown>),
        role: "owner",
        companyId: normalized,
        isCompanyOwner: true,
        isActive: true,
      });
    }
  }

  return users;
}

/** Owners/admins/managers who should receive team alerts. */
export async function listTeamAdminRecipients(
  companyId: string,
  excludeUserId?: string,
): Promise<UserEntity[]> {
  const employees = await listCompanyEmployees(companyId);
  return employees.filter((user) => {
    if (excludeUserId && user.id === excludeUserId) return false;
    if (user.isCompanyOwner) return true;
    if (!["owner", "admin", "manager"].includes(user.role)) return false;
    return hasPermission(user, "employee_manage");
  });
}

function shouldNotifyUser(params: {
  user: UserEntity;
  ctx: NotificationEventContext;
  def: ReturnType<typeof getNotificationEventDefinition>;
}): boolean {
  const { user, ctx, def } = params;
  if (!def.roles.includes(user.role)) return false;
  if (def.permissions?.length) {
    const allowed = def.permissions.some((permission) =>
      hasPermission(user, permission as Parameters<typeof hasPermission>[1]),
    );
    if (!allowed) return false;
  }

  if (
    def.assigneeOnlyForRoles?.includes(user.role) &&
    ctx.assigneeUserIds?.length &&
    !ctx.assigneeUserIds.includes(user.id)
  ) {
    return false;
  }

  if (ctx.recipientUserIds?.length && !ctx.recipientUserIds.includes(user.id)) {
    return false;
  }

  if (ctx.actorUserId && ctx.actorUserId === user.id) {
    const selfNotify = ["work_order.assigned", "subscription.expiring", "system.error"];
    if (!selfNotify.includes(ctx.eventType)) return false;
  }

  return true;
}

export async function resolveNotificationRecipients(
  ctx: NotificationEventContext,
): Promise<UserEntity[]> {
  const def = getNotificationEventDefinition(ctx.eventType);

  if (ctx.recipientUserIds?.length) {
    const db = getAdminFirestore();
    const users: UserEntity[] = [];
    for (const uid of ctx.recipientUserIds) {
      const snap = await db.collection("users").doc(uid).get();
      if (snap.exists) {
        users.push(mapAdminUser(uid, snap.data() as Record<string, unknown>));
      }
    }
    return users;
  }

  const employees = await listCompanyEmployees(ctx.companyId);
  return employees.filter((user) => shouldNotifyUser({ user, ctx, def }));
}

export async function createInboxNotification(params: {
  userId: string;
  companyId: string;
  ctx: NotificationEventContext;
  channelsDelivered: NotificationRecord["channelsDelivered"];
  groupKey?: string;
  groupCount?: number;
  title?: string;
  body?: string;
}): Promise<NotificationRecord> {
  const def = getNotificationEventDefinition(params.ctx.eventType);
  const copy = def.buildCopy(params.ctx);
  const ref = getAdminFirestore().collection(NOTIFICATIONS).doc();
  const now = new Date().toISOString();

  const record: NotificationRecord = {
    id: ref.id,
    userId: params.userId,
    companyId: normalizeCompanyId(params.companyId),
    eventType: params.ctx.eventType,
    category: def.category,
    priority: def.priority,
    title: params.title ?? params.ctx.title ?? copy.title,
    body: params.body ?? params.ctx.body ?? copy.body,
    state: "unread",
    deepLink: params.ctx.deepLink ?? def.buildDeepLink(params.ctx),
    groupKey: params.groupKey,
    groupCount: params.groupCount,
    actorUserId: params.ctx.actorUserId,
    actorName: params.ctx.actorName,
    aggregateType: params.ctx.aggregateType,
    aggregateId: params.ctx.aggregateId,
    eventId: params.ctx.eventId,
    channelsDelivered: params.channelsDelivered,
    createdAt: now,
  };

  await ref.set(record);
  return record;
}

export async function upsertGroupedNotification(params: {
  userId: string;
  companyId: string;
  ctx: NotificationEventContext;
  channelsDelivered: NotificationRecord["channelsDelivered"];
}): Promise<NotificationRecord> {
  const def = getNotificationEventDefinition(params.ctx.eventType);
  const groupKey = def.buildGroupKey(params.ctx);
  const bucketId = buildGroupBucketId(params.companyId, params.userId, groupKey);
  const bucketRef = getAdminFirestore()
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection(GROUP_BUCKETS)
    .doc(bucketId);

  const bucketSnap = await bucketRef.get();
  const nowIso = new Date().toISOString();

  if (bucketSnap.exists) {
    const bucket = bucketSnap.data() as {
      count: number;
      notificationId: string;
      expiresAt: string;
      actorName?: string;
    };
    if (isGroupBucketActive(bucket.expiresAt)) {
      const nextCount = bucket.count + 1;
      const grouped = buildGroupedCopy({
        ctx: params.ctx,
        count: nextCount,
        actorName: params.ctx.actorName ?? bucket.actorName,
      });

      await getAdminFirestore()
        .collection(NOTIFICATIONS)
        .doc(bucket.notificationId)
        .set(
          {
            title: grouped.title,
            body: grouped.body,
            groupCount: nextCount,
            state: "unread",
            channelsDelivered: FieldValue.arrayUnion(...params.channelsDelivered),
            createdAt: nowIso,
          },
          { merge: true },
        );

      await bucketRef.set(
        {
          count: nextCount,
          expiresAt: groupBucketExpiresAt(def.groupWindowMinutes),
          actorName: params.ctx.actorName ?? bucket.actorName,
          updatedAt: nowIso,
        },
        { merge: true },
      );

      const updated = await getAdminFirestore()
        .collection(NOTIFICATIONS)
        .doc(bucket.notificationId)
        .get();
      return updated.data() as NotificationRecord;
    }
  }

  const created = await createInboxNotification({
    ...params,
    groupKey,
    groupCount: 1,
  });

  await bucketRef.set({
    id: bucketId,
    userId: params.userId,
    companyId: normalizeCompanyId(params.companyId),
    groupKey,
    eventType: params.ctx.eventType,
    count: 1,
    notificationId: created.id,
    actorName: params.ctx.actorName,
    expiresAt: groupBucketExpiresAt(def.groupWindowMinutes),
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  return created;
}

export async function listInboxNotifications(params: {
  userId: string;
  companyId: string;
  state?: NotificationRecord["state"] | "active";
  limit?: number;
}): Promise<NotificationRecord[]> {
  const limit = params.limit ?? 50;
  const normalizedCompanyId = normalizeCompanyId(params.companyId);
  const snap = await getAdminFirestore()
    .collection(NOTIFICATIONS)
    .where("userId", "==", params.userId)
    .get();

  const items = snap.docs
    .map((doc) => doc.data() as NotificationRecord)
    .filter((item) => item.companyId === normalizedCompanyId)
    .filter((item) => {
      if (!params.state || params.state === "active") {
        return item.state === "unread" || item.state === "read";
      }
      return item.state === params.state;
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);

  return items;
}

export async function countUnreadNotifications(
  userId: string,
  companyId: string,
): Promise<number> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const snap = await getAdminFirestore()
    .collection(NOTIFICATIONS)
    .where("userId", "==", userId)
    .get();
  return snap.docs.reduce((count, doc) => {
    const item = doc.data() as NotificationRecord;
    return count + (item.companyId === normalizedCompanyId && item.state === "unread" ? 1 : 0);
  }, 0);
}

export async function updateNotificationState(params: {
  notificationId: string;
  userId: string;
  state: NotificationRecord["state"];
}): Promise<void> {
  const ref = getAdminFirestore().collection(NOTIFICATIONS).doc(params.notificationId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() as NotificationRecord;
  if (data.userId !== params.userId) return;

  const patch: Record<string, unknown> = { state: params.state };
  if (params.state === "read") patch.readAt = new Date().toISOString();
  if (params.state === "archived") patch.archivedAt = new Date().toISOString();

  await ref.set(patch, { merge: true });
}

export async function markAllNotificationsRead(
  userId: string,
  companyId: string,
): Promise<number> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const snap = await getAdminFirestore()
    .collection(NOTIFICATIONS)
    .where("userId", "==", userId)
    .get();

  const batch = getAdminFirestore().batch();
  const now = new Date().toISOString();
  let updated = 0;
  for (const doc of snap.docs) {
    const item = doc.data() as NotificationRecord;
    if (item.companyId !== normalizedCompanyId || item.state !== "unread") continue;
    batch.set(doc.ref, { state: "read", readAt: now }, { merge: true });
    updated += 1;
  }
  await batch.commit();
  return updated;
}

export function channelsForDefinition(
  def: ReturnType<typeof getNotificationEventDefinition>,
): Array<"inbox" | "push" | "badge"> {
  const merged = new Set<"inbox" | "push" | "badge">();
  for (const channel of PRIORITY_CHANNELS[def.priority]) {
    if (channel === "email" || channel === "sms" || channel === "webhook") continue;
    merged.add(channel);
  }
  for (const channel of def.defaultChannels) {
    if (channel === "email" || channel === "sms" || channel === "webhook") continue;
    merged.add(channel);
  }
  return Array.from(merged);
}

export async function deliverNotificationToUser(params: {
  user: UserEntity;
  ctx: NotificationEventContext;
}): Promise<NotificationRecord | null> {
  const def = getNotificationEventDefinition(params.ctx.eventType);
  const preferences = await readNotificationPreferences(params.user.id);

  if (!isCategoryEnabled(preferences, def.category)) {
    return null;
  }

  const requested = channelsForDefinition(def);
  const resolved = resolveChannelsForUser({
    preferences,
    priority: def.priority,
    requested,
  });

  if (!resolved.includes("inbox") && !resolved.includes("push")) {
    return null;
  }

  const channelsDelivered = resolved.filter(
    (channel): channel is "inbox" | "push" | "badge" =>
      channel === "inbox" || channel === "push" || channel === "badge",
  );

  const record =
    def.groupable && resolved.includes("inbox")
      ? await upsertGroupedNotification({
          userId: params.user.id,
          companyId: params.ctx.companyId,
          ctx: params.ctx,
          channelsDelivered,
        })
      : await createInboxNotification({
          userId: params.user.id,
          companyId: params.ctx.companyId,
          ctx: params.ctx,
          channelsDelivered,
        });

  return record;
}
