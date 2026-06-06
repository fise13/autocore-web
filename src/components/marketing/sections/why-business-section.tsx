"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { cn } from "@/lib/utils";

const copy = landingCopy.whyBusiness;

function RailConnector() {
  return (
    <div className="site-rail-connector hidden shrink-0 md:flex" aria-hidden>
      <div className="site-rail-line" />
      <ArrowRight className="size-4 text-primary/50" />
    </div>
  );
}

type WhyBranch = {
  position: "top" | "bottom";
  title: string;
  body: string;
  link?: string;
  linkLabel?: string;
};

function BranchCard({ branch }: { branch: WhyBranch }) {
  return (
    <div
      data-branch
      className={cn(
        "site-branch-card w-[min(100%,260px)]",
        branch.position === "top" ? "site-branch-top" : "site-branch-bottom",
      )}
    >
      <p className="text-sm font-semibold text-foreground">{branch.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{branch.body}</p>
      {"link" in branch && branch.link ? (
        <Link href={branch.link} className="mt-2 inline-flex text-xs font-medium text-primary hover:underline">
          {branch.linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}

export function WhyBusinessSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track || reduced) return;

      const getScrollDistance = () => Math.max(0, track.scrollWidth - window.innerWidth + 48);

      const tween = gsap.to(track, {
        x: () => -getScrollDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getScrollDistance()}`,
          pin: true,
          scrub: 0.85,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      const branches = track.querySelectorAll("[data-branch]");
      const nodes = track.querySelectorAll("[data-rail-node]");

      branches.forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          scale: 0.92,
          duration: 0.45,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            containerAnimation: tween,
            start: "left 72%",
            toggleActions: "play none none reverse",
          },
        });
      });

      nodes.forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 16,
          duration: 0.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            containerAnimation: tween,
            start: "left 78%",
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
    <section id="why-business" ref={sectionRef} className="site-why-rail-section relative bg-muted/20">
      <div className="site-why-rail-intro mx-auto max-w-7xl px-5 pt-20 pb-10 md:px-8 md:pt-28">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{copy.label}</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">{copy.title}</h2>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{copy.description}</p>
        <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
          <span className="hidden md:inline">{copy.scrollHint}</span>
          <ArrowRight className="size-4 animate-pulse md:hidden" />
        </p>
      </div>

      <div className="site-why-rail-viewport flex h-[min(85vh,720px)] items-center overflow-hidden">
        <div ref={trackRef} className="site-why-rail-track flex items-center gap-0 pl-6 md:pl-[max(1.5rem,8vw)]">
          {copy.nodes.map((node, index) => (
            <div key={node.id} className="flex items-center">
              <div
                data-rail-node
                className={cn(
                  "site-rail-node-group flex shrink-0 flex-col items-center px-2",
                  node.kind === "hub" && "site-rail-node-hub",
                )}
              >
                {"branches" in node && node.branches?.length ? (
                  <div className="mb-3 flex w-full flex-col items-stretch gap-3">
                    {node.branches
                      .filter((b) => b.position === "top")
                      .map((b) => (
                        <BranchCard key={b.title} branch={b} />
                      ))}
                  </div>
                ) : null}

                <article
                  className={cn(
                    "site-rail-node w-[min(88vw,300px)] md:w-[320px]",
                    node.kind === "start" && "site-rail-node-start",
                    node.kind === "end" && "site-rail-node-end",
                    node.kind === "hub" && "site-rail-node-hub-main",
                  )}
                >
                  <span className="site-rail-node-kind">{node.summary}</span>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{node.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{node.body}</p>
                  {"outcomes" in node && node.outcomes?.length ? (
                    <ul className="mt-4 space-y-1.5">
                      {node.outcomes.map((o) => (
                        <li key={o} className="flex items-center gap-2 text-xs text-foreground/90">
                          <span className="size-1.5 rounded-full bg-primary" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {"footnote" in node && node.footnote ? (
                    <p className="mt-3 text-[10px] text-muted-foreground">{node.footnote}</p>
                  ) : null}
                </article>

                {"branches" in node && node.branches?.length ? (
                  <div className="mt-3 flex w-full flex-col items-stretch gap-3">
                    {node.branches
                      .filter((b) => b.position === "bottom")
                      .map((b) => (
                        <BranchCard key={b.title} branch={b} />
                      ))}
                  </div>
                ) : null}
              </div>

              {index < copy.nodes.length - 1 ? <RailConnector /> : null}
            </div>
          ))}
          <div className="w-[max(1.5rem,8vw)] shrink-0" aria-hidden />
        </div>
      </div>
    </section>
  );
}
