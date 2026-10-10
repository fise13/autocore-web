import assert from "node:assert/strict";
import { test } from "node:test";

import { deskToken, isMotorLandDesk, isValidDeskCookie, isValidDeskLogin } from "./desk-login";

const USER = "motorland@myautocore.com";
const PASSWORD = "secret";

test("the desk login accepts only the configured pair", async () => {
  assert.equal(await isValidDeskLogin(USER, PASSWORD, USER, PASSWORD), true);
  assert.equal(await isValidDeskLogin(" MotorLand@MyAutoCore.com ", PASSWORD, USER, PASSWORD), true);
  assert.equal(await isValidDeskLogin(USER, "wrong", USER, PASSWORD), false);
  assert.equal(await isValidDeskLogin(USER, "SECRET", USER, PASSWORD), false);
  // Unconfigured means locked, even for an empty login.
  assert.equal(await isValidDeskLogin("", "", undefined, undefined), false);
});

test("the cookie is tied to the current password", async () => {
  const cookie = (await deskToken(USER, PASSWORD))!;
  assert.equal(await isValidDeskCookie(cookie, USER, PASSWORD), true);
  assert.equal(await isValidDeskCookie(cookie, USER, "changed"), false);
  assert.equal(await isValidDeskCookie(undefined, USER, PASSWORD), false);
  assert.equal(await isValidDeskCookie(undefined, undefined, undefined), false);
});

test("the desk is gated everywhere except its sign-in", () => {
  assert.equal(isMotorLandDesk("docs.myautocore.com", "/"), true);
  assert.equal(isMotorLandDesk("docs.myautocore.com", "/manifest.webmanifest"), true);
  assert.equal(isMotorLandDesk("app.myautocore.com", "/docs/motor-sale"), true);
  assert.equal(isMotorLandDesk("app.myautocore.com", "/api/motor-land/documents"), true);
  assert.equal(isMotorLandDesk("docs.myautocore.com", "/login"), false);
  assert.equal(isMotorLandDesk("docs.myautocore.com", "/api/motor-land/login"), false);
  assert.equal(isMotorLandDesk("app.myautocore.com", "/dashboard"), false);
});
