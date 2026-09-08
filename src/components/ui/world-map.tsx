"use client";

/**
 * Aceternity-style dotted world map. Continent dots are static SVGs
 * generated from design-token foreground colours so the client never
 * runs `dotted-map`. Theme is CSS-class driven (`html.dark`).
 */

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type MapPoint = {
  lat: number;
  lng: number;
  label?: string;
};

export type WorldMapDot = {
  start: MapPoint;
  end: MapPoint;
};

type WorldMapProps = {
  dots?: WorldMapDot[];
  lineColor?: string;
  className?: string;
};

function projectPoint(lat: number, lng: number) {
  return {
    x: (lng + 180) * (800 / 360),
    y: (90 - lat) * (400 / 180),
  };
}

function createCurvedPath(start: { x: number; y: number }, end: { x: number; y: number }) {
  const midX = (start.x + end.x) / 2;
  const midY = Math.min(start.y, end.y) - 50;
  return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
}

function WorldMap({ dots = [], lineColor, className }: WorldMapProps) {
  const gradientId = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const stroke = lineColor ?? "currentColor";

  return (
    <div className={cn("relative aspect-[2/1] w-full font-sans text-primary", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative theme-specific SVG assets */}
      <img
        src="/marketing/world-map-dark.svg?v=2"
        className="pointer-events-none hidden h-full w-full select-none dark:block"
        alt=""
        height={495}
        width={1056}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative theme-specific SVG assets */}
      <img
        src="/marketing/world-map-light.svg?v=2"
        className="pointer-events-none block h-full w-full select-none dark:hidden"
        alt=""
        height={495}
        width={1056}
        draggable={false}
      />
      <svg
        viewBox="0 0 800 400"
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={stroke} stopOpacity="0" />
            <stop offset="8%" stopColor={stroke} stopOpacity="0.38" />
            <stop offset="92%" stopColor={stroke} stopOpacity="0.38" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <motion.path
              key={`path-${i}`}
              d={createCurvedPath(startPoint, endPoint)}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="1"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: reduced ? 0 : 1,
                delay: reduced ? 0 : 0.5 * i,
                ease: "easeOut",
              }}
            />
          );
        })}

        {dots.map((dot, i) => {
          const start = projectPoint(dot.start.lat, dot.start.lng);
          const end = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`points-${i}`}>
              <MapPulse cx={start.x} cy={start.y} color={stroke} reduced={Boolean(reduced)} />
              <MapPulse cx={end.x} cy={end.y} color={stroke} reduced={Boolean(reduced)} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MapPulse({
  cx,
  cy,
  color,
  reduced,
}: {
  cx: number;
  cy: number;
  color: string;
  reduced: boolean;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="1.35" fill={color} opacity="0.28" />
      {reduced ? null : (
        <circle cx={cx} cy={cy} r="1.35" fill={color} opacity="0.12">
          <animate attributeName="r" from="1.35" to="5" dur="2.2s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.12" to="0" dur="2.2s" begin="0s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

export default WorldMap;
export { WorldMap };
