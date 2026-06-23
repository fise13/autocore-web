"use client";

import Link from "next/link";
import { useRef } from "react";

import { useGsapReveal } from "@/components/marketing/motion/use-gsap-reveal";

type RelatedLink = {
  href: string;
  label: string;
  hint: string;
};

type MarketingRelatedLinksProps = {
  links: RelatedLink[];
  className?: string;
};

export function MarketingRelatedLinks({ links, className = "mt-20" }: MarketingRelatedLinksProps) {
  const ref = useRef<HTMLElement>(null);
  useGsapReveal(ref, "[data-related-link]", { stagger: 0.1, y: 20 });

  return (
    <nav ref={ref} className={`marketing-related-links ${className}`.trim()} aria-label="Другие разделы">
      {links.map((link) => (
        <Link key={link.href} href={link.href} data-related-link className="marketing-related-link">
          <span className="block font-medium">{link.label}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{link.hint}</span>
        </Link>
      ))}
    </nav>
  );
}
