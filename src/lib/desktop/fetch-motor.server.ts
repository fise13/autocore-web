import "server-only";

import { MotorEntity } from "@/domain/motor";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminMotor } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

export type MotorDocument = {
  motor: MotorEntity;
  raw: Record<string, unknown>;
};

export async function fetchMotorDocumentById(
  companyId: string,
  motorId: string,
): Promise<MotorDocument | null> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const groupSnapshot = await db
    .collectionGroup("motors")
    .where("companyId", "==", normalizedCompanyId)
    .get();

  for (const doc of groupSnapshot.docs) {
    const raw = doc.data() as Record<string, unknown>;
    const motor = mapAdminMotor(doc.id, raw);
    if (!motor) continue;
    if (motor.id === motorId || doc.id === motorId || String(motor.localId) === motorId) {
      return { motor, raw };
    }
  }

  return null;
}

export async function listMotorDocuments(
  companyId: string,
  status?: string,
): Promise<MotorDocument[]> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const groupSnapshot = await db
    .collectionGroup("motors")
    .where("companyId", "==", normalizedCompanyId)
    .get();

  const items: MotorDocument[] = [];
  for (const doc of groupSnapshot.docs) {
    const raw = doc.data() as Record<string, unknown>;
    const motor = mapAdminMotor(doc.id, raw);
    if (!motor) continue;
    if (motor.deletedAt) continue;
    if (status && motor.status !== status) continue;
    items.push({ motor, raw });
  }

  items.sort((a, b) => {
    const aLocal = a.motor.localId ?? 0;
    const bLocal = b.motor.localId ?? 0;
    return bLocal - aLocal;
  });

  return items;
}
