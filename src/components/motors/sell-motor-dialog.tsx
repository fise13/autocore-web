"use client";

import { MotorEntity } from "@/domain/motor";
import { OperationAccount, PaymentMethod } from "@/domain/financial-operation";
import { SellFinancialDialog } from "@/components/accounting/sell-financial-dialog";

type SellMotorDialogProps = {
  motor: MotorEntity | null;
  mode: "sell" | "unsell";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    amount: number;
    account: OperationAccount;
    paymentMethod: PaymentMethod;
    comment: string;
  }) => Promise<void>;
};

export function SellMotorDialog({
  motor,
  mode,
  open,
  onOpenChange,
  onConfirm,
}: SellMotorDialogProps) {
  if (!motor) {
    return (
      <SellFinancialDialog
        open={open}
        mode={mode}
        title="Продажа мотора"
        description="Выберите мотор для операции."
        defaultComment=""
        onOpenChange={onOpenChange}
        onConfirm={async () => {}}
      />
    );
  }

  return (
    <SellFinancialDialog
      open={open}
      mode={mode}
      title={mode === "sell" ? "Продажа мотора" : "Возврат мотора"}
      description={`Мотор ${motor.serialCode}. Будет создана финансовая операция.`}
      defaultComment={
        mode === "sell" ? `Продажа мотора ${motor.serialCode}` : `Возврат мотора ${motor.serialCode}`
      }
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
