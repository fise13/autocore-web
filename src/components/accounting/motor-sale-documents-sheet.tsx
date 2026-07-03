"use client";

import { useMemo } from "react";
import { FileStack } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { MotorSaleDocumentsPanel } from "@/components/motors/motor-sale-documents-panel";
import { FinancialOperation } from "@/domain/financial-operation";
import { MotorEntity } from "@/domain/motor";
import { useMotorSaleDocuments } from "@/hooks/use-motor-sale-documents";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import { operationCategoryLabel } from "@/lib/accounting/labels";

type MotorSaleDocumentsSheetProps = {
  operation: FinancialOperation | null;
  motors: MotorEntity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function resolveMotor(operation: FinancialOperation | null, motors: MotorEntity[]): MotorEntity | null {
  if (!operation) return null;
  if (operation.relatedMotorId) {
    return motors.find((item) => item.id === operation.relatedMotorId) ?? null;
  }
  if (operation.relatedMotorID == null) return null;
  return (
    motors.find(
      (item) => item.localId === operation.relatedMotorID || item.id === String(operation.relatedMotorID),
    ) ?? null
  );
}

function buildMotorContext(
  operation: FinancialOperation | null,
  motors: MotorEntity[],
  companyId: string,
): MotorEntity | null {
  const resolved = resolveMotor(operation, motors);
  if (resolved) return resolved;
  if (!operation?.relatedMotorId) return null;

  return {
    id: operation.relatedMotorId,
    companyId,
    serialCode: operation.description ?? operation.relatedMotorId,
    configuration: "",
    notes: "",
    quantity: 1,
    transmission: "",
    arrivalDate: null,
    soldDate: operation.createdAt,
  };
}

export function MotorSaleDocumentsSheet({
  operation,
  motors,
  open,
  onOpenChange,
}: MotorSaleDocumentsSheetProps) {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? "";
  const motor = useMemo(
    () => buildMotorContext(operation, motors, companyId),
    [companyId, operation, motors],
  );
  const { documents, isLoading, status, retry } = useMotorSaleDocuments(motor, open, { operation });

  const motorLabel = documents
    ? [documents.brandName, documents.engineCode, documents.serialCode].filter(Boolean).join(" · ")
    : operation?.description ?? operation?.comment ?? "Продажа двигателя";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary">
              <FileStack className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle>Документы продажи</DialogTitle>
              <DialogDescription>
                {operation
                  ? operationCategoryLabel(operation.category ?? MOTOR_SALE_CATEGORY)
                  : "Гарантийный талон и счёт на двигатель"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          <MotorSaleDocumentsPanel
            documents={documents}
            isLoading={isLoading}
            status={status}
            onRetry={retry}
            motorLabel={motorLabel}
            serialCode={documents?.serialCode ?? motor?.serialCode}
            amount={operation?.amount}
            saleDate={operation?.createdAt}
            motorMissing={Boolean(operation && !operation.relatedMotorId && !motor)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
