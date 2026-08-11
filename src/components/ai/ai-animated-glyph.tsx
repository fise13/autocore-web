"use client";

import type { AssistantState } from "@/domain/ai/assistant-state";
import { cn } from "@/lib/utils";

type AIAnimatedGlyphProps = {
  state?: AssistantState;
  /** Rendered size in px. 16 in the sidebar, 22 in the workspace header. */
  size?: number;
  className?: string;
};

/**
 * The AutoCore intelligence mark.
 *
 * A machined bore: a segmented outer ring around a rounded square insert, with
 * a core node that only lights up while work is happening. Abstract on purpose
 * — no face, no sparkle, no orb. All motion is CSS on transform/opacity
 * (`src/styles/ai-layer.css`), driven by `data-state`, so there is no JS
 * animation loop and the compositor does the work.
 */
export function AIAnimatedGlyph({
  state = "idle",
  size = 16,
  className,
}: AIAnimatedGlyphProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      focusable="false"
      data-state={state}
      className={cn("ai-glyph", className)}
    >
      <circle
        className="ai-glyph__ring"
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeDasharray="5.8 3.62"
      />
      <rect
        className="ai-glyph__core"
        x="4.8"
        y="4.8"
        width="6.4"
        height="6.4"
        rx="1.7"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <circle className="ai-glyph__pulse" cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}
