import assert from "node:assert/strict";
import { test } from "node:test";

import { isMotorLandDesk, isValidDeskLogin } from "./desk-login";

const basic = (value: string) => `Basic ${btoa(value)}`;

test("the desk login accepts only the configured pair", async () => {
  const user = "motorland@myautocore.com";
  const password = "secret";

  assert.equal(await isValidDeskLogin(basic(`${user}:${password}`), user, password), true);
  assert.equal(await isValidDeskLogin(basic(`${user}:wrong`), user, password), false);
  assert.equal(await isValidDeskLogin(null, user, password), false);
  assert.equal(await isValidDeskLogin("Basic %%%", user, password), false);
  // Unconfigured means locked, even for an empty login.
  assert.equal(await isValidDeskLogin(basic(":"), undefined, undefined), false);
});

test("the page, its API and the whole docs host are gated", () => {
  assert.equal(isMotorLandDesk("docs.myautocore.com", "/"), true);
  assert.equal(isMotorLandDesk("app.myautocore.com", "/docs/motor-sale"), true);
  assert.equal(isMotorLandDesk("app.myautocore.com", "/api/motor-land/documents"), true);
  assert.equal(isMotorLandDesk("app.myautocore.com", "/dashboard"), false);
});
