import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRowMediaViewerHref,
  filenameFromMediaUrl,
  storagePathFromFirebaseMediaUrl,
} from "@/lib/grid/row-media-viewer";

describe("row-media-viewer helpers", () => {
  it("parses firebase download URLs", () => {
    const url =
      "https://firebasestorage.googleapis.com/v0/b/bucket/o/companies%2Fc1%2Frow-photos%2Fmotor%2Fm1%2Fa.jpg?alt=media&token=t";
    assert.equal(storagePathFromFirebaseMediaUrl(url), "companies/c1/row-photos/motor/m1/a.jpg");
    assert.equal(filenameFromMediaUrl(url, 0), "a.jpg");
  });

  it("builds viewer href", () => {
    assert.equal(buildRowMediaViewerHref({ entityKind: "motor", entityId: "abc" }), "/media/motor/abc");
    assert.equal(
      buildRowMediaViewerHref({ entityKind: "warehouse", entityId: "x", index: 2 }),
      "/media/warehouse/x?i=2",
    );
  });
});
