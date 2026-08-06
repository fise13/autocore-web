import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ENGINE_INTAKE_REQUIREMENTS,
  canReleaseEngineForSale,
  canTransitionEngineIntakeJob,
  deriveEngineIntakeProgress,
  emptyEngineIntakeProgress,
  fieldRequirementsSatisfied,
  verificationRequirementsSatisfied,
  type IntakePhoto,
} from "./index";

function photo(
  id: string,
  requirementId: string,
  syncState: IntakePhoto["syncState"] = "synced",
): IntakePhoto {
  return {
    id,
    companyId: "company",
    jobId: "job",
    engineId: "engine",
    sessionId: "session",
    requirementId,
    category: "other",
    categorySource: "worker",
    localUri: null,
    storagePath: `path/${id}`,
    url: `https://example.com/${id}.jpg`,
    contentType: "image/jpeg",
    sizeBytes: 1_000,
    width: null,
    height: null,
    capturedByUid: "worker",
    capturedOnDeviceId: "device",
    capturedAt: new Date().toISOString(),
    uploadedAt: new Date().toISOString(),
    syncState,
    reviewDecision: null,
    aiInspectionState: "queued",
    deletedAt: null,
  };
}

test("job state machine blocks releasing an open job directly", () => {
  assert.equal(canTransitionEngineIntakeJob("open", "verified"), false);
  assert.equal(canTransitionEngineIntakeJob("awaiting_verification", "verified"), true);
});

test("photo progress is requirement based rather than count based", () => {
  const photos = DEFAULT_ENGINE_INTAKE_REQUIREMENTS.filter((item) => item.required).map(
    (item, index) => photo(`photo-${index}`, item.id),
  );
  const progress = deriveEngineIntakeProgress(DEFAULT_ENGINE_INTAKE_REQUIREMENTS, photos);

  assert.equal(progress.requiredCount, 5);
  assert.equal(progress.satisfiedCount, 5);
  assert.deepEqual(progress.missingRequirementIds, []);
  assert.equal(verificationRequirementsSatisfied(progress), true);
});

test("field completion can be softer than verification", () => {
  const progress = deriveEngineIntakeProgress(
    DEFAULT_ENGINE_INTAKE_REQUIREMENTS,
    [photo("serial", "serial-plate")],
  );

  assert.equal(fieldRequirementsSatisfied(DEFAULT_ENGINE_INTAKE_REQUIREMENTS, progress), true);
  assert.equal(verificationRequirementsSatisfied(progress), false);
});

test("sale release requires verification state, location, and complete evidence", () => {
  const completeProgress = {
    ...emptyEngineIntakeProgress(DEFAULT_ENGINE_INTAKE_REQUIREMENTS),
    satisfiedCount: 5,
    missingRequirementIds: [],
  };

  assert.equal(
    canReleaseEngineForSale({
      state: "awaiting_verification",
      location: {
        locationId: "rack-a1",
        code: "A-01",
        isStaging: false,
        setByUid: "worker",
        setAt: new Date().toISOString(),
      },
      progress: completeProgress,
    }),
    true,
  );

  assert.equal(
    canReleaseEngineForSale({
      state: "awaiting_verification",
      location: null,
      progress: completeProgress,
    }),
    false,
  );
});
