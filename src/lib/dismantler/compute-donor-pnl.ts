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
  motorCount: number;
  soldMotorCount: number;
  remainingMotorCount: number;
  /**
   * Sold motors with no readable sale operation behind them, so their revenue
   * could not be established. The UI can warn instead of silently showing a
   * payback that is missing money.
   */
  unvaluedSoldMotorCount: number;
  /** Where `soldRevenue` came from. Kept split so the number stays auditable. */
  revenue: {
    fromParts: number;
    fromMotors: number;
    /** Whole-car or scrap sales booked against the donor itself. */
    fromDonorSales: number;
  };
};

function isSoldMotor(motor: MotorEntity): boolean {
  return motor.status === "sold" || Boolean(motor.soldDate);
}

/**
 * Net cash an operation set moved: sales and other income add, refunds subtract.
 * Everything else (expenses, transfers) is not donor revenue and is ignored.
 */
function netRevenue(operations: FinancialOperation[]): number {
  return operations.reduce((sum, operation) => {
    if (operation.type === "sale" || operation.type === "income") return sum + operation.amount;
    if (operation.type === "refund") return sum - operation.amount;
    return sum;
  }, 0);
}

/**
 * Payback for one donor car.
 *
 * Revenue is attributed per item — each part and each motor is valued once,
 * from the accounting rows that reference it, falling back to the item's own
 * recorded amount when those rows are not available (a viewer without
 * accounting access reads no operations at all). Operations booked straight
 * against the donor with no item of this donor attached are added on top as a
 * whole-car sale. Nothing is counted twice, and a refund cancels the sale it
 * reverses.
 *
 * `remainingValue` covers unsold parts only: motors carry no asking price in
 * the model, so they are counted (`remainingMotorCount`) but never valued.
 */
export function computeDonorPnl(input: {
  donor: DonorVehicle;
  parts: UsedPart[];
  motors?: MotorEntity[];
  operations?: FinancialOperation[];
}): DonorPnl {
  const parts = input.parts.filter((part) => part.donorId === input.donor.id);
  const motors = (input.motors ?? []).filter(
    (motor) => motor.donorId === input.donor.id && !motor.deletedAt,
  );
  const partIds = new Set(parts.map((part) => part.id));
  const motorIds = new Set(motors.map((motor) => motor.id));
  const operations = input.operations ?? [];

  const soldParts = parts.filter((part) => part.status === "sold");
  const revenueFromParts = parts.reduce((sum, part) => {
    const partOperations = operations.filter((operation) => operation.relatedUsedPartId === part.id);
    if (partOperations.length > 0) return sum + netRevenue(partOperations);
    // No accounting rows in reach — trust what the part itself recorded.
    if (part.status !== "sold") return sum;
    return sum + (part.soldAmount ?? part.sellPrice ?? 0);
  }, 0);

  const soldMotors = motors.filter(isSoldMotor);
  let unvaluedSoldMotorCount = 0;
  const revenueFromMotors = motors.reduce((sum, motor) => {
    const motorOperations = operations.filter((operation) => operation.relatedMotorId === motor.id);
    if (motorOperations.length > 0) return sum + netRevenue(motorOperations);
    // A motor has no price of its own, so an unmatched sale stays unvalued.
    if (isSoldMotor(motor)) unvaluedSoldMotorCount += 1;
    return sum;
  }, 0);

  const revenueFromDonorSales = netRevenue(
    operations.filter((operation) => {
      if (operation.relatedDonorId !== input.donor.id) return false;
      // Already attributed above — skip so the same money is not counted twice.
      if (operation.relatedUsedPartId && partIds.has(operation.relatedUsedPartId)) return false;
      if (operation.relatedMotorId && motorIds.has(operation.relatedMotorId)) return false;
      return true;
    }),
  );

  const soldRevenue = revenueFromParts + revenueFromMotors + revenueFromDonorSales;

  const remainingParts = parts.filter(
    (part) => part.status === "available" || part.status === "reserved",
  );
  const remainingValue = remainingParts.reduce((sum, part) => sum + (part.sellPrice ?? 0), 0);

  const purchasePrice = input.donor.purchasePrice || 0;

  return {
    donorId: input.donor.id,
    purchasePrice,
    soldRevenue,
    remainingValue,
    grossSoFar: soldRevenue - purchasePrice,
    expectedIfRemainingSells: soldRevenue + remainingValue - purchasePrice,
    partCount: parts.length,
    soldPartCount: soldParts.length,
    availablePartCount: parts.filter((part) => part.status === "available").length,
    motorCount: motors.length,
    soldMotorCount: soldMotors.length,
    remainingMotorCount: motors.length - soldMotors.length,
    unvaluedSoldMotorCount,
    revenue: {
      fromParts: revenueFromParts,
      fromMotors: revenueFromMotors,
      fromDonorSales: revenueFromDonorSales,
    },
  };
}
