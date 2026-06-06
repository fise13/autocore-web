"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";

import { EngineWarranty } from "@/domain/warranty";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";

function mapWarranty(id: string, data: Record<string, unknown>): EngineWarranty {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    motorId: String(data.motorId ?? ""),
    vehicleId: typeof data.vehicleId === "string" ? data.vehicleId : undefined,
    workOrderId: typeof data.workOrderId === "string" ? data.workOrderId : undefined,
    clientId: typeof data.clientId === "string" ? data.clientId : undefined,
    serialCode: String(data.serialCode ?? ""),
    engineCode: typeof data.engineCode === "string" ? data.engineCode : undefined,
    vin: typeof data.vin === "string" ? data.vin : undefined,
    licensePlate: typeof data.licensePlate === "string" ? data.licensePlate : undefined,
    installedAt: toDateFromFirestore(data.installedAt) ?? new Date(),
    soldAt: toDateFromFirestore(data.soldAt) ?? undefined,
    expiresAt: toDateFromFirestore(data.expiresAt) ?? new Date(),
    expiresAtMileage: Number(data.expiresAtMileage ?? 0),
    termsText: typeof data.termsText === "string" ? data.termsText : undefined,
    restrictionsText: typeof data.restrictionsText === "string" ? data.restrictionsText : undefined,
    verificationToken: String(data.verificationToken ?? ""),
    status: (data.status as EngineWarranty["status"]) ?? "active",
    pdfStoragePath: typeof data.pdfStoragePath === "string" ? data.pdfStoragePath : undefined,
    downloadUrl: typeof data.downloadUrl === "string" ? data.downloadUrl : undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
  };
}

export function useMotorWarrantyRealtime(companyId: string, motorId: string | undefined, enabled = true) {
  const [warranty, setWarranty] = useState<EngineWarranty | null>(null);
  const [isLoading, setIsLoading] = useState(enabled && Boolean(motorId));

  useEffect(() => {
    if (!companyId || !motorId || !enabled) {
      setWarranty(null);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), "warranties"),
      where("motorId", "==", motorId),
      limit(1),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const doc = snapshot.docs[0];
        setWarranty(doc ? mapWarranty(doc.id, doc.data() as Record<string, unknown>) : null);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [companyId, motorId, enabled]);

  return { warranty, isLoading };
}
