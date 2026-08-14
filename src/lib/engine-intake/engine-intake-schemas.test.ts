import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseEngineIntakeCommand } from "./engine-intake-schemas";

describe("parseEngineIntakeCommand", () => {
  it("accepts approve_job with a canonical quality grade", () => {
    const command = parseEngineIntakeCommand({
      type: "approve_job",
      idempotencyKey: "approve-job-key-1",
      client: "mobile",
      clientAt: "2026-08-14T16:00:00.000Z",
      deviceId: "device_1",
      payload: {
        jobId: "job_1",
        note: "Checklist ready",
        identity: {
          serialCode: "E168668",
          brandName: "Subaru",
          engineCode: "EJ-253 AVCS",
        },
        quality: "1",
      },
    });
    assert.equal(command.type, "approve_job");
    if (command.type === "approve_job") {
      assert.equal(command.payload.quality, "1");
    }
  });

  it("rejects approve_job without quality", () => {
    assert.throws(() =>
      parseEngineIntakeCommand({
        type: "approve_job",
        idempotencyKey: "approve-job-key-2",
        client: "mobile",
        payload: { jobId: "job_1" },
      }),
    );
  });
});
