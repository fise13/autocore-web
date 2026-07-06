import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { UserRole } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  emitMemberAccessSuspendedNotification,
  emitMemberRemovedFromCompanyNotification,
} from "@/lib/notifications/team-events.server";
import { OrgError } from "@autocore/org";

const COMPANIES = "companies";

async function getCompanyName(companyId: string): Promise<string> {
  const snap = await getAdminFirestore().collection(COMPANIES).doc(companyId).get();
  return String(snap.data()?.name ?? "компании").trim() || "компании";
}

async function appendEmployeeActivityLog(
  companyId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await getAdminFirestore()
      .collection(COMPANIES)
      .doc(companyId)
      .collection("activityLogs")
      .add({
        companyId,
        module: "employees",
        severity: "info",
        timestamp: FieldValue.serverTimestamp(),
        ...payload,
      });
  } catch {
    // Best-effort logging.
  }
}

async function switchUserActiveCompany(
  userId: string,
  removedCompanyId: string,
): Promise<string | null> {
  const db = getAdminFirestore();
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  const activeCompanyId = normalizeCompanyId(String(userSnap.data()?.companyId ?? ""));

  if (activeCompanyId !== removedCompanyId) {
    return activeCompanyId || null;
  }

  const membershipsSnap = await userRef.collection("memberships").get();
  const nextCompanyId = membershipsSnap.docs[0]?.id ?? null;

  await userRef.set(
    {
      companyId: nextCompanyId ?? "",
      isActive: true,
      ...(nextCompanyId
        ? {}
        : { role: "employee", permissions: [] }),
    },
    { merge: true },
  );

  return nextCompanyId;
}

export async function removeMemberFromCompanyAsAdmin(params: {
  actorUserId: string;
  companyId: string;
  targetUserId: string;
}): Promise<{ nextCompanyId: string | null }> {
  const companyId = normalizeCompanyId(params.companyId);
  const targetUserId = params.targetUserId.trim();
  if (!companyId || !targetUserId) {
    throw new OrgError("permission_denied", 400);
  }
  if (targetUserId === params.actorUserId) {
    throw new OrgError("permission_denied", 403);
  }

  const db = getAdminFirestore();
  const companyRef = db.collection(COMPANIES).doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) throw new OrgError("org_not_found", 404);

  const ownerId = String(companySnap.data()?.ownerId ?? "");
  const employeeRef = companyRef.collection("employees").doc(targetUserId);
  const employeeSnap = await employeeRef.get();
  if (!employeeSnap.exists) throw new OrgError("not_a_member", 404);

  const employeeRole = String(employeeSnap.data()?.role ?? "");
  if (employeeRole === "owner" || ownerId === targetUserId) {
    const ownersSnap = await companyRef
      .collection("employees")
      .where("role", "==", "owner")
      .where("isActive", "==", true)
      .get();
    const otherOwners = ownersSnap.docs.filter((doc) => doc.id !== targetUserId);
    if (otherOwners.length === 0) {
      throw new OrgError("sole_owner_cannot_leave", 409);
    }
  }

  const companyName = String(companySnap.data()?.name ?? "компании").trim() || "компании";
  const targetName = String(employeeSnap.data()?.fullName ?? employeeSnap.data()?.email ?? "Сотрудник");

  await employeeRef.delete();
  await db.collection("users").doc(targetUserId).collection("memberships").doc(companyId).delete();

  const nextCompanyId = await switchUserActiveCompany(targetUserId, companyId);

  await appendEmployeeActivityLog(companyId, {
    action: "employee.removed",
    actor: params.actorUserId,
    target: `employee:${targetUserId}`,
    targetId: targetUserId,
    targetName,
  });

  await emitMemberRemovedFromCompanyNotification({
    companyId,
    companyName,
    targetUserId,
    actorUserId: params.actorUserId,
  });

  return { nextCompanyId };
}

export async function setMemberActiveAsAdmin(params: {
  actorUserId: string;
  companyId: string;
  targetUserId: string;
  isActive: boolean;
}): Promise<void> {
  const companyId = normalizeCompanyId(params.companyId);
  const targetUserId = params.targetUserId.trim();
  if (!companyId || !targetUserId) {
    throw new OrgError("permission_denied", 400);
  }
  if (targetUserId === params.actorUserId) {
    throw new OrgError("permission_denied", 403);
  }

  const db = getAdminFirestore();
  const employeeRef = db.collection(COMPANIES).doc(companyId).collection("employees").doc(targetUserId);
  const employeeSnap = await employeeRef.get();
  if (!employeeSnap.exists) throw new OrgError("not_a_member", 404);

  const companyName = await getCompanyName(companyId);
  const targetName = String(employeeSnap.data()?.fullName ?? employeeSnap.data()?.email ?? "Сотрудник");

  await employeeRef.set(
    {
      isActive: params.isActive,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const userRef = db.collection("users").doc(targetUserId);
  const userSnap = await userRef.get();
  const activeCompanyId = normalizeCompanyId(String(userSnap.data()?.companyId ?? ""));
  if (activeCompanyId === companyId) {
    await userRef.set({ isActive: params.isActive }, { merge: true });
  }

  await appendEmployeeActivityLog(companyId, {
    action: params.isActive ? "employee.activated" : "employee.deactivated",
    actor: params.actorUserId,
    target: `employee:${targetUserId}`,
    targetId: targetUserId,
    targetName,
    severity: params.isActive ? "info" : "warning",
  });

  if (!params.isActive) {
    await emitMemberAccessSuspendedNotification({
      companyId,
      companyName,
      targetUserId,
      actorUserId: params.actorUserId,
    });
  }
}
