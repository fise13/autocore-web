"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FinancialOperation } from "@/domain/financial-operation";
import { MotorEntity } from "@/domain/motor";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
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
  if (parts.length >= 3 && parts[0].toLowerCase().includes("продаж")) {
    return parts[parts.length - 1];
  }
  return undefined;
}

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

function persistWarrantyId(
  motorId: string,
  warrantyId: string,
  operationId?: string | null,
): void {
  writeMotorWarrantySeed(motorId, warrantyId);
  if (operationId) {
    writeOperationWarrantySeed(operationId, warrantyId);
  }
}

export function useMotorSaleDocuments(
  motor: MotorEntity | null | undefined,
  enabled: boolean,
  options?: UseMotorSaleDocumentsOptions,
): {
  documents: MotorSaleDocumentsPayload | null;
  isLoading: boolean;
  status: MotorSaleDocumentsStatus;
  errorMessage: string | null;
  retry: () => void;
} {
  const operation = options?.operation ?? null;
  const motorId = motor?.id ?? operation?.relatedMotorId ?? null;
  const [warrantyId, setWarrantyId] = useState<string | null>(null);
  const [status, setStatus] = useState<MotorSaleDocumentsStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const requestIdRef = useRef(0);

  const saleComment = operation?.comment ?? operation?.description ?? "Продажа мотора";

  const syncDocuments = useCallback(
    async (requestId: number) => {
      if (!motorId || !motor) {
        setStatus("error");
        setErrorMessage("Не удалось определить двигатель для этой продажи.");
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      const cachedId = await fetchWarrantyIdFromApi(motorId);
      if (requestId !== requestIdRef.current) return;

      if (cachedId) {
        setWarrantyId(cachedId);
        persistWarrantyId(motorId, cachedId, operation?.id);
        setStatus("ready");
        return;
      }

      const result = await enqueueMotorSoldEffects(motor, {
        amount: operation?.amount ?? 0,
        account: operation?.account ?? "cashbox",
        paymentMethod: operation?.paymentMethod ?? "cash",
        comment: saleComment,
        clientId: operation?.relatedClientId ?? undefined,
        clientName: parseClientNameFromComment(saleComment),
      });

      if (requestId !== requestIdRef.current) return;

      if (result.warrantyId) {
        setWarrantyId(result.warrantyId);
        persistWarrantyId(motorId, result.warrantyId, operation?.id);
        setStatus("ready");
        return;
      }

      setStatus("error");
      setErrorMessage(result.error ?? "Не удалось подготовить документы продажи.");
    },
    [motor, motorId, operation?.amount, operation?.account, operation?.id, operation?.paymentMethod, operation?.relatedClientId, saleComment],
  );

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      return;
    }

    if (!motorId) {
      setStatus("error");
      setErrorMessage("Не удалось определить двигатель для этой продажи.");
      return;
    }

    const cached = readCachedWarrantyId(motorId, operation, motor);
    if (cached) {
      setWarrantyId(cached);
      setStatus("ready");
      setErrorMessage(null);
      return;
    }

    if (!motor) {
      setStatus("error");
      setErrorMessage("Двигатель не найден в каталоге. Обновите страницу и попробуйте снова.");
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
    errorMessage,
    retry,
  };
}
