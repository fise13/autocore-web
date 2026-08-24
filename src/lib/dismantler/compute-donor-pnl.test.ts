import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DonorVehicle } from "@/domain/donor";
import type { UsedPart } from "@/domain/used-part";
import { computeDonorPnl } from "@/lib/dismantler/compute-donor-pnl";

const donor: DonorVehicle = {
  id: "d1",
  companyId: "c1",
  vin: "JT123",
  make: "Toyota",
  model: "Camry",
  year: 2014,
  purchasePrice: 400_000,
  currency: "KZT",
  status: "in_progress",
  photoUrls: [],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdByUserId: "u1",
};

function part(partial: Partial<UsedPart> & Pick<UsedPart, "id" | "status" | "sellPrice">): UsedPart {
  return {
    companyId: "c1",
    donorId: "d1",
    name: "Door",
    currency: "KZT",
    photoUrls: [],
    applicability: "Toyota Camry 2014",
    listedOnAvito: false,
    listedOnDrom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByUserId: "u1",
    ...partial,
  };
}

describe("computeDonorPnl", () => {
  it("nets sold parts against purchase price and values remaining stock", () => {
    const pnl = computeDonorPnl({
      donor,
      parts: [
        part({ id: "p1", status: "sold", sellPrice: 120_000, soldAmount: 120_000 }),
        part({ id: "p2", status: "available", sellPrice: 80_000 }),
      ],
    });
    assert.equal(pnl.soldRevenue, 120_000);
    assert.equal(pnl.remainingValue, 80_000);
    assert.equal(pnl.grossSoFar, -280_000);
    assert.equal(pnl.expectedIfRemainingSells, -200_000);
    assert.equal(pnl.soldPartCount, 1);
  });

  it("adds sold engine revenue when the sale is tied to the motor", () => {
    const pnl = computeDonorPnl({
      donor,
      parts: [],
      motors: [
        {
          id: "m1",
          companyId: "c1",
          serialCode: "S1",
          configuration: "",
          notes: "",
          quantity: 1,
          transmission: "",
          arrivalDate: null,
          status: "sold",
          soldDate: new Date("2026-02-01"),
          donorId: "d1",
        },
      ],
      operations: [
        {
          id: "op1",
          cloudDocumentId: "op1",
          companyId: "c1",
          type: "sale",
          amount: 150_000,
          paymentMethod: "transfer",
          account: "kaspi",
          cashReceived: null,
          changeGiven: null,
          relatedMotorID: null,
          relatedMotorId: "m1",
          relatedWarrantyId: null,
          relatedClientId: null,
          relatedInventoryItemId: null,
          relatedMovementId: null,
          relatedWarehouseId: null,
          relatedWorkOrderId: null,
          relatedDonorId: "d1",
          relatedUsedPartId: null,
          costBasis: null,
          createdAt: new Date("2026-02-01"),
          createdByUserId: "u1",
          comment: null,
          category: null,
          description: null,
          source: null,
          details: null,
          updatedAt: new Date("2026-02-01"),
        },
      ],
    });
    assert.equal(pnl.soldRevenue, 150_000);
  });
});
