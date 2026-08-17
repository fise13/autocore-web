import { NextResponse, type NextRequest } from "next/server";
import { convertToModelMessages, smoothStream, stepCountIs, streamText, validateUIMessages } from "ai";
import { z } from "zod";

import { coreToolTypes } from "@/domain/ai/tool-schemas";
import { coreLanguageModel, isCoreConfigured } from "@/infrastructure/openrouter/core-model.server";
import { resolveAssistantContext } from "@/lib/ai/assistant-context";
import { buildCoreSystemPrompt } from "@/lib/ai/core-system-prompt";
import { streamErrorMessage } from "@/lib/ai/stream-error-message";
import { buildCoreTools } from "@/lib/ai/tools";
import {
  MobileAccessError,
  verifyMobileAccess,
} from "@/lib/auth/verify-mobile-access.server";
import { INVENTORY_COLLECTIONS } from "@/lib/navigation/inventory-collections";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit/rate-limit.server";
import { userCopy } from "@/lib/user-copy";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Bounded so a tampered client cannot replay an unbounded history. */
const MAX_MESSAGES = 80;
/** Search → write → navigate chains need more than a single look. */
const MAX_STEPS = 10;

const requestSchema = z.object({
  messages: z.array(z.unknown()).min(1).max(MAX_MESSAGES),
  context: z.object({
    pathname: z.string().trim().min(1).max(300),
    collection: z.enum(INVENTORY_COLLECTIONS).optional(),
    brandName: z.string().trim().max(120).nullable().optional(),
    selectionLabel: z.string().trim().max(160).nullable().optional(),
  }),
});

/**
 * `MobileAccessError` carries Russian operator copy; the product UI is
 * English-locked (`UI_LOCALE_LOCK`), so status is mapped to product copy rather
 * than forwarding the raw message.
 */
function accessErrorBody(error: MobileAccessError): { error: string; status: number } {
  if (error.status === 401) return { error: userCopy.ai.errorUnauthorized, status: 401 };
  if (error.status === 403) return { error: userCopy.ai.errorForbidden, status: 403 };
  return { error: userCopy.ai.errorGeneric, status: error.status };
}

export async function POST(request: NextRequest) {
  let access;
  try {
    access = await verifyMobileAccess(request);
  } catch (error) {
    if (error instanceof MobileAccessError) {
      const body = accessErrorBody(error);
      return NextResponse.json({ error: body.error }, { status: body.status });
    }
    console.error("[assistant:auth]", error);
    return NextResponse.json({ error: userCopy.ai.errorGeneric }, { status: 401 });
  }

  if (!isCoreConfigured()) {
    return NextResponse.json({ error: userCopy.ai.errorUnavailable }, { status: 503 });
  }

  // Each accepted request can run up to MAX_STEPS tool-calling rounds against a
  // billed model, so the spend ceiling per user has to live here.
  try {
    await enforceRateLimit({
      action: "assistant",
      subject: access.uid,
      limit: 30,
      windowMs: 5 * 60_000,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: userCopy.ai.errorRateLimited, retryAfterSec: error.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    throw error;
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: userCopy.ai.errorBadRequest }, { status: 400 });
  }

  // Message history is client-supplied and therefore untrusted: it round-trips
  // through localStorage. Validating against the tool schemas rejects tampered
  // or stale tool parts before they reach the model.
  let messages;
  try {
    messages = await validateUIMessages({
      messages: parsed.data.messages,
      tools: coreToolTypes,
    });
  } catch (error) {
    console.error("[assistant:messages]", error);
    return NextResponse.json({ error: userCopy.ai.errorBadRequest }, { status: 400 });
  }

  const context = resolveAssistantContext(parsed.data.context);

  const result = streamText({
    model: coreLanguageModel().model,
    system: buildCoreSystemPrompt(context),
    messages: await convertToModelMessages(messages),
    tools: buildCoreTools({
      uid: access.uid,
      companyId: access.companyId,
      profile: access.profile,
      scopes: access.scopes,
    }),
    stopWhen: stepCountIs(MAX_STEPS),
    // Brief upstream 502 / capacity blips should not abort a whole agent turn.
    maxRetries: 2,
    // Word-level chunking is what makes text arrive progressively even on the
    // buffered gen-1 proxy lane, where `simulateStreamingMiddleware` replays a
    // completed response.
    experimental_transform: smoothStream({ chunking: "word" }),
    abortSignal: request.signal,
    onError({ error }) {
      console.error("[assistant:stream]", error);
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    onError: streamErrorMessage,
  });
}
