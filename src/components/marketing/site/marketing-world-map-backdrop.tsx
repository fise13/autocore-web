"use client";

import { useEffect, useRef, useState } from "react";

import WorldMap, { type WorldMapDot } from "@/components/ui/world-map";
import { cn } from "@/lib/utils";

const MARKETING_WORLD_MAP_DOTS: WorldMapDot[] = [
  {
    start: { lat: 64.2008, lng: -149.4937 },
    end: { lat: 34.0522, lng: -118.2437 },
  },
  {
    start: { lat: 64.2008, lng: -149.4937 },
    end: { lat: -15.7975, lng: -47.8919 },
  },
  {
    start: { lat: -15.7975, lng: -47.8919 },
    end: { lat: 38.7223, lng: -9.1393 },
  },
  {
    start: { lat: 51.5074, lng: -0.1278 },
    end: { lat: 28.6139, lng: 77.209 },
  },
  {
    start: { lat: 28.6139, lng: 77.209 },
    end: { lat: 43.1332, lng: 131.9113 },
  },
  {
    start: { lat: 28.6139, lng: 77.209 },
    end: { lat: -1.2921, lng: 36.8219 },
  },
];

type MarketingWorldMapBackdropProps = {
  className?: string;
};

export function MarketingWorldMapBackdrop({ className }: MarketingWorldMapBackdropProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: "280px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={cn("mkt-world-map-backdrop", className)} aria-hidden>
      {visible ? (
        <div className="mkt-world-map-stage">
          <WorldMap className="mkt-world-map-canvas" dots={MARKETING_WORLD_MAP_DOTS} />
        </div>
      ) : null}
      <div className="mkt-world-map-fade" />
    </div>
  );
}
