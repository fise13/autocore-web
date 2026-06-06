"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import Link from "next/link";
import { useMemo, useRef } from "react";

import {
  getGraphEdges,
  getGraphWidth,
  siteContent,
  type KnowledgeNode,
} from "@/components/marketing/content/site-content";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { cn } from "@/lib/utils";

const copy = siteContent.graph;
const nodes = copy.nodes;
const trackWidth = getGraphWidth(nodes);

function edgePath(from: KnowledgeNode, to: KnowledgeNode) {
  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  const cx = x1 + (x2 - x1) * 0.55;
  const cy = y1 + (y2 - y1) * 0.35;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function GraphNodeCard({ node }: { node: KnowledgeNode }) {
  return (
    <div
      data-graph-node
      data-node-id={node.id}
      className="graph-node"
      style={{ left: node.x, top: node.y }}
    >
      <div className="graph-node-inner">
        <div className={cn("graph-node-dot", node.kind === "origin" && "graph-node-dot-origin")} />
        <div
          className={cn(
            "graph-node-card",
            node.kind === "origin" && "graph-node-card-origin",
            node.kind === "hub" && "graph-node-card-hub",
          )}
        >
          {node.tag ? <span className="graph-node-tag">{node.tag}</span> : null}
          <p className="graph-node-q">{node.question}</p>
          <p className="graph-node-a">{node.answer}</p>
          {node.href ? (
            <Link href={node.href} className="graph-node-link">
              {node.hrefLabel ?? "Подробнее"} →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function KnowledgeGraphSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = usePrefersReducedMotion();

  const edges = useMemo(() => getGraphEdges(nodes), []);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const track = trackRef.current;
      const svg = svgRef.current;
      if (!section || !track) return;

      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 48);

      if (reduced) {
        gsap.set(track, { x: 0 });
        section.classList.add("graph-section-reduced");
        return;
      }

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      const paths = svg?.querySelectorAll<SVGPathElement>(".graph-edge");
      paths?.forEach((path, i) => {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(path, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: () => `top top+=${(i / (paths.length || 1)) * distance() * 0.85}`,
            end: () => `top top+=${((i + 0.6) / (paths.length || 1)) * distance() * 0.85}`,
            scrub: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-graph-node]").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          scale: 0.92,
          duration: 0.35,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: () => `top top+=${(i / 20) * distance() * 0.7}`,
            toggleActions: "play none none reverse",
          },
        });
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: sectionRef, dependencies: [reduced] },
  );

  return (
    <section ref={sectionRef} id="graph" className="graph-section">
      <div className="stripe-container graph-section-head">
        <p className="stripe-eyebrow">{copy.label}</p>
        <h2 className="stripe-h2">{copy.title}</h2>
        <p className="stripe-lead max-w-2xl">{copy.description}</p>
        <p className="graph-scroll-hint mt-6">{copy.scroll}</p>
      </div>

      <div className="graph-viewport">
        <div
          ref={trackRef}
          className="graph-track"
          style={{ width: trackWidth, height: 640 }}
        >
          <div className="graph-origin-bloom" aria-hidden />

          <svg
            ref={svgRef}
            className="graph-svg"
            width={trackWidth}
            height={640}
            aria-hidden
          >
            <defs>
              <linearGradient id="graph-edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {edges.map(({ from, to }) => (
              <path
                key={`${from.id}-${to.id}`}
                d={edgePath(from, to)}
                className="graph-edge"
                fill="none"
                stroke="url(#graph-edge-gradient)"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            ))}
          </svg>

          {nodes.map((node) => (
            <GraphNodeCard key={node.id} node={node} />
          ))}
        </div>
      </div>
    </section>
  );
}
