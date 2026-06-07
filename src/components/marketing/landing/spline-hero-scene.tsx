"use client";

import dynamic from "next/dynamic";
import { animate, createScope, random } from "animejs";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => <SplineFallback active />,
});

/** Публичная сцена или свой URL через NEXT_PUBLIC_SPLINE_HERO_SCENE */
const DEFAULT_SCENE =
  "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

type SplineFallbackProps = {
  active?: boolean;
};

function SplineFallback({ active = false }: SplineFallbackProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const scope = createScope({ root: ref });
    scope.add(() => {
      animate(".landing-spline-orb", {
        translateX: () => random(-24, 24),
        translateY: () => random(-18, 18),
        scale: () => random(0.85, 1.15),
        ease: "inOutSine",
        duration: () => random(3200, 5200),
        alternate: true,
        loop: true,
      });
    });

    return () => scope.revert();
  }, [active]);

  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="landing-spline-orb absolute size-56 rounded-full bg-primary/25 blur-3xl" aria-hidden />
      <div className="landing-spline-orb absolute size-40 -translate-x-16 translate-y-8 rounded-full bg-primary/15 blur-2xl" aria-hidden />
      <div className="landing-spline-orb absolute size-28 translate-x-20 -translate-y-12 rounded-full bg-sky-400/10 blur-2xl" aria-hidden />
      <p className="relative z-10 text-xs font-medium tracking-wide text-white/45 uppercase">
        {active ? "3D-сцена загружается…" : "3D-превью"}
      </p>
    </div>
  );
}

type SplineHeroSceneProps = {
  className?: string;
};

export function SplineHeroScene({ className }: SplineHeroSceneProps) {
  const [ready, setReady] = useState(false);
  const scene = process.env.NEXT_PUBLIC_SPLINE_HERO_SCENE ?? DEFAULT_SCENE;

  return (
    <div className={cn("landing-spline-wrap", className)} aria-hidden>
      {!ready ? <SplineFallback active /> : null}
      <Spline
        scene={scene}
        className={cn("absolute inset-0 h-full w-full", !ready && "opacity-0")}
        onLoad={() => setReady(true)}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a1628] to-transparent"
        aria-hidden
      />
    </div>
  );
}
