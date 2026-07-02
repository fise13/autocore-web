"use client";

import { useId, useMemo } from "react";

import { cn } from "@/lib/utils";

type KeynoteSyncBeamProps = {
  progress: number;
  active: boolean;
  className?: string;
};

function pointOnQuadraticBezier(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/** Purpose-driven sync pulse from iPhone to MacBook in unified desk composition. */
export function KeynoteSyncBeam({ progress, active, className }: KeynoteSyncBeamProps) {
  const gradientId = useId();
  const glowId = useId();

  const geometry = useMemo(
    () => ({
      path: "M 18 72 Q 42 38 68 48",
      p0: { x: 18, y: 72 },
      p1: { x: 42, y: 38 },
      p2: { x: 68, y: 48 },
    }),
    [],
  );

  const t = Math.min(1, Math.max(0, progress));
  const dot = pointOnQuadraticBezier(t, geometry.p0, geometry.p1, geometry.p2);
  const trailStart = pointOnQuadraticBezier(Math.max(0, t - 0.08), geometry.p0, geometry.p1, geometry.p2);

  if (!active || t <= 0) return null;

  return (
    <svg
      className={cn("keynote-sync-beam", className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
          <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d={geometry.path}
        className="keynote-sync-beam-path"
        pathLength={1}
        stroke={`url(#${gradientId})`}
        strokeDasharray="1"
        strokeDashoffset={1 - t}
      />
      <line
        x1={trailStart.x}
        y1={trailStart.y}
        x2={dot.x}
        y2={dot.y}
        className="keynote-sync-beam-trail"
      />
      <circle cx={dot.x} cy={dot.y} r="1.4" className="keynote-sync-beam-dot" />
      <circle cx={dot.x} cy={dot.y} r="3.2" fill={`url(#${glowId})`} opacity="0.55" />
    </svg>
  );
}
