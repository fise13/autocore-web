"use client";

import { ThinkingOrb as LibraryOrb, type OrbSize, type OrbState } from "thinking-orbs";
import { useReducedMotion } from "motion/react";

import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

export type CoreOrbState = OrbState | "idle";

type ThinkingOrbProps = {
  size?: number;
  className?: string;
  state?: CoreOrbState;
  speed?: number;
  paused?: boolean;
  /** Hide from assistive tech when another orb already announces work. */
  decorative?: boolean;
};

function tunedSize(size: number): OrbSize {
  return size >= 40 ? 64 : 20;
}

function libraryState(state: CoreOrbState): OrbState {
  return state === "idle" ? "breathing" : state;
}

/**
 * Core’s orb — Libraries.dev thinking-orbs, sized to the two shipped presets.
 */
export function ThinkingOrb({
  size = 20,
  className,
  state = "working",
  speed = 1,
  paused = false,
  decorative = false,
}: ThinkingOrbProps) {
  const reduceMotion = useReducedMotion();
  const announce = state === "working" && !decorative;
  const freeze = paused || Boolean(reduceMotion);

  return (
    <LibraryOrb
      className={cn("block shrink-0", className)}
      state={libraryState(state)}
      size={tunedSize(size)}
      speed={state === "idle" ? 0.65 * speed : speed}
      paused={freeze}
      theme="auto"
      aria-label={announce ? userCopy.ai.tool.generic : undefined}
      aria-hidden={decorative || !announce}
    />
  );
}
