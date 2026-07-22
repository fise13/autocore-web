import { describe, expect, it } from "vitest";

import {
  isDenseInventoryChromeRoute,
  shouldShowDocumentImportTopBarIsland,
} from "./top-bar-island-visibility";

describe("shouldShowDocumentImportTopBarIsland", () => {
  const base = {
    canView: true,
    magicImportActive: false,
    motorImportReviewActive: false,
    allowOnDenseChrome: false,
  };

  it("hides on warehouse when chrome is dense", () => {
    expect(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/warehouse",
      }),
    ).toBe(false);
  });

  it("shows on warehouse empty space", () => {
    expect(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/warehouse",
        allowOnDenseChrome: true,
      }),
    ).toBe(true);
  });

  it("hides on motors unless empty", () => {
    expect(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/motors",
      }),
    ).toBe(false);
    expect(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/motors",
        allowOnDenseChrome: true,
      }),
    ).toBe(true);
  });

  it("shows on spacious routes", () => {
    expect(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/",
      }),
    ).toBe(true);
    expect(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/work-orders",
      }),
    ).toBe(true);
  });

  it("hides while magic import or review is active", () => {
    expect(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/",
        magicImportActive: true,
      }),
    ).toBe(false);
    expect(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/",
        motorImportReviewActive: true,
      }),
    ).toBe(false);
  });

  it("hides on import review routes", () => {
    expect(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/imports/abc",
      }),
    ).toBe(false);
  });
});

describe("isDenseInventoryChromeRoute", () => {
  it("marks warehouse motors sold", () => {
    expect(isDenseInventoryChromeRoute("/warehouse")).toBe(true);
    expect(isDenseInventoryChromeRoute("/motors")).toBe(true);
    expect(isDenseInventoryChromeRoute("/sold")).toBe(true);
    expect(isDenseInventoryChromeRoute("/")).toBe(false);
  });
});
