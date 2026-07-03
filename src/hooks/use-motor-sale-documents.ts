"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FinancialOperation } from "@/domain/financial-operation";
import { MotorEntity } from "@/domain/motor";
import { enqueueMotorSoldEffects } from "@/lib/motors/enqueue-motor-sold-effects";
import {
  readMotorWarrantySeed,
  readOperationWarrantySeed,
  writeMotorWarrantySeed,
  writeOperationWarrantySeed,
} from "@/lib/motors/motor-warranty-session";

export type MotorSaleDocumentsPayload = {
  motorId: string;
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  warrantyId: string | null;
};

export type MotorSaleDocumentsStatus = "ready" | "loading" | "error";

type UseMotorSaleDocumentsOptions = {
  operation?: FinancialOperation | null;
};

function parseClientNameFromComment(comment?: string | null): string | undefined {
  if (!comment?.trim()) return undefined;
  const parts = comment.split("·").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 ? parts[parts.length - 1] : undefined;
}

function readCachedWarrantyId(
  motorId: string | null,
  operation: FinancialOperation | null,
  motor?: MotorEntity | null,
): string | null {
  if (!motorId) return null;
  return (
    operation?.relatedWarrantyId ??
    (operation?.id ? readOperationWarrantySeed(operation.id) : null) ??
    readMotorWarrantySeed(motorId) ??
    motor?.warrantyId ??
    null
  );
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
  const operation = options?.operation ?? null;
  const motorId = motor?.id ?? operation?.relatedMotorId ?? null;
  const [warrantyId, setWarrantyId] = useState<string | null>(() =>
    enabled ? readCachedWarrantyId(motorId, operation, motor) : null,
  );
  const [status, setStatus] = useState<MotorSaleDocumentsStatus>(() =>
    readCachedWarrantyId(motorId, operation, motor) ? "ready" : "loading",
  );
  const [retryNonce, setRetryNonce] = useState(0);
  const requestIdRef = useRef(0);

  const syncDocuments = useCallback(
    async (requestId: number) => {
      if (!motorId || !motor) {
        setStatus("error");
        return;
      }

      setStatus("loading");

      const result = await enqueueMotorSoldEffects(motor, {
        amount: operation?.amount ?? 0,
        account: operation?.account ?? "cashbox",
        paymentMethod: operation?.paymentMethod ?? "cash",
        comment: operation?.comment ?? operation?.description ?? "Продажа мотора",
        clientId: operation?.relatedClientId ?? undefined,
        clientName: parseClientNameFromComment(operation?.comment ?? operation?.description),
      });

      if (requestId !== requestIdRef.current) return;

      if (result.warrantyId) {
        setWarrantyId(result.warrantyId);
        writeMotorWarrantySeed(motorId, result.warrantyId);
        if (operation?.id) {
          writeOperationWarrantySeed(operation.id, result.warrantyId);
        }
        setStatus("ready");
        return;
      }

      setStatus(result.ok ? "error" : "error");
    },
    [motor, motorId, operation],
  );

  useEffect(() => {
    if (!enabled) {
      setWarrantyId(null);
      setStatus("loading");
      requestIdRef.current += 1;
      return;
    }

    if (!motorId) {
      setStatus("error");
      return;
    }

    const cached = readCachedWarrantyId(motorId, operation, motor);
    if (cached) {
      setWarrantyId(cached);
      setStatus("ready");
      return;
    }

    if (!motor) {
      setStatus("error");
      return;
    }

    const requestId = ++requestIdRef.current;
    void syncDocuments(requestId);
  }, [enabled, motor, motorId, operation, retryNonce, syncDocuments]);

  const documents = useMemo<MotorSaleDocumentsPayload | null>(() => {
    if (!motorId) return null;
    return {
      motorId,
      serialCode: motor?.serialCode ?? operation?.description?.split(" ").pop() ?? "",
      brandName: motor?.brandName,
      engineCode: motor?.engineCode,
      warrantyId,
    };
  }, [motor, motorId, operation?.description, warrantyId]);

  const retry = useCallback(() => {
    setRetryNonce((value) => value + 1);
  }, []);

  return {
    documents,
    isLoading: status === "loading",
    status,
    retry,
  };
}
