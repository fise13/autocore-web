"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { FinancialOperation } from "@/domain/financial-operation";
import { MotorEntity } from "@/domain/motor";
import { useMotorWarrantyRealtime } from "@/hooks/use-motor-warranty-realtime";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { enqueueMotorSoldEffects } from "@/lib/motors/enqueue-motor-sold-effects";
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

export type MotorSaleDocumentsStatus = "loading" | "forming" | "ready" | "failed" | "unavailable";

type UseMotorSaleDocumentsOptions = {
  operation?: FinancialOperation | null;
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

function parseClientNameFromComment(comment?: string | null): string | undefined {
  if (!comment?.trim()) return undefined;
  const parts = comment.split("·").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 ? parts[parts.length - 1] : undefined;
}

export function useMotorSaleDocuments(
  motor: MotorEntity | null | undefined,
  enabled: boolean,
  options?: UseMotorSaleDocumentsOptions,
): {
  documents: MotorSaleDocumentsPayload | null;
  isLoading: boolean;
  status: MotorSaleDocumentsStatus;
  retry: () => void;
} {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? "";
  const operation = options?.operation ?? null;
  const motorId = motor?.id ?? operation?.relatedMotorId ?? null;
  const seedWarrantyId = motorId ? readMotorWarrantySeed(motorId) : null;
  const [polledWarrantyId, setPolledWarrantyId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [ensureFailed, setEnsureFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const ensureAttemptedRef = useRef(false);

  const { warranty, isLoading: warrantyLoading } = useMotorWarrantyRealtime(
    companyId,
    motorId ?? undefined,
    enabled && Boolean(motorId && companyId),
  );

  const resolvedWarrantyId =
    warranty?.id ?? polledWarrantyId ?? seedWarrantyId ?? motor?.warrantyId ?? null;

  const ensureDocuments = useCallback(async () => {
    if (!motor || !motorId || ensureAttemptedRef.current) return null;
    ensureAttemptedRef.current = true;
    setIsEnsuring(true);
    setEnsureFailed(false);

    try {
      const result = await enqueueMotorSoldEffects(motor, {
        amount: operation?.amount ?? 0,
        account: operation?.account ?? "cashbox",
        paymentMethod: operation?.paymentMethod ?? "cash",
        comment: operation?.comment ?? operation?.description ?? "Продажа мотора",
        clientName: parseClientNameFromComment(operation?.comment ?? operation?.description),
      });
      if (result.warrantyId) {
        return result.warrantyId;
      }
      if (!result.ok || result.warrantyId == null) {
        setEnsureFailed(true);
      }
      return null;
    } finally {
      setIsEnsuring(false);
    }
  }, [motor, motorId, operation]);

  useEffect(() => {
    if (!enabled || !motorId || !companyId || resolvedWarrantyId) {
      return;
    }

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 20;

    async function poll() {
      if (!motorId) return;
      setIsPolling(true);
      setEnsureFailed(false);

      while (!cancelled && attempt < maxAttempts) {
        attempt += 1;
        const warrantyId = await fetchWarrantyIdFromApi(motorId);
        if (cancelled) return;
        if (warrantyId) {
          setPolledWarrantyId(warrantyId);
          setIsPolling(false);
          return;
        }

        if (attempt === 3 && motor) {
          const ensuredId = await ensureDocuments();
          if (cancelled) return;
          if (ensuredId) {
            setPolledWarrantyId(ensuredId);
            setIsPolling(false);
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      if (!cancelled) {
        if (motor) {
          const ensuredId = await ensureDocuments();
          if (!cancelled && ensuredId) {
            setPolledWarrantyId(ensuredId);
          } else if (!cancelled && !ensuredId) {
            setEnsureFailed(true);
          }
        } else {
          setEnsureFailed(true);
        }
        setIsPolling(false);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [companyId, enabled, ensureDocuments, motor, motorId, resolvedWarrantyId, retryNonce]);

  useEffect(() => {
    if (!motorId || !warranty?.id || !seedWarrantyId) return;
    clearMotorWarrantySeed(motorId);
  }, [motorId, seedWarrantyId, warranty?.id]);

  useEffect(() => {
    if (!enabled) {
      ensureAttemptedRef.current = false;
      setEnsureFailed(false);
      setPolledWarrantyId(null);
      setIsPolling(false);
      setIsEnsuring(false);
    }
  }, [enabled, motorId]);

  const documents = useMemo<MotorSaleDocumentsPayload | null>(() => {
    if (!motorId) return null;
    return {
      motorId,
      serialCode: motor?.serialCode ?? operation?.description?.split(" ").pop() ?? "",
      brandName: motor?.brandName,
      engineCode: motor?.engineCode,
      warrantyId: resolvedWarrantyId,
    };
  }, [motor, motorId, operation?.description, resolvedWarrantyId]);

  const isAwaitingWarranty =
    enabled && Boolean(motorId && companyId) && !resolvedWarrantyId;

  const status: MotorSaleDocumentsStatus = resolvedWarrantyId
    ? "ready"
    : !motorId
      ? "unavailable"
      : ensureFailed && !isPolling && !isEnsuring && !warrantyLoading
        ? "failed"
        : isAwaitingWarranty && (warrantyLoading || isPolling || isEnsuring)
          ? "loading"
          : isAwaitingWarranty
            ? "forming"
            : "unavailable";

  const isLoading = status === "loading";

  const retry = useCallback(() => {
    ensureAttemptedRef.current = false;
    setEnsureFailed(false);
    setPolledWarrantyId(null);
    setRetryNonce((value) => value + 1);
  }, []);

  return {
    documents,
    isLoading,
    status,
    retry,
  };
}
