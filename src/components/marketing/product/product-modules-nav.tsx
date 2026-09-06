"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";

import { useProductContent } from "@/components/marketing/product/content/use-product-content";
import { smoothScrollToElement } from "@/lib/motion/smooth-scroll-to";
import { cn } from "@/lib/utils";

/** Matches `scroll-mt-28` on product walk sections. */
const SCROLL_OFFSET = 112;

function readActiveSectionId(ids: string[]) {
  if (ids.length === 0) return "";

  const lastId = ids[ids.length - 1];
  const doc = document.documentElement;
  const nearBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 8;
  if (nearBottom) return lastId;

  let current = ids[0];
  for (const id of ids) {
    const node = document.getElementById(id);
    if (!node) continue;
    if (node.getBoundingClientRect().top <= SCROLL_OFFSET + 8) current = id;
  }
  return current;
}

export function ProductModulesNav({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const { toc: TOC } = useProductContent();
  const ids = TOC.items.map((item) => item.id);
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const [activeId, setActiveId] = useState<string>(ids[0] ?? "engine-search");
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const lockRef = useRef(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && idsRef.current.includes(hash)) {
      setActiveId(hash);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      if (lockRef.current) return;
      const next = readActiveSectionId(idsRef.current);
      if (next && next !== activeIdRef.current) setActiveId(next);
    };

    const onScrollOrResize = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("hashchange", sync);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  useEffect(() => {
    const link = linkRefs.current.get(activeId);
    const list = link?.closest(".product-toc-list");
    if (!link || !(list instanceof HTMLElement)) return;
    if (list.scrollWidth <= list.clientWidth + 1) return;
    link.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeId]);

  function onNavigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const section = document.getElementById(id);
    if (!section) return;

    event.preventDefault();
    setActiveId(id);
    history.replaceState(null, "", `#${id}`);

    if (reduced) {
      section.scrollIntoView({ behavior: "auto", block: "start" });
      return;
    }

    lockRef.current = true;
    void smoothScrollToElement(section, SCROLL_OFFSET).finally(() => {
      lockRef.current = false;
      const next = readActiveSectionId(idsRef.current);
      if (next) setActiveId(next);
    });
  }

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
                  ref={(node) => {
                    if (node) linkRefs.current.set(item.id, node);
                    else linkRefs.current.delete(item.id);
                  }}
                  href={`#${item.id}`}
                  className={cn("product-toc-link", active && "is-active")}
                  aria-current={active ? "location" : undefined}
                  onClick={(event) => onNavigate(event, item.id)}
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
