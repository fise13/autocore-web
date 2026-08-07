import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ENGINE_INTAKE_REQUIREMENTS,
  canFinishFieldDocumentation,
  canReleaseEngineForSale,
  canTransitionEngineIntakeJob,
  deriveDocumentationCoverage,
  deriveEngineIntakeProgress,
  emptyEngineIntakeProgress,
  fieldRequirementsSatisfied,
  verificationRequirementsSatisfied,
  warehouseLifecycleLabel,
  type IntakePhoto,
} from "./index";

function photo(
  id: string,
  requirementId: string | null,
  category: IntakePhoto["category"] = "other",
  syncState: IntakePhoto["syncState"] = "synced",
): IntakePhoto {
  return {
    id,
    companyId: "company",
    jobId: "job",
    engineId: "engine",
    sessionId: "session",
    requirementId,
    category,
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

test("capture-first package has no required checklist items", () => {
  assert.equal(
    DEFAULT_ENGINE_INTAKE_REQUIREMENTS.every((item) => !item.required),
    true,
  );
});

test("coverage rises with diverse views, not duplicate angles", () => {
  const diverse = deriveDocumentationCoverage(
    [
      { category: "serial_plate" },
      { category: "overview_left" },
      { category: "overview_right" },
      { category: "overview_front" },
      { category: "overview_rear" },
      { category: "valve_cover" },
      { category: "oil_pan" },
    ],
    { serialConfirmed: true },
  );
  const duplicates = deriveDocumentationCoverage(
    [
      { category: "overview_left" },
      { category: "overview_left" },
      { category: "overview_left" },
      { category: "overview_left" },
      { category: "overview_left" },
      { category: "overview_left" },
      { category: "overview_left" },
    ],
    { serialConfirmed: true },
  );

  assert.ok(diverse.percent > duplicates.percent);
  assert.ok(diverse.percent >= 85);
  assert.ok(duplicates.percent < 50);
});

test("progress is coverage based when checklist is empty", () => {
  const photos = [
    photo("a", null, "serial_plate"),
    photo("b", null, "overview_left"),
    photo("c", null, "overview_right"),
  ];
  const progress = deriveEngineIntakeProgress(DEFAULT_ENGINE_INTAKE_REQUIREMENTS, photos, {
    serialConfirmed: true,
  });

  assert.equal(progress.requiredCount, 0);
  assert.equal(progress.capturedCount, 3);
  assert.deepEqual(progress.missingRequirementIds, []);
  assert.ok(progress.coveragePercent > 0);
  assert.equal(verificationRequirementsSatisfied(progress), true);
  assert.equal(fieldRequirementsSatisfied(DEFAULT_ENGINE_INTAKE_REQUIREMENTS, progress), true);
});

test("worker can finish with serial and one photo even if coverage is thin", () => {
  const progress = {
    ...emptyEngineIntakeProgress(),
    capturedCount: 1,
    coveragePercent: 20,
  };
  assert.equal(
    canFinishFieldDocumentation({
      expectedIdentity: {
        serialCode: "UF398539",
        brandName: "",
        engineCode: "",
        donorVin: "",
        configuration: "",
      },
      progress,
    }),
    true,
  );
});

test("sale release requires verification state, serial, photos, and coverage or override", () => {
  const thinProgress = {
    ...emptyEngineIntakeProgress(),
    capturedCount: 2,
    coveragePercent: 40,
  };
  const readyProgress = {
    ...emptyEngineIntakeProgress(),
    capturedCount: 6,
    coveragePercent: 90,
  };

  assert.equal(
    canReleaseEngineForSale({
      state: "awaiting_verification",
      location: null,
      expectedIdentity: {
        serialCode: "UF398539",
        brandName: "",
        engineCode: "",
        donorVin: "",
        configuration: "",
      },
      progress: readyProgress,
    }),
    true,
  );

  assert.equal(
    canReleaseEngineForSale({
      state: "awaiting_verification",
      location: null,
      expectedIdentity: {
        serialCode: "UF398539",
        brandName: "",
        engineCode: "",
        donorVin: "",
        configuration: "",
      },
      progress: thinProgress,
    }),
    false,
  );

  assert.equal(
    canReleaseEngineForSale(
      {
        state: "awaiting_verification",
        location: null,
        expectedIdentity: {
          serialCode: "UF398539",
          brandName: "",
          engineCode: "",
          donorVin: "",
          configuration: "",
        },
        progress: thinProgress,
      },
      "Manager override — enough for sale",
    ),
    true,
  );
});

test("warehouse lifecycle maps job states for the bay", () => {
  assert.equal(warehouseLifecycleLabel("open"), "Draft");
  assert.equal(warehouseLifecycleLabel("in_session"), "Documenting");
  assert.equal(warehouseLifecycleLabel("awaiting_verification"), "Ready");
  assert.equal(warehouseLifecycleLabel("verified"), "Released");
});
