"use client";

import { useEffect, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";

import { useProductContent } from "@/components/marketing/product/content/use-product-content";
import { cn } from "@/lib/utils";

export function ProductModulesNav({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const { toc: TOC } = useProductContent();
  const [activeId, setActiveId] = useState<string>(TOC.items[0]?.id ?? "engine-search");

  useEffect(() => {
    const ids = TOC.items.map((item) => item.id);
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top) setActiveId(top);
      },
      { rootMargin: "-28% 0px -55% 0px", threshold: [0.12, 0.35, 0.6] },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
    // Section ids are stable across locales (only labels are translated) — observe once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNavigate = (id: string) => {
    setActiveId(id);
  };

  return (
    <nav className={cn("product-toc", className)} aria-label={TOC.ariaLabel}>
      <div className="product-toc-rule" aria-hidden />
      <p className="product-toc-title">{TOC.title}</p>
      <LayoutGroup id="product-toc">
        <ul className="product-toc-list">
          {TOC.items.map((item) => {
            const active = activeId === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={cn("product-toc-link", active && "is-active")}
                  aria-current={active ? "location" : undefined}
                  onClick={() => onNavigate(item.id)}
                >
                  {active ? (
                    <motion.span
                      className="product-toc-link-bg"
                      layoutId={reduced ? undefined : "product-toc-active-bg"}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 380, damping: 34, mass: 0.75 }
                      }
                      aria-hidden
                    />
                  ) : null}
                  <span className="product-toc-dot-slot" aria-hidden>
                    <span className="product-toc-dot" />
                    {active ? (
                      <motion.span
                        className="product-toc-dot-active"
                        layoutId={reduced ? undefined : "product-toc-active-dot"}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 420, damping: 32, mass: 0.7 }
                        }
                      />
                    ) : null}
                  </span>
                  <motion.span
                    className="product-toc-label"
                    animate={{
                      opacity: active ? 1 : 0.62,
                      x: active && !reduced ? 1 : 0,
                    }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 380, damping: 34 }
                    }
                  >
                    {item.label}
                  </motion.span>
                </a>
              </li>
            );
          })}
        </ul>
      </LayoutGroup>
      <div className="product-toc-rule" aria-hidden />
    </nav>
  );
}
