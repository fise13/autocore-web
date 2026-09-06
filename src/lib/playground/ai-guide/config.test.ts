import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AI_GUIDE_ACCOUNT_EMAIL,
  AI_GUIDE_COMPANY_ID,
  isAiGuideCompanyId,
  isAiGuideSession,
} from "@/lib/playground/ai-guide/config";

test("playground company is isolated from Live and Demo ids", () => {
  assert.equal(isAiGuideCompanyId(AI_GUIDE_COMPANY_ID), true);
  assert.equal(isAiGuideCompanyId("demo-autocore"), false);
  assert.equal(isAiGuideCompanyId("some-live-company"), false);
  assert.equal(isAiGuideSession({ companyId: "demo-autocore" }), false);
  assert.equal(isAiGuideSession({ email: "demo@autocore.app" }), false);
  assert.equal(isAiGuideSession({ companyId: AI_GUIDE_COMPANY_ID }), true);
  assert.equal(isAiGuideSession({ email: AI_GUIDE_ACCOUNT_EMAIL }), true);
});
