import assert from "node:assert/strict";
import test from "node:test";

import { sellMotorWithFinancialOperationUseCase } from "@/application/use-cases/sell-motor-with-financial-operation";
import type { MotorEntity } from "@/domain/motor";
import type { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import type { MotorRepository } from "@/infrastructure/firestore/motor-repository";

test("sale use case rejects an engine that is still in intake", async () => {
  let persisted = false;
  const motorRepository = {
    upsert: async () => {
      persisted = true;
      return "motor";
    },
  } as MotorRepository;
  const motor: MotorEntity = {
    id: "-101",
    companyId: "company",
    localId: -101,
    serialCode: "SERIAL-1",
    configuration: "",
    notes: "",
    quantity: 1,
    transmission: "",
    arrivalDate: null,
    soldDate: null,
    status: "awaiting_verification",
    intakeJobId: "job-1",
    intakeStatus: "awaiting_verification",
  };

  await assert.rejects(
    () =>
      sellMotorWithFinancialOperationUseCase(
        motorRepository,
        {} as FinancialOperationRepository,
        {
          uid: "seller",
          motor,
          companyId: "company",
          createdByUserId: "seller",
          amount: 0,
          account: "cashbox",
          paymentMethod: "cash",
        },
      ),
    /intake must be verified/i,
  );
  assert.equal(persisted, false);
});
