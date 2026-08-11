import type { InferUITools, UIMessage } from "ai";

import { coreToolTypes } from "@/domain/ai/tool-schemas";

/**
 * The message shape Core streams and persists.
 *
 * `InferUITools` turns the type-only tool registry into typed part names —
 * `tool-searchEngines`, `tool-getFinanceSummary`, … — each carrying its own
 * `input` and `output`. That is what lets the renderer switch on a tool part
 * and get a fully typed payload without a cast, and it is why the schemas live
 * in a module free of `server-only`.
 */
export type CoreTools = InferUITools<typeof coreToolTypes>;

export type CoreMetadata = {
  /** Model id that produced the message — shown in diagnostics, not the UI. */
  model?: string;
  createdAt?: number;
};

/** No custom data parts yet; the slot exists so adding one is not a breaking change. */
export type CoreDataParts = Record<string, never>;

export type CoreUIMessage = UIMessage<CoreMetadata, CoreDataParts, CoreTools>;

export type CoreUIPart = CoreUIMessage["parts"][number];

/** Streaming states an AI SDK tool part moves through, in order. */
export type ToolPartState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";
