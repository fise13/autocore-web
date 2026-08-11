import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { providerErrorText, streamErrorMessage } from "@/lib/ai/stream-error-message";
import { userCopy } from "@/lib/user-copy";

describe("providerErrorText", () => {
  it("reads Error.message and nested cause", () => {
    const err = new Error("outer");
    (err as Error & { cause: unknown }).cause = { message: "inner capacity" };
    assert.match(providerErrorText(err), /outer/);
    assert.match(providerErrorText(err), /inner capacity/);
  });

  it("reads plain OpenRouter-style objects", () => {
    const text = providerErrorText({
      code: 502,
      message: "Upstream error from Nvidia: ResourceExhausted: Worker local total request limit reached (32/32)",
      metadata: { error_type: "provider_unavailable" },
    });
    assert.match(text, /ResourceExhausted/);
    assert.match(text, /502/);
    assert.match(text, /provider_unavailable/);
  });
});

describe("streamErrorMessage", () => {
  it("maps capacity / provider_unavailable objects to errorBusy", () => {
    assert.equal(
      streamErrorMessage({
        code: 502,
        message: "Upstream error from Nvidia: ResourceExhausted: Worker local total request limit reached (32/32)",
        metadata: { error_type: "provider_unavailable" },
      }),
      userCopy.ai.errorBusy,
    );
  });

  it("maps rate limits and timeouts", () => {
    assert.equal(streamErrorMessage(new Error("429 too many requests")), userCopy.ai.errorBusy);
    assert.equal(streamErrorMessage(new Error("request aborted")), userCopy.ai.errorTimeout);
  });

  it("falls back to generic for unknown shapes", () => {
    assert.equal(streamErrorMessage(new Error("weird provider glitch")), userCopy.ai.errorGeneric);
  });
});
