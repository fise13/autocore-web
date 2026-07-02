"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { landingContent } from "@/components/marketing/experience/content/landing-content";
import { DocumentsMock } from "@/components/marketing/experience/mocks/documents-mock";
import { InventoryMock } from "@/components/marketing/experience/mocks/inventory-mock";
import { WorkOrderMock } from "@/components/marketing/experience/mocks/work-order-mock";
import { SectionIntro } from "@/components/marketing/experience/ui/section-intro";
import { cn } from "@/lib/utils";

const copy = landingContent.showcase;

type SceneId = (typeof copy.scenes)[number]["id"];

function SceneMock({ scene }: { scene: SceneId }) {
  switch (scene) {
    case "orders":
      return <WorkOrderMock className="w-full" />;
    case "inventory":
      return <InventoryMock className="w-full" />;
    case "documents":
      return <DocumentsMock className="w-full" />;
  }
}

export function ProductShowcase() {
  const reduced = useReducedMotion();
  const [scene, setScene] = useState<SceneId>("orders");

  return (
    <section className="exp-section">
      <div className="exp-section-inner">
        <SectionIntro title={copy.title} description={copy.description} />
        <div className="exp-showcase-tabs mt-8 flex flex-wrap gap-2">
          {copy.scenes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScene(item.id)}
              className={cn(
                "exp-showcase-tab cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors duration-200",
                scene === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <motion.div
          key={scene}
          className="mt-6"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="exp-mock-shelf p-3 sm:p-4">
            <SceneMock scene={scene} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
