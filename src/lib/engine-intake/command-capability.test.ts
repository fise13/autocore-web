import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { EngineIntakeCommand } from "@autocore/engine-intake";

import { capabilityForEngineIntakeCommand } from "./command-capability";

function command(
  type: EngineIntakeCommand["type"],
  payload: EngineIntakeCommand["payload"] = { jobId: "job_1" },
  client: EngineIntakeCommand["client"] = "mobile",
): EngineIntakeCommand {
  return {
    type,
    idempotencyKey: "idempotency-key-1",
    client,
    payload,
  } as EngineIntakeCommand;
}

describe("capabilityForEngineIntakeCommand", () => {
  it("lets a bay worker cancel and edit an engine they created", () => {
    assert.equal(capabilityForEngineIntakeCommand(command("cancel_job")), "execute");
    assert.equal(capabilityForEngineIntakeCommand(command("update_identity")), "execute");
    assert.equal(capabilityForEngineIntakeCommand(command("release_claim")), "execute");
  });

  it("keeps ad-hoc mobile creates on execute and desktop creates on verify", () => {
    assert.equal(
      capabilityForEngineIntakeCommand(
        command("create_job", { source: "ad_hoc" } as EngineIntakeCommand["payload"], "mobile"),
      ),
      "execute",
    );
    assert.equal(
      capabilityForEngineIntakeCommand(
        command("create_job", { source: "ad_hoc" } as EngineIntakeCommand["payload"], "desktop"),
      ),
      "verify",
    );
  });

  it("still requires a verifier for approve / rework / close", () => {
    assert.equal(capabilityForEngineIntakeCommand(command("approve_job")), "verify");
    assert.equal(capabilityForEngineIntakeCommand(command("request_rework")), "verify");
    assert.equal(capabilityForEngineIntakeCommand(command("close_job")), "verify");
    assert.equal(capabilityForEngineIntakeCommand(command("start_verification")), "verify");
  });
});
