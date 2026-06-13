"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, query as firestoreQuery, where } from "firebase/firestore";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const active = Boolean(companyId && motorId && enabled);
  const queryKey = useMemo(
    () => ["motor-warranty", companyId, motorId] as const,
    [companyId, motorId],
  );
  const activeKey = queryKey.join("|");
  const [snapshotKey, setSnapshotKey] = useState<string | null>(null);

  const warrantyQuery = useQuery<EngineWarranty | null>({
    queryKey,
    queryFn: async () => null,
    enabled: active,
    initialData: null,
  });

  useEffect(() => {
    if (!active || !motorId) return;

    const q = firestoreQuery(
      collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), "warranties"),
      where("motorId", "==", motorId),
      limit(1),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const doc = snapshot.docs[0];
        const warranty = doc ? mapWarranty(doc.id, doc.data() as Record<string, unknown>) : null;
        setSnapshotKey(activeKey);
        queryClient.setQueryData(queryKey, warranty);
      },
      () => setSnapshotKey(activeKey),
    );
  }, [active, activeKey, companyId, motorId, queryClient, queryKey]);

  return {
    warranty: active ? warrantyQuery.data ?? null : null,
    isLoading: active ? snapshotKey !== activeKey : false,
  };
}
