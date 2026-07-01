import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MotorEntity } from "@/domain/motor";
import {
  countMotorsByFilter,
  motorMatchesPinnedFilter,
  pinnedFilterToAvailability,
} from "@/lib/navigation/pinned-filters";

function motor(partial: Partial<MotorEntity>): MotorEntity {
  return {
    id: "m1",
    companyId: "c1",
    serialCode: "ABC",
    configuration: "",
    notes: "",
    quantity: 1,
    transmission: "",
    arrivalDate: new Date("2026-01-01"),
    ...partial,
  };
}

describe("pinned-filters", () => {
  it("detects available and reserved motors", () => {
    const available = motor({ status: "available" });
    const reserved = motor({ status: "reserved", reservedForWorkOrderId: "wo1" });

    assert.equal(motorMatchesPinnedFilter(available, "available"), true);
    assert.equal(motorMatchesPinnedFilter(reserved, "reserved"), true);
    assert.equal(motorMatchesPinnedFilter(reserved, "available"), false);
  });

  it("maps sold filter to sold availability", () => {
    assert.equal(pinnedFilterToAvailability("sold"), "sold");
    assert.equal(pinnedFilterToAvailability("available"), "available");
    assert.equal(pinnedFilterToAvailability(undefined), "all");
  });

  it("counts motors by filter", () => {
    const motors = [
      motor({ status: "available" }),
      motor({ status: "reserved" }),
      motor({ soldDate: new Date("2026-02-01"), status: "sold" }),
    ];
    assert.equal(countMotorsByFilter(motors, "available"), 1);
    assert.equal(countMotorsByFilter(motors, "reserved"), 1);
    assert.equal(countMotorsByFilter(motors, "sold"), 1);
  });
});
