import type { EngineIntakeCommand } from "@autocore/engine-intake";

export type EngineIntakeCommandCapability = "view" | "execute" | "verify";

/**
 * Bay workers have `engine_intake_execute` but not `engine_intake_verify`.
 * Anything they do from the phone (create, shoot, edit serial, cancel) must
 * map to execute — otherwise the API 403s and the engine never leaves the list.
 */
const EXECUTE_TYPES = new Set<EngineIntakeCommand["type"]>([
  "claim_job",
  "heartbeat_session",
  "pause_session",
  "resume_session",
  "cancel_session",
  "confirm_identity",
  "report_identity_mismatch",
  "set_location",
  "field_complete",
  "cancel_job",
  "update_identity",
  "release_claim",
  "pause_job",
  "resume_job",
]);

export function capabilityForEngineIntakeCommand(
  command: EngineIntakeCommand,
): EngineIntakeCommandCapability {
  if (command.type === "create_job") {
    return command.client === "mobile" && command.payload.source === "ad_hoc"
      ? "execute"
      : "verify";
  }
  if (EXECUTE_TYPES.has(command.type)) return "execute";
  return "verify";
}
