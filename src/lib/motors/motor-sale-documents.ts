import "server-only";

import { processStandaloneMotorSold, fetchWarrantyByMotorId } from "@/infrastructure/firestore/admin/motor-sold-effects-admin";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminMotor } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

async function fetchMotorForCompany(
  companyId: string,
  motorId: string,
  ownerUserId?: string,
) {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);

  if (ownerUserId) {
    const directSnap = await db
      .collection("users")
      .doc(ownerUserId)
      .collection("motors")
      .doc(motorId)
      .get();
    if (directSnap.exists) {
      const motor = mapAdminMotor(directSnap.id, directSnap.data() as Record<string, unknown>);
      if (motor && normalizeCompanyId(motor.companyId) === normalizedCompanyId) {
        return motor;
      }
    }
  }

  const legacySnap = await db.collection("motors").doc(motorId).get();
  if (legacySnap.exists) {
    const motor = mapAdminMotor(legacySnap.id, legacySnap.data() as Record<string, unknown>);
    if (motor && normalizeCompanyId(motor.companyId) === normalizedCompanyId) {
      return motor;
    }
  }

  return null;
}

export async function processMotorSoldEffects(params: Parameters<typeof processStandaloneMotorSold>[0]) {
  return processStandaloneMotorSold(params);
}

export async function getMotorSaleDocuments(
  companyId: string,
  motorId: string,
  ownerUserId: string,
) {
  const [warranty, motor] = await Promise.all([
    fetchWarrantyByMotorId(companyId, motorId),
    fetchMotorForCompany(companyId, motorId, ownerUserId),
  ]);

  if (!motor && !warranty) {
    throw new Error("Engine not found");
  }

  return {
    motorId: motor?.id ?? motorId,
    serialCode: motor?.serialCode ?? "",
    brandName: motor?.brandName,
    engineCode: motor?.engineCode,
    soldDate: motor?.soldDate?.toISOString() ?? null,
    warrantyId: warranty?.id ?? motor?.warrantyId ?? null,
    warrantyStatus: warranty?.status ?? null,
  };
}
