"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { MotorEntity } from "@/domain/motor";
import { useMotorWarrantyRealtime } from "@/hooks/use-motor-warranty-realtime";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import {
  clearMotorWarrantySeed,
  readMotorWarrantySeed,
} from "@/lib/motors/motor-warranty-session";

export type MotorSaleDocumentsPayload = {
  motorId: string;
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  warrantyId: string | null;
};

async function fetchWarrantyIdFromApi(motorId: string): Promise<string | null> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) return null;

  const response = await fetch(`/api/motors/${encodeURIComponent(motorId)}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { warrantyId?: string | null };
  return data.warrantyId ?? null;
}

export function useMotorSaleDocuments(
  motor: MotorEntity | null | undefined,
  enabled: boolean,
): { documents: MotorSaleDocumentsPayload | null; isLoading: boolean } {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? "";
  const motorId = motor?.id ?? null;
  const seedWarrantyId = motorId ? readMotorWarrantySeed(motorId) : null;
  const [polledWarrantyId, setPolledWarrantyId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const { warranty, isLoading: warrantyLoading } = useMotorWarrantyRealtime(
    companyId,
    motorId ?? undefined,
    enabled && Boolean(motorId && companyId),
  );

  const resolvedWarrantyId =
    warranty?.id ?? polledWarrantyId ?? seedWarrantyId ?? motor?.warrantyId ?? null;

  useEffect(() => {
    if (!enabled || !motorId || !companyId || resolvedWarrantyId) {
      return;
    }

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 30;

    async function poll() {
      if (!motorId) return;
      setIsPolling(true);
      while (!cancelled && attempt < maxAttempts) {
        attempt += 1;
        const warrantyId = await fetchWarrantyIdFromApi(motorId);
        if (cancelled) return;
        if (warrantyId) {
          setPolledWarrantyId(warrantyId);
          setIsPolling(false);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      if (!cancelled) {
        setIsPolling(false);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [companyId, enabled, motorId, resolvedWarrantyId]);

  useEffect(() => {
    if (!motorId || !warranty?.id || !seedWarrantyId) return;
    clearMotorWarrantySeed(motorId);
  }, [motorId, seedWarrantyId, warranty?.id]);

  const documents = useMemo<MotorSaleDocumentsPayload | null>(() => {
    if (!motor || !motorId) return null;
    return {
      motorId,
      serialCode: motor.serialCode,
      brandName: motor.brandName,
      engineCode: motor.engineCode,
      warrantyId: resolvedWarrantyId,
    };
  }, [motor, motorId, resolvedWarrantyId]);

  const isLoading =
    enabled &&
    Boolean(motorId && companyId) &&
    !resolvedWarrantyId &&
    (warrantyLoading || isPolling);

  return {
    documents,
    isLoading,
  };
}
