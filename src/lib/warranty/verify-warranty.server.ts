import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { EngineWarranty } from "@/domain/warranty";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { adminToDate } from "@/infrastructure/firestore/admin-mappers";

export async function findWarrantyByToken(verificationToken: string): Promise<EngineWarranty | null> {
  const db = getAdminFirestore();
  const snap = await db.collectionGroup("warranties").where("verificationToken", "==", verificationToken).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0]!;
  const data = doc.data();
  return {
    id: doc.id,
    companyId: String(data.companyId ?? ""),
    motorId: String(data.motorId ?? ""),
    vehicleId: typeof data.vehicleId === "string" ? data.vehicleId : undefined,
    workOrderId: typeof data.workOrderId === "string" ? data.workOrderId : undefined,
    clientId: typeof data.clientId === "string" ? data.clientId : undefined,
    serialCode: String(data.serialCode ?? ""),
    engineCode: typeof data.engineCode === "string" ? data.engineCode : undefined,
    vin: typeof data.vin === "string" ? data.vin : undefined,
    licensePlate: typeof data.licensePlate === "string" ? data.licensePlate : undefined,
    installedAt: data.installedAt instanceof Timestamp ? data.installedAt.toDate() : new Date(),
    soldAt: data.soldAt instanceof Timestamp ? data.soldAt.toDate() : undefined,
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(),
    expiresAtMileage: Number(data.expiresAtMileage ?? 0),
    termsText: typeof data.termsText === "string" ? data.termsText : undefined,
    restrictionsText: typeof data.restrictionsText === "string" ? data.restrictionsText : undefined,
    verificationToken: String(data.verificationToken ?? verificationToken),
    status: (data.status as EngineWarranty["status"]) ?? "active",
    pdfStoragePath: typeof data.pdfStoragePath === "string" ? data.pdfStoragePath : undefined,
    downloadUrl: typeof data.downloadUrl === "string" ? data.downloadUrl : undefined,
    createdAt: adminToDate(data.createdAt) ?? new Date(),
  };
}

export async function findCompanyName(companyId: string): Promise<string> {
  const db = getAdminFirestore();
  const snap = await db.collection("companies").doc(companyId).get();
  if (!snap.exists) return "";
  const data = snap.data()!;
  return String(data.legalName ?? data.name ?? "");
}
