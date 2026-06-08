"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";

const NODES = [
  { id: "intake", label: "Поступление", x: 12, y: 18 },
  { id: "warehouse", label: "Склад", x: 38, y: 42 },
  { id: "order", label: "Наряд", x: 62, y: 28 },
  { id: "warranty", label: "Гарантия", x: 82, y: 52 },
  { id: "history", label: "История", x: 88, y: 78 },
] as const;

const EDGES = [
  ["intake", "warehouse"],
  ["warehouse", "order"],
  ["order", "warranty"],
  ["warranty", "history"],
] as const;

export function LandingHeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || reduced) return;

      gsap.fromTo(
        "[data-flow-node]",
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: 0.6, stagger: 0.12, ease: "power2.out", delay: 0.5 },
      );

      gsap.fromTo(
        "[data-flow-edge]",
        { strokeDashoffset: 40, opacity: 0 },
        { strokeDashoffset: 0, opacity: 0.5, duration: 0.8, stagger: 0.15, ease: "power2.out", delay: 0.7 },
      );

      gsap.to("[data-flow-pulse]", {
        opacity: 0.9,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <div ref={ref} className="landing-flow-visual" aria-hidden>
      <div className="landing-flow-visual-grid" />
      <svg viewBox="0 0 100 100" className="landing-flow-svg" preserveAspectRatio="xMidYMid meet">
        {EDGES.map(([from, to]) => {
          const a = nodeMap[from];
          const b = nodeMap[to];
          return (
            <line
              key={`${from}-${to}`}
              data-flow-edge
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              strokeWidth="0.35"
              strokeDasharray="4 2"
              className="text-primary/40"
            />
          );
        })}
        {NODES.map((node) => (
          <g key={node.id} data-flow-node transform={`translate(${node.x}, ${node.y})`}>
            <circle r="3.2" className="fill-primary/20 stroke-primary/60" strokeWidth="0.4" />
            <circle r="1.2" className="fill-primary" data-flow-pulse />
            <text
              y="6.5"
              textAnchor="middle"
              className="fill-muted-foreground text-[2.8px] font-medium"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="landing-flow-card">
        <div className="landing-flow-card-header">
          <span className="landing-flow-card-dot bg-emerald-500" />
          <span className="text-xs text-muted-foreground">G4KC-88421 · realtime</span>
        </div>
        <p className="mt-3 text-sm font-medium">Hyundai G4KC 2.4 MPI</p>
        <p className="mt-1 text-xs text-muted-foreground">Склад A-12 → НЗ-2026-0142 → Гарантия</p>
        <div className="landing-flow-card-track mt-4">
          <div className="landing-flow-card-progress" />
        </div>
      </div>
    </div>
  );
}
