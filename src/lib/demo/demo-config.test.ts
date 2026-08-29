import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEMO_ACCOUNT_EMAIL, DEMO_COMPANY_ID, isDemoAccountEmail, isDemoSession } from "./demo-config";

describe("demo-config", () => {
  it("recognizes the shared demo email case-insensitively", () => {
    assert.equal(isDemoAccountEmail(DEMO_ACCOUNT_EMAIL), true);
    assert.equal(isDemoAccountEmail(DEMO_ACCOUNT_EMAIL.toUpperCase()), true);
    assert.equal(isDemoAccountEmail("owner@example.com"), false);
    assert.equal(isDemoAccountEmail(null), false);
  });

  it("treats the demo company or demo email as a demo session", () => {
    assert.equal(isDemoSession({ companyId: DEMO_COMPANY_ID }), true);
    assert.equal(isDemoSession({ email: DEMO_ACCOUNT_EMAIL }), true);
    assert.equal(isDemoSession({ companyId: "other", email: "a@b.c" }), false);
  });
});
