import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildGridLayoutMetrics } from "@/lib/grid/grid-layout-engine";
import {
  createEmptyRow,
  hasSaveableContent,
  rowFieldValueByModelField,
} from "@/lib/grid/grid-data-store";
import { buildWarehouseGridLayoutMetrics } from "@/lib/warehouse/warehouse-grid-layout-engine";
import { buildSpecificMotorGridLayout } from "@/lib/specific/specific-grid-layout";
import { createDefaultColumnSchema } from "@/lib/specific/specific-category-schema";
import {
  applySpecificCellValue,
  createEmptySpecificRow,
  specificCellValue,
} from "@/lib/specific/specific-grid-data-store";
import {
  parseSpecificPhotoUrls,
  serializeSpecificPhotoUrls,
  SPECIFIC_PHOTO_URLS_KEY,
  SPECIFIC_QUALITY_KEY,
} from "@/lib/specific/specific-photo-quality";
import { buildSpecificHeaderMapping } from "@/lib/specific/specific-header-mapping";
import {
  assertRowMediaCount,
  assertRowPhotoUpload,
  isVideoMediaUrl,
  MAX_ROW_MEDIA_ITEMS,
} from "@/lib/grid/upload-row-photo-utils";

describe("grid photo and quality columns", () => {
  it("motors layout includes quality and photo columns", () => {
    const layout = buildGridLayoutMetrics(1);
    const quality = layout.columns.find((column) => column.id === "quality");
    const photo = layout.columns.find((column) => column.id === "photo");
    assert.ok(quality);
    assert.equal(quality?.modelField, "quality");
    assert.equal(quality?.editable, true);
    assert.ok(photo);
    assert.equal(photo?.cellKind, "photo");
    assert.equal(photo?.editable, false);
  });

  it("motors data-store reads quality and photoUrls", () => {
    const row = {
      ...createEmptyRow("company"),
      quality: "A",
      photoUrls: ["https://example.com/a.jpg"],
    };
    assert.equal(rowFieldValueByModelField(row, "quality"), "A");
    assert.equal(rowFieldValueByModelField(row, "photoUrls"), "https://example.com/a.jpg");
    assert.equal(hasSaveableContent(row), true);
  });

  it("warehouse layout includes notes, quality, and photo", () => {
    const layout = buildWarehouseGridLayoutMetrics(1);
    const notes = layout.columns.find((column) => column.modelField === "notes");
    const quality = layout.columns.find((column) => column.modelField === "quality");
    const photo = layout.columns.find((column) => column.cellKind === "photo");
    assert.ok(notes?.editable);
    assert.ok(quality?.editable);
    assert.ok(photo);
    assert.equal(photo?.modelField, "imageUrls");
  });

  it("specific layout injects quality and photo after schema columns", () => {
    const schema = createDefaultColumnSchema();
    const layout = buildSpecificMotorGridLayout(schema, 1);
    assert.equal(layout.qualityColumn, schema.length + 1);
    assert.equal(layout.photoColumn, schema.length + 2);
    assert.equal(layout.columns[layout.qualityColumn]?.modelField, SPECIFIC_QUALITY_KEY);
    assert.equal(layout.columns[layout.photoColumn]?.cellKind, "photo");
  });

  it("specific data-store get/set quality and serializes photo urls", () => {
    const schema = createDefaultColumnSchema();
    const mapping = buildSpecificHeaderMapping([]);
    let row = createEmptySpecificRow(1);
    row = applySpecificCellValue(row, schema.length + 1, "refurbished", mapping, schema);
    assert.equal(specificCellValue(row, schema.length + 1, mapping, schema), "refurbished");
    assert.equal(row.data[SPECIFIC_QUALITY_KEY], "refurbished");

    const urls = ["https://example.com/1.jpg", "https://example.com/2.jpg"];
    row = {
      ...row,
      data: {
        ...row.data,
        [SPECIFIC_PHOTO_URLS_KEY]: serializeSpecificPhotoUrls(urls),
      },
    };
    assert.deepEqual(parseSpecificPhotoUrls(row.data[SPECIFIC_PHOTO_URLS_KEY]), urls);
  });

  it("accepts videos and detects video URLs", () => {
    const video = assertRowPhotoUpload({
      size: 12 * 1024 * 1024,
      type: "video/mp4",
      name: "clip.mp4",
    });
    assert.equal(video.kind, "video");
    assert.equal(video.extension, "mp4");
    assert.equal(isVideoMediaUrl("https://cdn.example.com/a/clip.mp4?alt=media"), true);
    assert.equal(isVideoMediaUrl("https://cdn.example.com/a/shot.jpg"), false);
  });

  it("caps media count per row", () => {
    assert.doesNotThrow(() => assertRowMediaCount(MAX_ROW_MEDIA_ITEMS - 2, 2));
    assert.throws(() => assertRowMediaCount(MAX_ROW_MEDIA_ITEMS - 1, 2));
  });
});
