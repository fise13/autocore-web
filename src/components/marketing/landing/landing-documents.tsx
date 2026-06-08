"use client";

import dynamic from "next/dynamic";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useGsapReveal, useGsapSplitHeading } from "@/components/marketing/motion/use-gsap-reveal";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { demoDocumentContext } from "@/lib/marketing/demo-document-context";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const WorkOrderDocument = dynamic(
  () =>
    import("@/components/documents/work-order/work-order-document").then((m) => m.WorkOrderDocument),
  { ssr: false, loading: () => <DocumentSkeleton /> },
);
const EngineWarrantyDocument = dynamic(
  () =>
    import("@/components/documents/engine-warranty/engine-warranty-document").then(
      (m) => m.EngineWarrantyDocument,
    ),
  { ssr: false, loading: () => <DocumentSkeleton /> },
);
const ServiceActDocument = dynamic(
  () =>
    import("@/components/documents/service-act/service-act-document").then((m) => m.ServiceActDocument),
  { ssr: false, loading: () => <DocumentSkeleton /> },
);

const copy = landingPageContent.documents;

const DOC_COMPONENTS = {
  "work-order": WorkOrderDocument,
  warranty: EngineWarrantyDocument,
  "service-act": ServiceActDocument,
} as const;

function DocumentSkeleton() {
  return <div className="landing-doc-skeleton" />;
}

export function LandingDocuments() {
  const ref = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  useGsapSplitHeading(ref, "[data-doc-heading]");
  useGsapReveal(ref, "[data-doc-reveal]");

  useGSAP(
    () => {
      const stack = stackRef.current;
      if (!stack || reduced) return;

      const cards = gsap.utils.toArray<HTMLElement>("[data-doc-card]");

      ScrollTrigger.create({
        trigger: stack,
        start: "top 70%",
        end: "bottom 30%",
        scrub: 0.5,
        onUpdate: (self) => {
          const idx = Math.min(copy.items.length - 1, Math.floor(self.progress * copy.items.length));
          setActiveIndex(idx);
        },
      });

      cards.forEach((card, i) => {
        gsap.set(card, {
          rotate: i * -2,
          y: i * 12,
          scale: 1 - i * 0.03,
          zIndex: copy.items.length - i,
        });
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section ref={ref} id="documents" className="landing-section landing-section-docs">
      <div className="landing-container">
        <div className="landing-section-header">
          <p data-doc-reveal className="landing-eyebrow">
            {copy.eyebrow}
          </p>
          <h2 data-doc-heading className="landing-section-title mt-4 max-w-2xl">
            {copy.title}
          </h2>
          <p data-doc-reveal className="landing-lead mt-5 max-w-xl">
            {copy.description}
          </p>
        </div>

        <div className="landing-doc-layout mt-16">
          <ul className="landing-doc-list" data-doc-reveal>
            {copy.items.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn("landing-doc-list-item", i === activeIndex && "is-active")}
                  onClick={() => setActiveIndex(i)}
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.hint}</span>
                </button>
              </li>
            ))}
          </ul>

          <div ref={stackRef} className="landing-doc-stack">
            {copy.items.map((item, i) => {
              const Doc = DOC_COMPONENTS[item.id as keyof typeof DOC_COMPONENTS];
              const offset = Math.abs(i - activeIndex);

              return (
                <div
                  key={item.id}
                  data-doc-card
                  className={cn("landing-doc-card", offset === 0 && "is-front")}
                  style={{
                    transform: reduced
                      ? undefined
                      : `rotate(${offset * -1.5}deg) translateY(${offset * 10}px) scale(${1 - offset * 0.04})`,
                    zIndex: copy.items.length - offset,
                    opacity: offset > 2 ? 0 : 1 - offset * 0.15,
                  }}
                >
                  <div className="landing-doc-card-inner">
                    <Doc context={demoDocumentContext} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
