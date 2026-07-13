import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLocationEntityLink,
  isLocationEntityLink,
  parseLocationEntityLink,
} from "@/lib/warehouse/location-entity-link";

test("buildLocationEntityLink uses loc host and id", () => {
  assert.equal(buildLocationEntityLink("abc_123"), "autocore://loc/abc_123");
});

test("parseLocationEntityLink accepts loc and legacy shelf aliases", () => {
  assert.equal(parseLocationEntityLink("autocore://loc/xyz"), "xyz");
  assert.equal(parseLocationEntityLink("autocore://s/xyz"), "xyz");
  assert.equal(parseLocationEntityLink("autocore://m/xyz"), null);
  assert.equal(isLocationEntityLink("autocore://location/xyz"), true);
});
