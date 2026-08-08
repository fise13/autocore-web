import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ENGINE_INTAKE_REQUIREMENTS,
  canFinishFieldDocumentation,
  canReleaseEngineForSale,
  canTransitionEngineIntakeJob,
  checklistWhisper,
  deriveEngineIntakeProgress,
  emptyEngineIntakeProgress,
  normalizeDocumentationChecklist,
  reconcileDocumentationChecklist,
  seedDocumentationChecklist,
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

test("seed checklist starts with serial + condition photos only", () => {
  const checklist = seedDocumentationChecklist({ serialConfirmed: true });
  assert.equal(
    checklist.items.find((item) => item.id === "serial_visible")?.state,
    "completed",
  );
  assert.equal(checklist.items.length, 2);
  assert.equal(
    checklist.items.find((item) => item.id === "overall_engine")?.state,
    "missing",
  );
  assert.ok(checklistWhisper(checklist)?.includes("Condition photos"));
});

test("normalizeDocumentationChecklist seeds missing or empty payloads", () => {
  const seeded = normalizeDocumentationChecklist(null, { serialConfirmed: true });
  assert.ok(seeded.items.length > 0);
  assert.equal(
    seeded.items.find((item) => item.id === "serial_visible")?.state,
    "completed",
  );

  const kept = normalizeDocumentationChecklist(seeded);
  assert.equal(kept.items.length, seeded.items.length);
  assert.equal(kept.summary.missingCount, seeded.summary.missingCount);
});

test("condition photos + serial make sale checklist ready", () => {
  const checklist = reconcileDocumentationChecklist({
    previous: seedDocumentationChecklist({ serialConfirmed: true }),
    photos: [
      { id: "1", category: "other" },
      { id: "2", category: "other" },
    ],
    hints: { serialConfirmed: true },
  });

  assert.equal(checklist.summary.saleGateMissingCount, 0);
  assert.equal(checklist.summary.ready, true);
  assert.equal(
    checklist.items.find((item) => item.id === "overall_engine")?.state,
    "completed",
  );
  assert.equal(checklist.items.find((item) => item.id === "left_side"), undefined);
});

test("oil pan removed unlocks internals items", () => {
  const checklist = reconcileDocumentationChecklist({
    previous: seedDocumentationChecklist({ serialConfirmed: true }),
    photos: [
      { id: "a", category: "oil_pan", checklistHits: ["oil_pan_removed", "crankshaft_visible"] },
      { id: "b", category: "other", checklistHits: ["connecting_rods"] },
    ],
    hints: { serialConfirmed: true, oilPanRemoved: true },
  });

  assert.equal(
    checklist.items.find((item) => item.id === "oil_pan_removed")?.state,
    "completed",
  );
  assert.ok(checklist.items.some((item) => item.id === "crankshaft_visible"));
});

test("progress is ready once serial and any photos exist", () => {
  const photos = [
    photo("a", null, "serial_plate"),
    photo("b", null, "other"),
  ];
  const progress = deriveEngineIntakeProgress(DEFAULT_ENGINE_INTAKE_REQUIREMENTS, photos, {
    serialConfirmed: true,
  });

  assert.equal(progress.requiredCount, 0);
  assert.equal(progress.documentationChecklist.summary.ready, true);
  assert.equal(progress.documentationChecklist.summary.whisper, null);
});

test("worker can finish with serial and one photo", () => {
  const progress = {
    ...emptyEngineIntakeProgress(),
    capturedCount: 1,
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

test("sale release uses checklist readiness or override", () => {
  const readyChecklist = reconcileDocumentationChecklist({
    previous: seedDocumentationChecklist({ serialConfirmed: true }),
    photos: [{ id: "1", category: "other" }],
    hints: { serialConfirmed: true },
  });
  const thinChecklist = seedDocumentationChecklist({ serialConfirmed: true });

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
      progress: { ...emptyEngineIntakeProgress(), capturedCount: 1 },
      documentationChecklist: readyChecklist,
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
      progress: { ...emptyEngineIntakeProgress(), capturedCount: 2 },
      documentationChecklist: thinChecklist,
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
        progress: { ...emptyEngineIntakeProgress(), capturedCount: 2 },
        documentationChecklist: thinChecklist,
      },
      "Manager override",
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
