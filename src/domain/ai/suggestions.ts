/**
 * A prompt chip on the Core empty state.
 *
 * `hint` is the live number that justified the chip — what turns a generic
 * "What needs attention?" into "8 parts below reorder point". Chips are only
 * produced for data the caller is allowed to read.
 *
 * Lives outside the server module so client components can type the response
 * without importing `server-only` code.
 */
export type CoreSuggestion = {
  /** Sent verbatim when the chip is tapped. */
  prompt: string;
  /** Chip text. */
  label: string;
  /** Live figure behind the chip. */
  hint?: string;
  tone?: "default" | "attention";
};
