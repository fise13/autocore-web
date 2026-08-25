import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DonorVehicle } from "@/domain/donor";
import type { FinancialOperation } from "@/domain/financial-operation";
import type { MotorEntity } from "@/domain/motor";
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

function motor(partial: Partial<MotorEntity> & Pick<MotorEntity, "id">): MotorEntity {
  return {
    companyId: "c1",
    serialCode: "S1",
    configuration: "",
    notes: "",
    quantity: 1,
    transmission: "",
    arrivalDate: null,
    donorId: "d1",
    ...partial,
  };
}

function operation(
  partial: Partial<FinancialOperation> & Pick<FinancialOperation, "id" | "type" | "amount">,
): FinancialOperation {
  return {
    cloudDocumentId: partial.id,
    companyId: "c1",
    paymentMethod: "transfer",
    account: "kaspi",
    cashReceived: null,
    changeGiven: null,
    relatedMotorID: null,
    relatedMotorId: null,
    relatedWarrantyId: null,
    relatedClientId: null,
    relatedInventoryItemId: null,
    relatedMovementId: null,
    relatedWarehouseId: null,
    relatedWorkOrderId: null,
    relatedDonorId: null,
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
      motors: [motor({ id: "m1", status: "sold", soldDate: new Date("2026-02-01") })],
      operations: [
        operation({
          id: "op1",
          type: "sale",
          amount: 150_000,
          relatedMotorId: "m1",
          relatedDonorId: "d1",
        }),
      ],
    });
    assert.equal(pnl.soldRevenue, 150_000);
    assert.equal(pnl.revenue.fromMotors, 150_000);
    assert.equal(pnl.revenue.fromDonorSales, 0);
    assert.equal(pnl.unvaluedSoldMotorCount, 0);
  });

  it("counts a part sale once even though its operation also carries the donor id", () => {
    const pnl = computeDonorPnl({
      donor,
      parts: [part({ id: "p1", status: "sold", sellPrice: 120_000, soldAmount: 120_000 })],
      operations: [
        operation({
          id: "op1",
          type: "sale",
          amount: 120_000,
          relatedUsedPartId: "p1",
          relatedDonorId: "d1",
        }),
      ],
    });
    assert.equal(pnl.soldRevenue, 120_000);
    assert.equal(pnl.revenue.fromParts, 120_000);
    assert.equal(pnl.revenue.fromDonorSales, 0);
  });

  it("adds a whole-car sale on top of the parts already sold", () => {
    const pnl = computeDonorPnl({
      donor,
      parts: [part({ id: "p1", status: "sold", sellPrice: 120_000, soldAmount: 120_000 })],
      operations: [
        operation({
          id: "op1",
          type: "sale",
          amount: 120_000,
          relatedUsedPartId: "p1",
          relatedDonorId: "d1",
        }),
        // Scrap value of the shell — no part or motor behind it.
        operation({ id: "op2", type: "sale", amount: 60_000, relatedDonorId: "d1" }),
      ],
    });
    assert.equal(pnl.soldRevenue, 180_000);
    assert.equal(pnl.revenue.fromDonorSales, 60_000);
    assert.equal(pnl.grossSoFar, -220_000);
  });

  it("cancels a returned part sale against its refund", () => {
    const pnl = computeDonorPnl({
      donor,
      // The un-sell use case puts the part back to available and clears soldAmount.
      parts: [part({ id: "p1", status: "available", sellPrice: 120_000 })],
      operations: [
        operation({
          id: "op1",
          type: "sale",
          amount: 120_000,
          relatedUsedPartId: "p1",
          relatedDonorId: "d1",
        }),
        operation({
          id: "op2",
          type: "refund",
          amount: 120_000,
          relatedUsedPartId: "p1",
          relatedDonorId: "d1",
        }),
      ],
    });
    assert.equal(pnl.soldRevenue, 0);
    assert.equal(pnl.remainingValue, 120_000);
    assert.equal(pnl.grossSoFar, -400_000);
  });

  it("ignores expenses and transfers booked against the donor", () => {
    const pnl = computeDonorPnl({
      donor,
      parts: [],
      operations: [
        operation({ id: "op1", type: "expense", amount: 30_000, relatedDonorId: "d1" }),
        operation({ id: "op2", type: "transfer", amount: 50_000, relatedDonorId: "d1" }),
      ],
    });
    assert.equal(pnl.soldRevenue, 0);
  });

  it("flags a sold motor whose sale amount cannot be established", () => {
    const pnl = computeDonorPnl({
      donor,
      parts: [],
      motors: [
        motor({ id: "m1", status: "sold", soldDate: new Date("2026-02-01") }),
        motor({ id: "m2", status: "available" }),
      ],
      operations: [],
    });
    assert.equal(pnl.soldRevenue, 0);
    assert.equal(pnl.motorCount, 2);
    assert.equal(pnl.soldMotorCount, 1);
    assert.equal(pnl.remainingMotorCount, 1);
    assert.equal(pnl.unvaluedSoldMotorCount, 1);
  });

  it("leaves deleted motors and other donors' items out of the numbers", () => {
    const pnl = computeDonorPnl({
      donor,
      parts: [
        part({ id: "p1", status: "sold", sellPrice: 10_000, soldAmount: 10_000 }),
        part({ id: "p2", donorId: "d2", status: "sold", sellPrice: 99_000, soldAmount: 99_000 }),
      ],
      motors: [
        motor({ id: "m1", deletedAt: new Date("2026-03-01"), status: "sold" }),
        motor({ id: "m2", donorId: "d2", status: "available" }),
      ],
      operations: [
        operation({ id: "op1", type: "sale", amount: 99_000, relatedDonorId: "d2" }),
      ],
    });
    assert.equal(pnl.soldRevenue, 10_000);
    assert.equal(pnl.partCount, 1);
    assert.equal(pnl.motorCount, 0);
  });
});
