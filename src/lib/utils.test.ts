import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("keeps custom font sizes next to text colours", () => {
    assert.equal(cn("text-micro text-muted-foreground"), "text-micro text-muted-foreground");
    assert.equal(cn("text-grid", "text-foreground"), "text-grid text-foreground");
  });

  it("resolves conflicts within the custom scales", () => {
    assert.equal(cn("text-sm", "text-micro"), "text-micro");
    assert.equal(cn("shadow-popover", "shadow-sm"), "shadow-sm");
  });
});
