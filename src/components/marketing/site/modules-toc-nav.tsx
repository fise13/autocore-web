"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";

import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type ModulesTocItem = {
  id: string;
  title: string;
  icon: LucideIcon;
};

type ModulesTocNavProps = {
  items: ModulesTocItem[];
  activeId: string;
  onActiveChange: (id: string) => void;
  listRef?: RefObject<HTMLUListElement | null>;
};

function indicatorPosition(link: HTMLElement, track: HTMLElement) {
  const trackTop = track.getBoundingClientRect().top;
  const linkRect = link.getBoundingClientRect();
  return {
    y: linkRect.top - trackTop,
    height: linkRect.height,
  };
}

export function ModulesTocNav({ items, activeId, onActiveChange, listRef: externalListRef }: ModulesTocNavProps) {
  const internalListRef = useRef<HTMLUListElement>(null);
  const listRef = externalListRef ?? internalListRef;
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndicatorRef = useRef<HTMLSpanElement>(null);
  const hoverIndicatorRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const reduced = usePrefersReducedMotion();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const placeIndicator = useCallback(
    (
      indicator: HTMLElement | null,
      link: HTMLElement | null,
      animate: boolean,
      opacity?: number,
    ) => {
      const track = trackRef.current;
      if (!indicator || !link || !track) return;

      const { y, height } = indicatorPosition(link, track);
      const duration = animate && !reduced ? 0.38 : 0;

      gsap.to(indicator, {
        y,
        height,
        opacity: opacity ?? gsap.getProperty(indicator, "opacity"),
        duration,
        ease: "power3.out",
        overwrite: "auto",
      });
    },
    [reduced],
  );

  const syncActiveIndicator = useCallback(
    (animate: boolean) => {
      const link = linkRefs.current.get(activeId);
      placeIndicator(activeIndicatorRef.current, link ?? null, animate, 1);
    },
    [activeId, placeIndicator],
  );

  useGSAP(
    () => {
      syncActiveIndicator(!reduced);
    },
    { dependencies: [activeId, syncActiveIndicator, reduced] },
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => syncActiveIndicator(false));
    return () => cancelAnimationFrame(frame);
  }, [syncActiveIndicator]);

  useEffect(() => {
    const refresh = () => syncActiveIndicator(false);
    window.addEventListener("resize", refresh);
    return () => window.removeEventListener("resize", refresh);
  }, [syncActiveIndicator]);

  useGSAP(
    () => {
      if (reduced) return;
      const links = listRef.current?.querySelectorAll<HTMLElement>("[data-toc-item]");
      if (!links?.length) return;

      gsap.fromTo(
        links,
        { opacity: 0, x: -10 },
        {
          opacity: 1,
          x: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: "power2.out",
          delay: 0.15,
        },
      );
    },
    { scope: listRef, dependencies: [reduced] },
  );

  function handleClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const section = document.getElementById(id);
    if (!section) return;

    onActiveChange(id);
    section.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  }

  function handleMouseEnter(id: string) {
    setHoveredId(id);
    if (id === activeId) {
      gsap.to(hoverIndicatorRef.current, { opacity: 0, duration: 0.15 });
      return;
    }

    const link = linkRefs.current.get(id);
    placeIndicator(hoverIndicatorRef.current, link ?? null, !reduced, 1);
  }

  function handleMouseLeave() {
    setHoveredId(null);
    gsap.to(hoverIndicatorRef.current, { opacity: 0, duration: 0.2 });
  }

  return (
    <nav className="marketing-modules-toc" aria-label="Модули">
      <p className="landing-eyebrow mb-4">Содержание</p>
      <div ref={trackRef} className="marketing-modules-toc-track">
        <span
          ref={activeIndicatorRef}
          className="marketing-modules-toc-indicator is-active"
          aria-hidden
        />
        <span
          ref={hoverIndicatorRef}
          className="marketing-modules-toc-indicator is-hover"
          aria-hidden
        />
        <ul ref={listRef} className="marketing-modules-toc-list">
          {items.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeId === mod.id;
          const isHovered = hoveredId === mod.id;

          return (
            <li key={mod.id}>
              <a
                ref={(node) => {
                  if (node) linkRefs.current.set(mod.id, node);
                  else linkRefs.current.delete(mod.id);
                }}
                href={`#${mod.id}`}
                data-toc-item
                className={cn(
                  "marketing-modules-toc-link",
                  isActive && "is-active",
                  isHovered && !isActive && "is-hovered",
                )}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => handleClick(event, mod.id)}
                onMouseEnter={() => handleMouseEnter(mod.id)}
                onMouseLeave={handleMouseLeave}
                onFocus={() => handleMouseEnter(mod.id)}
                onBlur={handleMouseLeave}
              >
                <Icon className="marketing-modules-toc-icon" aria-hidden />
                <span className="marketing-modules-toc-label">{mod.title}</span>
              </a>
            </li>
          );
          })}
        </ul>
      </div>
    </nav>
  );
}
