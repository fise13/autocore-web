import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ENGINE_COLUMN_THRESHOLD,
  findEngineCodeColumn,
  MIN_ENGINE_COLUMN_SAMPLE,
} from "@/lib/import/engine-column-sniff";

function table(rows: Record<string, string>[]): Record<string, string>[] {
  return rows;
}

describe("findEngineCodeColumn", () => {
  it("finds the engine column on a sheet named after a branch", () => {
    // The real workbook: sheet «СВЕРДЛОВА», column headed just «НОМЕР».
    const headers = ["НОМЕР", "КОМПЛЕКТАЦИЯ", "ЦЕНА"];
    const rows = table([
      { "НОМЕР": "EJ251- C085834", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "180000" },
      { "НОМЕР": "EJ253- C816379", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "195000" },
      { "НОМЕР": "253AVCS- 810404", "КОМПЛЕКТАЦИЯ": "без навесного", "ЦЕНА": "150000" },
      { "НОМЕР": "EJ253- C048730", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "205000" },
      { "НОМЕР": "253AVCS- P454024", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "210000" },
    ]);
    const match = findEngineCodeColumn(headers, rows);
    assert.equal(match?.header, "НОМЕР");
    assert.equal(match?.matched, 5);
  });

  it("does not mistake a price or a quantity column for engines", () => {
    const headers = ["ЦЕНА", "КОЛИЧЕСТВО"];
    const rows = table(
      Array.from({ length: 10 }, (_, index) => ({
        "ЦЕНА": String(100000 + index),
        "КОЛИЧЕСТВО": "1",
      })),
    );
    assert.equal(findEngineCodeColumn(headers, rows), null);
  });

  it("holds back until it has seen enough cells", () => {
    const headers = ["НОМЕР"];
    const rows = table(
      Array.from({ length: MIN_ENGINE_COLUMN_SAMPLE - 1 }, () => ({ "НОМЕР": "EJ253- C1" })),
    );
    assert.equal(findEngineCodeColumn(headers, rows), null);
  });

  it("ignores blanks and placeholders when judging a column", () => {
    const headers = ["НОМЕР"];
    const rows = table([
      { "НОМЕР": "EJ251- C1" },
      { "НОМЕР": "" },
      { "НОМЕР": "—" },
      { "НОМЕР": "EJ253- C2" },
      { "НОМЕР": "N/A" },
      { "НОМЕР": "EJ204- C3" },
      { "НОМЕР": "EJ251- C4" },
    ]);
    const match = findEngineCodeColumn(headers, rows);
    assert.equal(match?.sampled, 4);
    assert.equal(match?.ratio, 1);
  });

  it("refuses a column that is only sometimes an engine code", () => {
    const headers = ["СМЕСЬ"];
    const rows = table([
      { "СМЕСЬ": "EJ253- C1" },
      { "СМЕСЬ": "коробка" },
      { "СМЕСЬ": "бампер" },
      { "СМЕСЬ": "фара" },
      { "СМЕСЬ": "дверь" },
    ]);
    const match = findEngineCodeColumn(headers, rows);
    assert.equal(match, null);
    assert.ok(1 / 5 < ENGINE_COLUMN_THRESHOLD);
  });

  it("picks the strongest column when several could pass", () => {
    const headers = ["ОСНОВНОЙ", "ЗАПАСНОЙ"];
    const rows = table([
      { "ОСНОВНОЙ": "EJ251- C1", "ЗАПАСНОЙ": "EJ251- C1" },
      { "ОСНОВНОЙ": "EJ253- C2", "ЗАПАСНОЙ": "EJ253- C2" },
      { "ОСНОВНОЙ": "EJ204- C3", "ЗАПАСНОЙ": "EJ204- C3" },
      { "ОСНОВНОЙ": "EJ202- C4", "ЗАПАСНОЙ": "полная" },
      { "ОСНОВНОЙ": "EJ253- C5", "ЗАПАСНОЙ": "полная" },
    ]);
    assert.equal(findEngineCodeColumn(headers, rows)?.header, "ОСНОВНОЙ");
  });
});
