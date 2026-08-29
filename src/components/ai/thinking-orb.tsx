"use client";

import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type ThinkingOrbProps = {
  size?: number;
  className?: string;
};

/**
 * Compact working mark for Core — same register as the mobile thinking orb.
 * Colour is the `--ai` tone token; motion lives in `ai-layer.css`.
 */
export function ThinkingOrb({ size = 22, className }: ThinkingOrbProps) {
  return (
    <span
      className={cn("core-orb", className)}
      style={{ width: size, height: size }}
      data-state="working"
      role="status"
      aria-label={userCopy.ai.tool.generic}
    >
      <span className="core-orb__body" />
      <span className="core-orb__sheen" />
    </span>
  );
}
