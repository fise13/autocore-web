"use client";

import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useSimulatedFeed } from "@/components/marketing/hooks/use-simulated-feed";
import { useAnimeReveal } from "@/components/marketing/landing/use-anime-reveal";
import { FeedList } from "@/components/marketing/ui/feed-list";

const copy = landingPageContent.realtime;

export function LandingRealtime() {
  const ref = useRef<HTMLElement>(null);
  const feed = useSimulatedFeed();
  useAnimeReveal({ scope: ref });

  return (
    <section ref={ref} id="realtime" className="landing-section border-t border-border/80 bg-muted/25">
      <div className="landing-container">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p data-anime-reveal className="landing-eyebrow">
              {copy.eyebrow}
            </p>
            <h2 data-anime-reveal className="landing-display mt-4 text-balance">
              {copy.title}
            </h2>
            <p data-anime-reveal className="landing-lead mt-5">
              {copy.description}
            </p>
          </div>

          <div data-anime-reveal className="landing-card max-h-[360px] overflow-hidden overflow-y-auto p-2">
            <div className="border-b border-border/80 px-4 py-3">
              <p className="text-sm font-medium">{copy.feedTitle}</p>
              <p className="text-xs text-muted-foreground">Синхронизация · demo</p>
            </div>
            <div className="p-2">
              <FeedList events={feed} compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
