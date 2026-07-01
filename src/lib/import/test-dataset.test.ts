/**
 * Regression tests against AutoCore_Test_Dataset (when present locally).
 * Mirrors supplier catalog, mixed warehouse, dirty import, ZIP + photos.
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";

import JSZip from "jszip";

import { analyzeTable, ingestFiles, matchPhotos } from "@/lib/import";

const DATASET_DIR = path.join(os.homedir(), "Downloads", "AutoCore_Test_Dataset");

function datasetAvailable(): boolean {
  return fs.existsSync(path.join(DATASET_DIR, "01-perfect.xlsx"));
}

async function readDatasetFile(name: string): Promise<ArrayBuffer> {
  const buf = fs.readFileSync(path.join(DATASET_DIR, name));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("AutoCore test dataset", { skip: !datasetAvailable() }, () => {
  it("recognises perfect supplier catalog (engines + transmissions)", async () => {
    const bytes = await readDatasetFile("01-perfect.xlsx");
    const ingestion = await ingestFiles([
      { name: "01-perfect.xlsx", arrayBuffer: async () => bytes },
    ]);
    assert.equal(ingestion.tables.length, 1);

    const analysis = analyzeTable(ingestion.tables[0]!);
    assert.equal(analysis.rows.length, 100);

    const types = new Map<string, number>();
    for (const row of analysis.rows) {
      types.set(row.classification.recordType, (types.get(row.classification.recordType) ?? 0) + 1);
    }
    assert.equal(types.get("engine"), 80);
    assert.equal(types.get("transmission"), 20);
    assert.equal(analysis.stats.recognized, 100);
    assert.ok(analysis.rows[0]!.values.name?.includes("EJ205"));
  });

  it("recognises mixed business rows by name", async () => {
    const bytes = await readDatasetFile("03-mixed-business.xlsx");
    const ingestion = await ingestFiles([
      { name: "03-mixed-business.xlsx", arrayBuffer: async () => bytes },
    ]);
    const analysis = analyzeTable(ingestion.tables[0]!);
    assert.equal(analysis.rows.length, 1000);

    const unknown = analysis.rows.filter((row) => row.classification.recordType === "unknown");
    assert.equal(unknown.length, 0);
    assert.ok(analysis.stats.recognized + analysis.stats.needsReview >= 990);
  });

  it("maps dirty headers and slang part names", async () => {
    const bytes = await readDatasetFile("04-dirty-import.xlsx");
    const ingestion = await ingestFiles([
      { name: "04-dirty-import.xlsx", arrayBuffer: async () => bytes },
    ]);
    const analysis = analyzeTable(ingestion.tables[0]!);

    assert.equal(analysis.mapping.fields.name, "Товар");
    assert.equal(analysis.mapping.fields.price, "Стоимость");
    assert.equal(analysis.mapping.fields.comment, "Прим");

    const byName = new Map(analysis.rows.map((row) => [row.raw["Товар"]?.toLowerCase(), row]));
    assert.equal(byName.get("ej205")?.classification.recordType, "engine");
    assert.equal(byName.get("u660e")?.classification.recordType, "transmission");
    assert.equal(byName.get("морда бл5")?.classification.recordType, "body");
  });

  it("ingests ZIP with spreadsheets and photos", async () => {
    const zip = new JSZip();
    zip.file("01-perfect.xlsx", await readDatasetFile("01-perfect.xlsx"));
    zip.file("photos/EJ205_SN100001.jpg", fs.readFileSync(path.join(DATASET_DIR, "photos", "EJ205_SN100001.jpg")));
    zip.file("photos/U660E_SN100120.jpg", fs.readFileSync(path.join(DATASET_DIR, "photos", "U660E_SN100120.jpg")));
    const zipBytes = await zip.generateAsync({ type: "arraybuffer" });

    const ingestion = await ingestFiles([
      { name: "autocore-test.zip", arrayBuffer: async () => zipBytes },
    ]);

    assert.equal(ingestion.tables.length, 1);
    assert.equal(ingestion.images.length, 2);

    const analysis = analyzeTable(ingestion.tables[0]!);
    const matches = matchPhotos(analysis.rows, ingestion.images);
    assert.ok(matches.length >= 2);

    const serialMatch = matches.find((match) => match.matchedBy === "serial");
    assert.ok(serialMatch, "expected serial-based photo match");
  });
});

describe("structured catalog profile (fixture)", () => {
  it("classifies by Тип column", () => {
    const analysis = analyzeTable({
      name: "Sheet",
      headers: ["Марка", "Модель", "Тип", "Название", "Серийный номер", "Цена", "SKU", "Склад"],
      rows: [
        {
          "Марка": "Subaru",
          "Модель": "Impreza",
          "Тип": "Двигатель",
          "Название": "EJ205",
          "Серийный номер": "SN100000",
          "Цена": "286552",
          SKU: "AC-00000",
          "Склад": "Основной",
        },
        {
          "Марка": "Toyota",
          "Модель": "Camry",
          "Тип": "КПП",
          "Название": "U660E",
          "Серийный номер": "SN100002",
          "Цена": "806196",
          SKU: "AC-00002",
          "Склад": "Основной",
        },
      ],
      parseWarnings: [],
    });

    assert.equal(analysis.rows[0]!.classification.recordType, "engine");
    assert.equal(analysis.rows[1]!.classification.recordType, "transmission");
    assert.equal(analysis.rows[0]!.confidence.tier, "high");
  });
});
