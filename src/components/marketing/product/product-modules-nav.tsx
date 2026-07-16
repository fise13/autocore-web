"use client";

import { useEffect, useState } from "react";

import { productContent } from "@/components/marketing/product/content/product-content";
import { cn } from "@/lib/utils";

const TOC = productContent.toc;

export function ProductModulesNav({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState<string>(TOC[0]?.id ?? "mission-control");

  useEffect(() => {
    const ids = TOC.map((item) => item.id);
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
  }, []);

  return (
    <nav className={cn("product-modules-nav", className)} aria-label="Разделы продукта">
      <div className="product-modules-nav-track">
        {TOC.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn("product-modules-nav-link", activeId === item.id && "is-active")}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
