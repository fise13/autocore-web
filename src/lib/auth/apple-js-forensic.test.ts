import assert from "node:assert/strict";
import test from "node:test";

import { safeAppleSdkJson } from "./apple-js-forensic";

test("redacts Apple credentials from forensic payloads", () => {
  const serialized = safeAppleSdkJson({
    authorization: {
      id_token: "header.payload.signature",
      code: "authorization-code-with-sensitive-entropy",
      state: "non-secret-state",
    },
    nonce: "sensitive-nonce",
  });

  assert.doesNotMatch(serialized, /header\.payload\.signature/);
  assert.doesNotMatch(serialized, /authorization-code-with-sensitive-entropy/);
  assert.doesNotMatch(serialized, /sensitive-nonce/);
  assert.match(serialized, /non-secret-state/);
});
