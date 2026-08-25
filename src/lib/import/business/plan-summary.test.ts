import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decision, type EntityDraft, type ImportDiscovery, type ImportEntityKind } from "@/lib/import/business/contracts";
import { buildImportPlan } from "@/lib/import/business/import-plan";
import { presentPlan } from "@/lib/import/business/plan-summary";

const EMPTY_DISCOVERY: ImportDiscovery = { sheets: [], ignored: [] };

function draft(id: string, kind: ImportEntityKind, name?: string): EntityDraft {
  return {
    id,
    kind,
    values: name
      ? { name: { raw: name, normalized: name, decision: decision("field", 1, "тест", "rules") } }
      : {},
    sources: [{ table: "Доноры", index: 4, section: null }],
    keys: [],
    decision: decision("entity", 0.95, "тест", "rules"),
    review: [],
  };
}

function plan(entities: EntityDraft[], extra: Partial<Parameters<typeof buildImportPlan>[0]> = {}) {
  return buildImportPlan({
    importId: "imp1",
    companyId: "c1",
    entities,
    relationships: [],
    discovery: EMPTY_DISCOVERY,
    ...extra,
  });
}

describe("presentPlan", () => {
  it("leads with what will appear in the database, not with columns", () => {
    const view = presentPlan(
      plan([draft("e1", "donor"), draft("e2", "donor"), draft("e3", "usedPart")]),
    );
    assert.deepEqual(
      view.headlines.map((line) => [line.label, line.total]),
      [
        ["Доноры", 2],
        ["Б/у детали", 1],
      ],
    );
    assert.equal(view.createTotal, 3);
  });

  it("separates what is new from what already exists", () => {
    const view = presentPlan(
      plan([draft("e1", "donor")], {
        entities: [
          {
            ...draft("e1", "donor"),
            keys: [{ field: "vin", value: "abc" }],
          },
        ],
        existing: { donorVins: new Map([["abc", "donor-1"]]) },
      }),
    );
    assert.equal(view.updateTotal, 1);
    assert.equal(view.createTotal, 0);
  });

  it("names what it understood but cannot write, instead of hiding it", () => {
    const view = presentPlan(plan([draft("e1", "customer", "Иванов И.И.")]));
    assert.deepEqual(view.deferred, [{ kind: "customer", label: "Клиенты", count: 1 }]);
  });

  it("gives each review item a name, a reason and where to look", () => {
    const view = presentPlan(plan([draft("e1", "unknown", "Что-то")]));
    assert.equal(view.reviewItems.length, 1);
    const item = view.reviewItems[0]!;
    assert.equal(item.title, "Что-то");
    assert.equal(item.reasons[0]!.code, "ambiguous-entity");
    assert.deepEqual(item.sources, ["Доноры, строка 5"]);
  });

  it("shows nothing for review when nothing is ambiguous", () => {
    const view = presentPlan(plan([draft("e1", "donor"), draft("e2", "usedPart")]));
    assert.deepEqual(view.reviewItems, []);
    assert.equal(view.reviewTotal, 0);
  });

  it("says plainly when the model did not analyse anything", () => {
    const view = presentPlan(plan([draft("e1", "donor")]), {
      configured: true,
      provider: "openrouter",
      passes: {
        discovery: false,
        ontology: false,
        normalization: false,
        resolution: false,
        relationships: false,
      },
      degraded: true,
      sheetSummaries: [],
    });
    assert.equal(view.ai.used, false);
    assert.equal(view.ai.degraded, true);
  });

  it("does not claim AI when none was configured", () => {
    const view = presentPlan(plan([draft("e1", "donor")]));
    assert.equal(view.ai.used, false);
    assert.equal(view.ai.degraded, false);
    assert.equal(view.ai.provider, "none");
  });

  it("reports the rows it refused to import", () => {
    const view = presentPlan(
      plan([], {
        discovery: {
          sheets: [],
          ignored: [
            { table: "A", index: 9, role: "total", reason: "Строка итогов" },
            { table: "A", index: 0, role: "section-header", reason: "Заголовок раздела" },
          ],
        },
      }),
    );
    assert.equal(view.ignoredRows, 2);
  });
});
