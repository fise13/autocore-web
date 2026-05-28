import { MovementType } from "@/domain/inventory-movement";

export type StockSnapshot = {
  onHand: number;
  reserved: number;
  available: number;
};

export type StockDelta = {
  onHand: number;
  reserved: number;
};

export function computeAvailable(onHand: number, reserved: number): number {
  return onHand - reserved;
}

export function applyMovementToStock(
  current: StockSnapshot,
  type: MovementType,
  quantity: number,
  adjustmentDirection?: "increase" | "decrease",
): { next: StockSnapshot; delta: StockDelta } {
  const qty = Math.abs(quantity);
  let onHand = current.onHand;
  let reserved = current.reserved;

  switch (type) {
    case "receipt":
    case "transfer_in":
    case "return_in":
      onHand += qty;
      break;
    case "issue":
    case "transfer_out":
    case "consumption":
      if (computeAvailable(onHand, reserved) < qty) {
        throw new Error("Недостаточно доступного остатка");
      }
      onHand -= qty;
      if (type === "consumption") {
        reserved = Math.max(0, reserved - qty);
      }
      break;
    case "reservation_hold":
      if (computeAvailable(onHand, reserved) < qty) {
        throw new Error("Недостаточно остатка для резервирования");
      }
      reserved += qty;
      break;
    case "reservation_release":
      reserved = Math.max(0, reserved - qty);
      break;
    case "adjustment": {
      const direction = adjustmentDirection ?? "increase";
      if (direction === "increase") {
        onHand += qty;
      } else {
        if (computeAvailable(onHand, reserved) < qty) {
          throw new Error("Недостаточно остатка для корректировки");
        }
        onHand -= qty;
      }
      break;
    }
    case "reversal":
      throw new Error("reversal должен вычисляться из исходного движения");
    default:
      throw new Error(`Неизвестный тип движения: ${type}`);
  }

  return {
    next: {
      onHand,
      reserved,
      available: computeAvailable(onHand, reserved),
    },
    delta: {
      onHand: onHand - current.onHand,
      reserved: reserved - current.reserved,
    },
  };
}

export function reversalTypeFor(original: MovementType): MovementType {
  switch (original) {
    case "receipt":
      return "issue";
    case "issue":
      return "return_in";
    case "transfer_in":
      return "transfer_out";
    case "transfer_out":
      return "transfer_in";
    case "return_in":
      return "issue";
    case "reservation_hold":
      return "reservation_release";
    case "reservation_release":
      return "reservation_hold";
    case "consumption":
      return "return_in";
    case "adjustment":
      return "adjustment";
    default:
      return "adjustment";
  }
}

export function computeWeightedAverageCost(
  currentOnHand: number,
  currentAverageCost: number,
  incomingQty: number,
  incomingUnitCost: number,
): number {
  if (incomingQty <= 0) return currentAverageCost;
  const totalQty = currentOnHand + incomingQty;
  if (totalQty <= 0) return incomingUnitCost;
  return (currentOnHand * currentAverageCost + incomingQty * incomingUnitCost) / totalQty;
}
