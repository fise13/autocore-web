import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DonorVehicle } from "@/domain/donor";
import {
  donorFormFromDonor,
  donorFormValues,
  EMPTY_DONOR_FORM,
  isDonorFormValid,
} from "@/lib/dismantler/donor-form";

const donor: DonorVehicle = {
  id: "d1",
  companyId: "c1",
  vin: "JT123",
  make: "Toyota",
  model: "Camry",
  year: 2014,
  body: "sedan",
  purchasePrice: 400_000,
  currency: "KZT",
  source: "auction",
  status: "in_progress",
  yardLocation: "A-12",
  photoUrls: [],
  notes: "front hit",
  purchasedAt: new Date("2026-01-05T00:00:00.000Z"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdByUserId: "u1",
};

describe("donor form", () => {
  it("round-trips a donor through the form without losing a field", () => {
    const values = donorFormValues(donorFormFromDonor(donor));
    assert.equal(values.vin, "JT123");
    assert.equal(values.make, "Toyota");
    assert.equal(values.model, "Camry");
    assert.equal(values.year, 2014);
    assert.equal(values.body, "sedan");
    assert.equal(values.purchasePrice, 400_000);
    assert.equal(values.source, "auction");
    assert.equal(values.yardLocation, "A-12");
    assert.equal(values.notes, "front hit");
    assert.equal(values.purchasedAt?.toISOString().slice(0, 10), "2026-01-05");
  });

  it("clears a year and a purchase date the user emptied", () => {
    const values = donorFormValues({
      ...donorFormFromDonor(donor),
      year: "",
      purchasedAt: "",
    });
    // null, not undefined: undefined would leave the old value on the record.
    assert.equal(values.year, null);
    assert.equal(values.purchasedAt, null);
  });

  it("does not turn junk into 0 or NaN", () => {
    const values = donorFormValues({
      ...EMPTY_DONOR_FORM,
      make: "Toyota",
      year: "  ",
      purchasePrice: "not a number",
    });
    assert.equal(values.year, null);
    assert.equal(values.purchasePrice, 0);
    assert.ok(!Number.isNaN(values.purchasePrice));
  });

  it("leaves a donor with no optional data as empty strings, not undefined", () => {
    const form = donorFormFromDonor({ ...donor, body: undefined, notes: undefined, year: undefined });
    assert.equal(form.body, "");
    assert.equal(form.notes, "");
    assert.equal(form.year, "");
  });

  it("requires a make", () => {
    assert.equal(isDonorFormValid(EMPTY_DONOR_FORM), false);
    assert.equal(isDonorFormValid({ ...EMPTY_DONOR_FORM, make: "  " }), false);
    assert.equal(isDonorFormValid({ ...EMPTY_DONOR_FORM, make: "Toyota" }), true);
  });
});
