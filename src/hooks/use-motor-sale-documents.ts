"use client";

import { useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { MotorEntity } from "@/domain/motor";
import { useMotorWarrantyRealtime } from "@/hooks/use-motor-warranty-realtime";

export type MotorSaleDocumentsPayload = {
  motorId: string;
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  warrantyId: string | null;
};

export function useMotorSaleDocuments(
  motor: MotorEntity | null | undefined,
  enabled: boolean,
): { documents: MotorSaleDocumentsPayload | null; isLoading: boolean } {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? "";
  const motorId = motor?.id ?? null;

  const { warranty, isLoading: warrantyLoading } = useMotorWarrantyRealtime(
    companyId,
    motorId ?? undefined,
    enabled && Boolean(motorId && companyId),
  );

  const documents = useMemo<MotorSaleDocumentsPayload | null>(() => {
    if (!motor || !motorId) return null;
    return {
      motorId,
      serialCode: motor.serialCode,
      brandName: motor.brandName,
      engineCode: motor.engineCode,
      warrantyId: warranty?.id ?? motor.warrantyId ?? null,
    };
  }, [motor, motorId, warranty?.id, motor?.warrantyId]);

  return {
    documents,
    isLoading: enabled && Boolean(motorId && companyId) && warrantyLoading,
  };
}
