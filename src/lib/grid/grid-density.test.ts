import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyDensityToColumns,
  densityForContainerWidth,
  fitColumnWidths,
} from "@/lib/grid/grid-density";
import { buildGridLayoutMetrics } from "@/lib/grid/grid-layout-engine";
import { MOTOR_GRID_COLUMN_WIDTHS } from "@/lib/motor-grid-layout";

function columnWidth(layout: ReturnType<typeof buildGridLayoutMetrics>, id: string) {
  return layout.columns.find((column) => column.id === id)?.width ?? 0;
}

describe("grid density", () => {
  it("maps container widths to density bands", () => {
    assert.equal(densityForContainerWidth(900).band, "compact");
    assert.equal(densityForContainerWidth(1400).band, "cozy");
    assert.equal(densityForContainerWidth(1800).band, "wide");
    assert.equal(densityForContainerWidth(2400).band, "ultrawide");
    assert.equal(densityForContainerWidth(2400).maxAbsorbPx, 0);
  });

  it("never grows fixed columns and respects max caps", () => {
    const fitted = fitColumnWidths({
      baseWidths: [40, 100, 64],
      hints: [
        { flex: 0, maxWidth: 40, role: "fixed" },
        { flex: 1, maxWidth: 140, role: "semi" },
        { flex: 0, maxWidth: 64, role: "fixed" },
      ],
      containerWidth: 400,
      maxAbsorbPx: 120,
    });
    assert.equal(fitted[0], 40);
    assert.equal(fitted[2], 64);
    assert.ok(fitted[1] <= 140);
    assert.ok(fitted[1] > 100);
    assert.equal(
      fitted.reduce((sum, width) => sum + width, 0),
      40 + fitted[1] + 64,
    );
  });

  it("fills the engine grid at 1920 using configuration and notes", () => {
    const layout = buildGridLayoutMetrics(1, { containerWidth: 1920 });
    assert.equal(layout.totalWidth, 1920);
    assert.ok(columnWidth(layout, "quantity") <= MOTOR_GRID_COLUMN_WIDTHS.quantity);
    assert.ok(columnWidth(layout, "quality") <= MOTOR_GRID_COLUMN_WIDTHS.quality + 4);
    assert.equal(columnWidth(layout, "brandName"), MOTOR_GRID_COLUMN_WIDTHS.brandName);
    assert.ok(columnWidth(layout, "action") <= 104);
    assert.ok(columnWidth(layout, "configuration") > MOTOR_GRID_COLUMN_WIDTHS.configuration);
    assert.ok(columnWidth(layout, "notes") > MOTOR_GRID_COLUMN_WIDTHS.notes);
    assert.ok(columnWidth(layout, "notes") > columnWidth(layout, "configuration"));
  });

  it("fills ultrawide without inflating qty or brand", () => {
    const layout = buildGridLayoutMetrics(1, { containerWidth: 2560 });
    assert.equal(layout.density.band, "ultrawide");
    assert.equal(layout.totalWidth, 2560);
    assert.equal(columnWidth(layout, "quantity"), MOTOR_GRID_COLUMN_WIDTHS.quantity);
    assert.equal(columnWidth(layout, "brandName"), MOTOR_GRID_COLUMN_WIDTHS.brandName);
    assert.ok(columnWidth(layout, "notes") >= 500);
    assert.ok(columnWidth(layout, "configuration") >= 350);
  });

  it("keeps semantic minimums and allows horizontal scroll on a 1280 workspace", () => {
    const layout = buildGridLayoutMetrics(1, { containerWidth: 1280 });
    assert.ok(layout.totalWidth >= 1280);
    assert.ok(columnWidth(layout, "serialCode") >= 110);
    assert.ok(columnWidth(layout, "quantity") >= 52);
  });

  it("closes leftover on cozy widths without growing qty", () => {
    const base = buildGridLayoutMetrics(1, { containerWidth: 0 });
    const target = Math.max(base.totalWidth + 80, 1600);
    const fitted = buildGridLayoutMetrics(1, { containerWidth: target });
    assert.equal(fitted.density.band, "cozy");
    assert.equal(fitted.totalWidth, target);
    assert.equal(columnWidth(fitted, "quantity"), MOTOR_GRID_COLUMN_WIDTHS.quantity);
  });

  it("compacts slightly on narrow containers", () => {
    const layout = buildGridLayoutMetrics(1, { containerWidth: 980 });
    assert.equal(layout.density.band, "compact");
    assert.ok(layout.density.scale < 1);
    assert.ok(layout.rowHeight < 30);
  });

  it("applyDensityToColumns fills when a flex column exists", () => {
    const result = applyDensityToColumns({
      columns: [
        { width: 40, fit: { flex: 0, maxWidth: 40, role: "fixed" } },
        { width: 120, fit: { flex: 1, maxWidth: Number.POSITIVE_INFINITY, role: "flex" } },
      ],
      zoom: 1,
      containerWidth: 2500,
      scaleDimension: (base, zoom) => Math.round(base * zoom),
      baseRowHeight: 30,
      baseHeaderHeight: 28,
    });
    assert.equal(result.density.band, "ultrawide");
    assert.equal(result.widths[0], 40);
    assert.equal(result.totalWidth, 2500);
  });

  it("does not stretch non-flex grids on ultrawide", () => {
    const result = applyDensityToColumns({
      columns: [
        { width: 40, fit: { flex: 0, maxWidth: 40, role: "fixed" } },
        { width: 120, fit: { flex: 1, maxWidth: 160, role: "semi" } },
      ],
      zoom: 1,
      containerWidth: 2500,
      scaleDimension: (base, zoom) => Math.round(base * zoom),
      baseRowHeight: 30,
      baseHeaderHeight: 28,
    });
    assert.equal(result.density.band, "ultrawide");
    assert.equal(result.widths[0], 40);
    assert.equal(result.widths[1], 120);
    assert.equal(result.totalWidth, 160);
  });

  it("keeps user-resized columns locked while flex columns absorb leftover", () => {
    const layout = buildGridLayoutMetrics(1, {
      containerWidth: 1920,
      widthOverrides: { brandName: 90 },
    });
    assert.equal(layout.totalWidth, 1920);
    assert.equal(columnWidth(layout, "brandName"), 90);
    assert.ok(columnWidth(layout, "notes") > MOTOR_GRID_COLUMN_WIDTHS.notes);
  });
});
