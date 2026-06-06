import "server-only";

import { processStandaloneMotorSold, fetchWarrantyByMotorId } from "@/infrastructure/firestore/admin/motor-sold-effects-admin";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminMotor } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

async function fetchMotorById(companyId: string, motorId: string) {
  const db = getAdminFirestore();
  const groupSnapshot = await db.collectionGroup("motors").where("companyId", "==", normalizeCompanyId(companyId)).get();
  for (const doc of groupSnapshot.docs) {
    const motor = mapAdminMotor(doc.id, doc.data() as Record<string, unknown>);
    if (!motor) continue;
    if (motor.id === motorId || doc.id === motorId || String(motor.localId) === motorId) {
      return motor;
    }
  }
  return null;
}

export async function processMotorSoldEffects(params: Parameters<typeof processStandaloneMotorSold>[0]) {
  return processStandaloneMotorSold(params);
}

export async function getMotorSaleDocuments(companyId: string, motorId: string) {
  const motor = await fetchMotorById(companyId, motorId);
  if (!motor) {
    throw new Error("Мотор не найден");
  }

  const warranty = await fetchWarrantyByMotorId(companyId, motor.id);
  return {
    motorId: motor.id,
    serialCode: motor.serialCode,
    brandName: motor.brandName,
    engineCode: motor.engineCode,
    soldDate: motor.soldDate?.toISOString() ?? null,
    warrantyId: warranty?.id ?? motor.warrantyId ?? null,
    warrantyStatus: warranty?.status ?? null,
  };
}
