import type { DonorVehicle } from "@/domain/donor";
import type { FinancialOperation } from "@/domain/financial-operation";
import type { MotorEntity } from "@/domain/motor";
import type { UsedPart } from "@/domain/used-part";

export type DonorPnl = {
  donorId: string;
  purchasePrice: number;
  soldRevenue: number;
  remainingValue: number;
  grossSoFar: number;
  expectedIfRemainingSells: number;
  partCount: number;
  soldPartCount: number;
  availablePartCount: number;
};

export function computeDonorPnl(input: {
  donor: DonorVehicle;
  parts: UsedPart[];
  motors?: MotorEntity[];
  operations?: FinancialOperation[];
}): DonorPnl {
  const parts = input.parts.filter((part) => part.donorId === input.donor.id);
  const motors = (input.motors ?? []).filter((motor) => motor.donorId === input.donor.id);
  const motorIds = new Set(motors.map((motor) => motor.id));

  const soldFromParts = parts
    .filter((part) => part.status === "sold")
    .reduce((sum, part) => sum + (part.soldAmount ?? part.sellPrice ?? 0), 0);

  const soldFromMotors = motors
    .filter((motor) => motor.status === "sold" || motor.soldDate)
    .reduce((sum, motor) => {
      const match = (input.operations ?? []).find(
        (op) => op.type === "sale" && op.relatedMotorId === motor.id,
      );
      return sum + (match?.amount ?? 0);
    }, 0);

  const soldFromOps = (input.operations ?? [])
    .filter((op) => op.type === "sale" && op.relatedDonorId === input.donor.id)
    .reduce((sum, op) => sum + op.amount, 0);

  const soldRevenue = Math.max(soldFromParts + soldFromMotors, soldFromOps);

  const remainingValue =
    parts
      .filter((part) => part.status === "available" || part.status === "reserved")
      .reduce((sum, part) => sum + (part.sellPrice ?? 0), 0) +
    motors
      .filter((motor) => motor.status === "available" || !motor.status)
      .filter((motor) => !motor.soldDate)
      .reduce((sum, motor) => {
        const match = (input.operations ?? []).find(
          (op) => op.relatedMotorId === motor.id && motorIds.has(motor.id),
        );
        return sum + (match ? 0 : 0);
      }, 0);

  const purchasePrice = input.donor.purchasePrice || 0;
  const grossSoFar = soldRevenue - purchasePrice;
  const expectedIfRemainingSells = soldRevenue + remainingValue - purchasePrice;

  return {
    donorId: input.donor.id,
    purchasePrice,
    soldRevenue,
    remainingValue,
    grossSoFar,
    expectedIfRemainingSells,
    partCount: parts.length,
    soldPartCount: parts.filter((part) => part.status === "sold").length,
    availablePartCount: parts.filter((part) => part.status === "available").length,
  };
}
