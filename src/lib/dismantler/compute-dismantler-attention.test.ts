import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeDismantlerAttention } from "@/lib/dismantler/compute-dismantler-attention";
import type { UsedPart } from "@/domain/used-part";

describe("computeDismantlerAttention", () => {
  it("flags donors that have not paid back after 30 days", () => {
    const now = new Date("2026-08-24");
    const items = computeDismantlerAttention({
      now,
      pnls: [
        {
          donorId: "d1",
          purchasePrice: 100,
          soldRevenue: 10,
          remainingValue: 0,
          grossSoFar: -90,
          expectedIfRemainingSells: -90,
          partCount: 1,
          soldPartCount: 0,
          availablePartCount: 1,
          createdAt: new Date("2026-06-01"),
        },
      ],
      parts: [],
      staleDonorText: (count) => `${count} stale`,
      slowPartText: (count) => `${count} slow`,
    });
    assert.equal(items[0]?.id, "stale-donors");
  });

  it("flags available parts older than 45 days", () => {
    const now = new Date("2026-08-24");
    const part = {
      id: "p1",
      companyId: "c1",
      donorId: "d1",
      name: "Hood",
      sellPrice: 1,
      currency: "KZT",
      photoUrls: [],
      applicability: "",
      status: "available",
      createdAt: new Date("2026-06-01"),
      updatedAt: new Date("2026-06-01"),
      createdByUserId: "u1",
    } satisfies UsedPart;
    const items = computeDismantlerAttention({
      now,
      pnls: [],
      parts: [part],
      staleDonorText: (count) => `${count} stale`,
      slowPartText: (count) => `${count} slow`,
    });
    assert.equal(items[0]?.id, "slow-parts");
  });
});
