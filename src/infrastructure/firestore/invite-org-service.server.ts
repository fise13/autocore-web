import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import type { UserRole } from "@/domain/user";
import { USER_ROLES } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { generateInviteToken } from "@/lib/invites/invite-token";
import { getResend, getSupportFrom, isResendConfigured } from "@/lib/email/resend-client";
import {
  buildInviteEmailHtml,
  buildInviteEmailSubject,
} from "@/lib/email/templates/invite-email";
import {
  type AcceptInviteResult,
  type InvitePreview,
  type InviteStatus,
  OrgError,
  buildInviteUrl,
  emailsMatch,
  inviteCanBeAccepted,
  normalizeInviteStatus,
} from "@autocore/org";

const INVITES = "invites";
const COMPANIES = "companies";
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizeRole(role: string): UserRole {
  const normalized = role === "viewer" ? "employee" : role;
  return USER_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : "employee";
}

function readExpiresAt(raw: unknown): Date | null {
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === "object" && raw !== null && "toDate" in raw) {
    const toDate = (raw as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") return toDate.call(raw);
  }
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function generateInviteCode(length = 6): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
}

async function findInviteByToken(token: string) {
  const db = getAdminFirestore();
  const snapshot = await db.collection(INVITES).where("token", "==", token.trim()).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  return { id: doc.id, data: doc.data() };
}

async function getCompanyName(companyId: string): Promise<string> {
  const snap = await getAdminFirestore().collection(COMPANIES).doc(companyId).get();
  if (!snap.exists) throw new OrgError("org_not_found", 404);
  return String(snap.data()?.name ?? "AutoCore");
}

export async function previewInviteByToken(token: string): Promise<InvitePreview> {
  const found = await findInviteByToken(token);
  if (!found) throw new OrgError("invite_not_found", 404);

  const invite = found.data;
  const companyId = normalizeCompanyId(String(invite.companyId ?? ""));
  if (!companyId) throw new OrgError("invite_not_found", 404);

  const companySnap = await getAdminFirestore().collection(COMPANIES).doc(companyId).get();
  if (!companySnap.exists) throw new OrgError("org_deleted", 410);

  const expiresAt = readExpiresAt(invite.expiresAt);
  const expiresIso = expiresAt?.toISOString() ?? new Date().toISOString();
  const status = normalizeInviteStatus({
    status: invite.status as InviteStatus | undefined,
    used: invite.used === true,
    expiresAt: expiresIso,
  });

  let inviterName: string | null = null;
  const createdBy = String(invite.createdBy ?? "");
  if (createdBy) {
    const inviterSnap = await getAdminFirestore().collection("users").doc(createdBy).get();
    inviterName = inviterSnap.exists ? String(inviterSnap.data()?.name ?? "") : null;
  }

  return {
    token: token.trim(),
    email: typeof invite.email === "string" ? invite.email.trim().toLowerCase() : null,
    companyId,
    companyName: String(companySnap.data()?.name ?? "AutoCore"),
    companyLogoUrl:
      typeof companySnap.data()?.logoUrl === "string" ? companySnap.data()?.logoUrl : null,
    role: normalizeRole(String(invite.role ?? "employee")),
    status,
    expiresAt: expiresIso,
    inviterName,
    canAccept: inviteCanBeAccepted(status),
  };
}

export async function acceptInviteAsUser(params: {
  uid: string;
  token: string;
  userEmail: string;
  userName?: string;
  switchToCompany?: boolean;
}): Promise<AcceptInviteResult> {
  const found = await findInviteByToken(params.token);
  if (!found) throw new OrgError("invite_not_found", 404);

  const invite = found.data;
  const companyId = normalizeCompanyId(String(invite.companyId ?? ""));
  if (!companyId) throw new OrgError("invite_not_found", 404);

  const companySnap = await getAdminFirestore().collection(COMPANIES).doc(companyId).get();
  if (!companySnap.exists) throw new OrgError("org_deleted", 410);

  const companyName = String(companySnap.data()?.name ?? "AutoCore");
  const role = normalizeRole(String(invite.role ?? "employee"));
  const expiresAt = readExpiresAt(invite.expiresAt);
  const expiresIso = expiresAt?.toISOString() ?? new Date().toISOString();
  const status = normalizeInviteStatus({
    status: invite.status as InviteStatus | undefined,
    used: invite.used === true,
    expiresAt: expiresIso,
  });

  if (status === "cancelled") throw new OrgError("invite_cancelled", 410);
  if (status === "declined") throw new OrgError("invite_declined", 410);
  if (status === "expired") throw new OrgError("invite_expired", 410);

  const inviteEmail = typeof invite.email === "string" ? invite.email.trim().toLowerCase() : "";
  const userEmail = params.userEmail.trim().toLowerCase();
  if (inviteEmail && userEmail && !emailsMatch(inviteEmail, userEmail)) {
    throw new OrgError("email_mismatch", 409);
  }

  const db = getAdminFirestore();
  const employeeRef = db.collection(COMPANIES).doc(companyId).collection("employees").doc(params.uid);
  const employeeSnap = await employeeRef.get();

  if (employeeSnap.exists) {
    await recordMembershipAdmin(params.uid, companyId, role);
    return {
      companyId,
      companyName,
      role,
      switched: false,
      alreadyMember: true,
    };
  }

  if (status === "accepted" && !employeeSnap.exists) {
    throw new OrgError("invite_already_accepted", 409);
  }

  if (!inviteCanBeAccepted(status)) {
    throw new OrgError("invite_not_found", 404);
  }

  await employeeRef.set(
    {
      uid: params.uid,
      companyId,
      email: userEmail,
      fullName: params.userName ?? "",
      role,
      permissions: [],
      invitedBy: String(invite.createdBy ?? ""),
      inviteId: found.id,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      lastActiveAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );

  const nowIso = new Date().toISOString();
  await db.collection(INVITES).doc(found.id).set(
    {
      used: true,
      status: "accepted",
      acceptedAt: nowIso,
      acceptedBy: params.uid,
    },
    { merge: true },
  );

  await recordMembershipAdmin(params.uid, companyId, role);

  const userRef = db.collection("users").doc(params.uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() ?? {};
  const activeCompanyId = String(userData.companyId ?? "").trim();
  const shouldSwitch =
    params.switchToCompany === true || !activeCompanyId || activeCompanyId === "default";

  if (shouldSwitch) {
    await userRef.set(
      {
        companyId,
        role,
        permissions: [],
        isActive: true,
      },
      { merge: true },
    );
  }

  return {
    companyId,
    companyName,
    role,
    switched: shouldSwitch,
    alreadyMember: false,
  };
}

export async function declineInviteAsUser(params: {
  uid: string;
  token: string;
}): Promise<void> {
  const found = await findInviteByToken(params.token);
  if (!found) throw new OrgError("invite_not_found", 404);

  const expiresAt = readExpiresAt(found.data.expiresAt);
  const status = normalizeInviteStatus({
    status: found.data.status as InviteStatus | undefined,
    used: found.data.used === true,
    expiresAt: expiresAt?.toISOString() ?? new Date().toISOString(),
  });

  if (!inviteCanBeAccepted(status)) {
    throw new OrgError("invite_not_found", 404);
  }

  await getAdminFirestore()
    .collection(INVITES)
    .doc(found.id)
    .set(
      {
        status: "declined",
        declinedAt: new Date().toISOString(),
        declinedBy: params.uid,
      },
      { merge: true },
    );
}

export async function revokeInviteAsAdmin(params: {
  inviteId: string;
  companyId: string;
  revokedBy: string;
}): Promise<void> {
  const ref = getAdminFirestore().collection(INVITES).doc(params.inviteId);
  const snap = await ref.get();
  if (!snap.exists) throw new OrgError("invite_not_found", 404);
  const data = snap.data()!;
  if (normalizeCompanyId(String(data.companyId ?? "")) !== normalizeCompanyId(params.companyId)) {
    throw new OrgError("permission_denied", 403);
  }

  await ref.set(
    {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      revokedBy: params.revokedBy,
    },
    { merge: true },
  );
}

export async function resendInviteAsAdmin(params: {
  inviteId: string;
  companyId: string;
  ttlHours?: number;
}): Promise<{ joinUrl: string }> {
  const db = getAdminFirestore();
  const ref = db.collection(INVITES).doc(params.inviteId);
  const snap = await ref.get();
  if (!snap.exists) throw new OrgError("invite_not_found", 404);

  const data = snap.data()!;
  if (normalizeCompanyId(String(data.companyId ?? "")) !== normalizeCompanyId(params.companyId)) {
    throw new OrgError("permission_denied", 403);
  }

  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!email) throw new OrgError("unexpected", 400, "Приглашение без email нельзя отправить повторно");

  const token = typeof data.token === "string" && data.token ? data.token : generateInviteToken();
  const ttlHours = Math.min(Math.max(Number(params.ttlHours) || 72, 1), 168);
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

  await ref.set(
    {
      token,
      used: false,
      status: "pending",
      expiresAt: Timestamp.fromDate(expiresAt),
      acceptedAt: FieldValue.delete(),
      acceptedBy: FieldValue.delete(),
      cancelledAt: FieldValue.delete(),
      revokedBy: FieldValue.delete(),
      declinedAt: FieldValue.delete(),
      declinedBy: FieldValue.delete(),
    },
    { merge: true },
  );

  const companyName = await getCompanyName(params.companyId);
  const joinUrl = buildInviteUrl(
    token,
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  );

  if (isResendConfigured()) {
    const resend = getResend();
    await resend.emails.send({
      from: getSupportFrom(),
      to: email,
      subject: buildInviteEmailSubject(companyName),
      html: buildInviteEmailHtml({
        joinUrl,
        companyName,
        role: normalizeRole(String(data.role ?? "employee")),
        expiresAt,
      }),
    });
  }

  return { joinUrl };
}

async function recordMembershipAdmin(
  userId: string,
  companyId: string,
  role: UserRole,
): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const membershipRef = getAdminFirestore()
    .collection("users")
    .doc(userId)
    .collection("memberships")
    .doc(normalizedCompanyId);

  const existing = await membershipRef.get();
  await membershipRef.set(
    {
      companyId: normalizedCompanyId,
      role,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
}

export async function leaveCompanyAsUser(params: {
  uid: string;
  companyId: string;
}): Promise<{ nextCompanyId: string | null }> {
  const companyId = normalizeCompanyId(params.companyId);
  const db = getAdminFirestore();

  const companySnap = await db.collection(COMPANIES).doc(companyId).get();
  if (!companySnap.exists) throw new OrgError("org_not_found", 404);

  const employeeRef = db.collection(COMPANIES).doc(companyId).collection("employees").doc(params.uid);
  const employeeSnap = await employeeRef.get();
  if (!employeeSnap.exists) throw new OrgError("not_a_member", 404);

  const employee = employeeSnap.data()!;
  const role = String(employee.role ?? "");
  const ownerId = String(companySnap.data()?.ownerId ?? "");

  if (role === "owner" || ownerId === params.uid) {
    const ownersSnap = await db
      .collection(COMPANIES)
      .doc(companyId)
      .collection("employees")
      .where("role", "==", "owner")
      .where("isActive", "==", true)
      .get();
    const otherActiveOwners = ownersSnap.docs.filter((doc) => doc.id !== params.uid);
    if (otherActiveOwners.length === 0) {
      throw new OrgError("sole_owner_cannot_leave", 409);
    }
  }

  await employeeRef.delete();
  await db.collection("users").doc(params.uid).collection("memberships").doc(companyId).delete();

  const userRef = db.collection("users").doc(params.uid);
  const userSnap = await userRef.get();
  const activeCompanyId = String(userSnap.data()?.companyId ?? "").trim();

  let nextCompanyId: string | null = null;
  if (activeCompanyId === companyId) {
    const membershipsSnap = await db
      .collection("users")
      .doc(params.uid)
      .collection("memberships")
      .get();
    nextCompanyId = membershipsSnap.docs[0]?.id ?? null;
    await userRef.set(
      {
        companyId: nextCompanyId ?? "",
        ...(nextCompanyId
          ? {}
          : { role: "employee", permissions: [], isActive: true }),
      },
      { merge: true },
    );
  }

  return { nextCompanyId };
}

export async function deleteCompanyAsOwner(params: {
  uid: string;
  companyId: string;
  confirmationName: string;
}): Promise<void> {
  const companyId = normalizeCompanyId(params.companyId);
  const db = getAdminFirestore();
  const companyRef = db.collection(COMPANIES).doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) throw new OrgError("org_not_found", 404);

  const companyName = String(companySnap.data()?.name ?? "").trim();
  const ownerId = String(companySnap.data()?.ownerId ?? "");
  if (ownerId !== params.uid) throw new OrgError("permission_denied", 403);
  if (companyName !== params.confirmationName.trim()) {
    throw new OrgError("confirmation_mismatch", 400);
  }

  const subcollections = [
    "employees",
    "roles",
    "activityLogs",
    "payrollTransactions",
    "workOrders",
    "clients",
    "vehicles",
    "inventoryItems",
    "warehouses",
    "notificationGroupBuckets",
  ];

  for (const sub of subcollections) {
    const snap = await companyRef.collection(sub).limit(500).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  const invitesSnap = await db.collection(INVITES).where("companyId", "==", companyId).limit(500).get();
  if (!invitesSnap.empty) {
    const batch = db.batch();
    invitesSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  const employeesSnap = await companyRef.collection("employees").get();
  const batch = db.batch();
  for (const employeeDoc of employeesSnap.docs) {
    const uid = employeeDoc.id;
    batch.delete(employeeDoc.ref);
    batch.delete(db.collection("users").doc(uid).collection("memberships").doc(companyId));
    const userRef = db.collection("users").doc(uid);
    batch.set(
      userRef,
      {
        companyId: FieldValue.delete(),
      },
      { merge: true },
    );
  }
  await batch.commit();

  await companyRef.delete();
}

export { buildInviteUrl, generateInviteCode, normalizeRole };
