import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
    assert.equal(
      shouldShowDocumentImportTopBarIsland({ ...base, pathname: "/warehouse" }),
      false,
    );
  });

  it("shows on warehouse empty space", () => {
    assert.equal(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/warehouse",
        allowOnDenseChrome: true,
      }),
      true,
    );
  });

  it("hides on motors unless empty", () => {
    assert.equal(
      shouldShowDocumentImportTopBarIsland({ ...base, pathname: "/motors" }),
      false,
    );
    assert.equal(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/motors",
        allowOnDenseChrome: true,
      }),
      true,
    );
  });

  it("shows on spacious routes", () => {
    assert.equal(
      shouldShowDocumentImportTopBarIsland({ ...base, pathname: "/" }),
      true,
    );
    assert.equal(
      shouldShowDocumentImportTopBarIsland({ ...base, pathname: "/work-orders" }),
      true,
    );
  });

  it("hides while magic import or review is active", () => {
    assert.equal(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/",
        magicImportActive: true,
      }),
      false,
    );
    assert.equal(
      shouldShowDocumentImportTopBarIsland({
        ...base,
        pathname: "/",
        motorImportReviewActive: true,
      }),
      false,
    );
  });

  it("hides on import review routes", () => {
    assert.equal(
      shouldShowDocumentImportTopBarIsland({ ...base, pathname: "/imports/abc" }),
      false,
    );
  });
});

describe("isDenseInventoryChromeRoute", () => {
  it("marks warehouse motors sold", () => {
    assert.equal(isDenseInventoryChromeRoute("/warehouse"), true);
    assert.equal(isDenseInventoryChromeRoute("/motors"), true);
    assert.equal(isDenseInventoryChromeRoute("/sold"), true);
    assert.equal(isDenseInventoryChromeRoute("/"), false);
  });
});
