import assert from "node:assert/strict";
import { describe, it } from "node:test";

import JSZip from "jszip";
import * as XLSX from "xlsx";

import { analyzeTable, ingestFiles, matchPhotos, type IngestInput } from "@/lib/import";

function inputFromBytes(name: string, bytes: ArrayBuffer | Uint8Array): IngestInput {
  const buffer = bytes instanceof Uint8Array ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes;
  return { name, arrayBuffer: async () => buffer as ArrayBuffer };
}

function csvInput(name: string, text: string): IngestInput {
  return inputFromBytes(name, new TextEncoder().encode(text));
}

function workbookBytes(): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Марка", "Двигатель", "Серийный номер", "Цена"],
    ["Subaru", "EJ205", "C123456", "85 000 ₽"],
    ["Toyota", "1JZ-GTE", "T998877", "120 000 ₽"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Двигатели");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("ingestion — delimited text", () => {
  it("parses a CSV into a ParsedTable", async () => {
    const csv = "Марка,Двигатель,Серийный номер,Цена\nSubaru,EJ205,C123456,85000\nToyota,1JZ,T998877,120000\n";
    const result = await ingestFiles([csvInput("motors.csv", csv)]);
    assert.equal(result.tables.length, 1);
    assert.equal(result.tables[0].rows.length, 2);
    assert.ok(result.tables[0].headers.includes("Марка"));
  });

  it("auto-detects a semicolon delimiter", async () => {
    const csv = "name;qty;price\nМасло;10;500\n";
    const result = await ingestFiles([csvInput("stock.csv", csv)]);
    assert.equal(result.tables[0].headers.length, 3);
  });
});

describe("ingestion — workbook", () => {
  it("parses an xlsx workbook", async () => {
    const result = await ingestFiles([inputFromBytes("motors.xlsx", workbookBytes())]);
    assert.equal(result.tables.length, 1);
    assert.equal(result.tables[0].name, "Двигатели");
    assert.equal(result.tables[0].rows.length, 2);
  });
});

describe("ingestion — zip", () => {
  it("extracts spreadsheets and images from a nested archive", async () => {
    const zip = new JSZip();
    zip.file("data/motors.csv", "Марка,Двигатель,Серийный номер\nSubaru,EJ205,C123456\n");
    zip.folder("photos")!.file("C123456.jpg", new Uint8Array([0xff, 0xd8, 0xff]));
    zip.file("__MACOSX/._motors.csv", "junk");
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const result = await ingestFiles([inputFromBytes("archive.zip", bytes)]);
    assert.equal(result.tables.length, 1);
    assert.equal(result.images.length, 1);
    assert.equal(result.images[0].fileName, "C123456.jpg");
    assert.equal(result.images[0].matchKey, "c123456");
  });
});

describe("photo matching", () => {
  it("links images to rows by serial number and groups sequences", async () => {
    const table = {
      name: "t",
      headers: ["Серийный номер", "Двигатель"],
      rows: [
        { "Серийный номер": "C123456", "Двигатель": "EJ205" },
        { "Серийный номер": "T998877", "Двигатель": "1JZ-GTE" },
      ],
      parseWarnings: [],
    };
    const analysis = analyzeTable(table);
    const images = [
      { fileName: "C123456_1.jpg", path: "C123456_1.jpg", bytes: new ArrayBuffer(3), mimeType: "image/jpeg", matchKey: "c1234561" },
      { fileName: "C123456-2.jpg", path: "C123456-2.jpg", bytes: new ArrayBuffer(3), mimeType: "image/jpeg", matchKey: "c1234562" },
      { fileName: "T998877.jpg", path: "T998877.jpg", bytes: new ArrayBuffer(3), mimeType: "image/jpeg", matchKey: "t998877" },
    ];
    const matches = matchPhotos(analysis.rows, images);
    assert.equal(matches.length, 2);
    const first = matches.find((m) => m.rowIndex === 0)!;
    assert.equal(first.images.length, 2);
    assert.equal(first.matchedBy, "serial");
  });
});
