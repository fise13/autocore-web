import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyDensityToColumns,
  densityForContainerWidth,
  fitColumnWidths,
} from "@/lib/grid/grid-density";
import { buildGridLayoutMetrics } from "@/lib/grid/grid-layout-engine";
import { MOTOR_GRID_COLUMN_WIDTHS } from "@/lib/motor-grid-layout";

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
        { flex: 0, maxWidth: 40 },
        { flex: 1, maxWidth: 140 },
        { flex: 0, maxWidth: 64 },
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

  it("absorbs nothing on ultrawide even when container is huge", () => {
    const layout = buildGridLayoutMetrics(1, { containerWidth: 3200 });
    assert.equal(layout.density.band, "ultrawide");
    const quantity = layout.columns.find((column) => column.id === "quantity");
    assert.equal(quantity?.width, MOTOR_GRID_COLUMN_WIDTHS.quantity);
    const notes = layout.columns.find((column) => column.id === "notes");
    assert.equal(notes?.width, MOTOR_GRID_COLUMN_WIDTHS.notes);
    assert.ok(layout.totalWidth < 3200);
  });

  it("closes a small leftover gap on cozy widths without blowing past caps", () => {
    const base = buildGridLayoutMetrics(1, { containerWidth: 0 });
    const target = base.totalWidth + 80;
    const fitted = buildGridLayoutMetrics(1, { containerWidth: target });
    assert.equal(fitted.density.band, "cozy");
    assert.ok(fitted.totalWidth >= base.totalWidth);
    assert.ok(fitted.totalWidth <= target);
    const quantity = fitted.columns.find((column) => column.id === "quantity");
    assert.equal(quantity?.width, MOTOR_GRID_COLUMN_WIDTHS.quantity);
  });

  it("compacts slightly on narrow containers", () => {
    const layout = buildGridLayoutMetrics(1, { containerWidth: 980 });
    assert.equal(layout.density.band, "compact");
    assert.ok(layout.density.scale < 1);
    assert.ok(layout.rowHeight < 30);
  });

  it("applyDensityToColumns keeps row metrics consistent", () => {
    const result = applyDensityToColumns({
      columns: [
        { width: 40, fit: { flex: 0, maxWidth: 40 } },
        { width: 120, fit: { flex: 1, maxWidth: 160 } },
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
});
