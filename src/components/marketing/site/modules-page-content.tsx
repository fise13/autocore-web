"use client";

import {
  ArrowRight,
  Banknote,
  Package,
  Radar,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";

import { useMarketingPages } from "@/components/marketing/content/use-marketing-pages";
import { FeatureIcon } from "@/components/marketing/site/feature-icon";
import { MarketingRelatedLinks } from "@/components/marketing/site/marketing-related-links";
import { ModulesTocNav } from "@/components/marketing/site/modules-toc-nav";
import { type SiteNavLinkHref } from "@/components/marketing/site/site-navigation";
import {
  useGsapReveal,
  useGsapStaggerChildren,
} from "@/components/marketing/motion/use-gsap-reveal";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { Link } from "@/i18n/navigation";
import { marketingRoutes } from "@/lib/marketing-routes";
import { smoothScrollToElement } from "@/lib/motion/smooth-scroll-to";

const MODULE_SCROLL_OFFSET = 112;

gsap.registerPlugin(ScrollTrigger);

const ICONS: Record<string, LucideIcon> = {
  "mission-control": Radar,
  warehouse: Warehouse,
  "work-orders": Wrench,
  accounting: Banknote,
  inventory: Package,
  employees: Users,
};

const TONES = ["blue", "green", "amber", "blue", "green", "amber"] as const;

export function ModulesPageContent() {
  const copy = useMarketingPages().modules;
  const ref = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>(copy.items[0]?.id ?? "");
  const reduced = usePrefersReducedMotion();

  const relatedByModule = useMemo<Record<string, { label: string; href: SiteNavLinkHref }[]>>(() => {
    const links = copy.relatedLinks;
    return {
      "mission-control": [
        { label: links.warehouse, href: { pathname: "/modules", hash: "warehouse" } },
        { label: links.accounting, href: { pathname: "/modules", hash: "accounting" } },
      ],
      warehouse: [
        { label: links.workOrders, href: { pathname: "/modules", hash: "work-orders" } },
        { label: links.howItWorks, href: { pathname: "/", hash: "story" } },
      ],
      "work-orders": [
        { label: links.warehouse, href: { pathname: "/modules", hash: "warehouse" } },
        { label: links.documents, href: { pathname: "/", hash: "documents" } },
      ],
      accounting: [
        { label: links.missionControl, href: { pathname: "/modules", hash: "mission-control" } },
        { label: links.security, href: "/security" },
      ],
      inventory: [
        { label: links.warehouse, href: { pathname: "/modules", hash: "warehouse" } },
        { label: links.documents, href: { pathname: "/", hash: "documents" } },
      ],
      employees: [
        { label: links.security, href: "/security" },
        { label: links.demo, href: { pathname: "/", hash: "demo" } },
      ],
    };
  }, [copy.relatedLinks]);

  const relatedSections = useMemo(
    () => [
      { href: marketingRoutes.product, ...copy.relatedSections.product },
      { href: marketingRoutes.pricing, ...copy.relatedSections.pricing },
      { href: marketingRoutes.security, ...copy.relatedSections.security },
      { href: marketingRoutes.contact, ...copy.relatedSections.contact },
    ],
    [copy.relatedSections],
  );

  useGsapReveal(ref, "[data-modules-reveal]", { stagger: 0.08, y: 24 });
  useGsapStaggerChildren(ref, ".marketing-stats-row", ".marketing-stat", { stagger: 0.1, y: 20 });
  useGsapStaggerChildren(ref, "[data-modules-overview]", ".marketing-module-overview-card", {
    stagger: 0.07,
    y: 18,
  });

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || reduced) return;

      const cards = root.querySelectorAll<HTMLElement>(".marketing-module-card");
      cards.forEach((card) => {
        const inner = card.querySelector<HTMLElement>(".marketing-module-card-inner");
        const checks = card.querySelectorAll<HTMLElement>(".marketing-check-item");
        const accent = card.querySelector<HTMLElement>(".marketing-module-card-accent");
        if (!inner) return;

        gsap.set(inner, { opacity: 0, y: 36 });
        gsap.set(checks, { opacity: 0, x: -10 });
        if (accent) gsap.set(accent, { scaleY: 0 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 84%",
            once: true,
            onEnter: () => card.classList.add("is-visible"),
          },
        });

        tl.to(inner, { opacity: 1, y: 0, duration: 0.75, ease: "power3.out" });
        if (accent) {
          tl.to(accent, { scaleY: 1, duration: 0.55, ease: "power2.out" }, "-=0.5");
        }
        if (checks.length) {
          tl.to(
            checks,
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.035, ease: "power2.out" },
            "-=0.45",
          );
        }
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  useEffect(() => {
    const sections = copy.items
      .map((m) => document.getElementById(m.id))
      .filter(Boolean) as HTMLElement[];

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const tocItems = copy.items.map((mod) => ({
    id: mod.id,
    title: mod.title,
    icon: ICONS[mod.id] ?? Radar,
  }));

  function goToModule(id: string, event?: React.MouseEvent<HTMLAnchorElement>) {
    event?.preventDefault();
    const section = document.getElementById(id);
    if (!section) return;

    setActiveId(id);
    history.replaceState(null, "", `#${id}`);

    if (reduced) {
      section.scrollIntoView({ behavior: "auto", block: "start" });
      return;
    }

    void smoothScrollToElement(section, MODULE_SCROLL_OFFSET);
  }

  return (
    <div ref={ref}>
      <div className="marketing-stats-row">
        {copy.stats.map((stat) => (
          <div key={stat.label} className="marketing-stat">
            <p className="marketing-stat-value">{stat.value}</p>
            <p className="marketing-stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      <p className="landing-lead mt-10 max-w-3xl" data-modules-reveal>
        {copy.intro}
      </p>

      <div className="marketing-module-overview mt-12" data-modules-reveal>
        <div className="marketing-module-overview-grid" data-modules-overview>
          {copy.items.map((mod, index) => {
            const Icon = ICONS[mod.id] ?? Radar;
            return (
              <a
                key={mod.id}
                href={`#${mod.id}`}
                className="marketing-module-overview-card group"
                onClick={(event) => goToModule(mod.id, event)}
              >
                <FeatureIcon icon={Icon} tone={TONES[index] ?? "blue"} size="md" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{mod.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{mod.tagline}</span>
                </span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            );
          })}
        </div>
      </div>

      <div className="marketing-modules-layout mt-16">
        <ModulesTocNav items={tocItems} activeId={activeId} onActiveChange={setActiveId} />

        <div className="marketing-modules-list">
          {copy.items.map((mod, index) => {
            const Icon = ICONS[mod.id] ?? Radar;
            const related = relatedByModule[mod.id] ?? [];
            return (
              <article key={mod.id} id={mod.id} className="marketing-module-card scroll-mt-28">
                <div className="marketing-module-card-inner">
                  <span className="marketing-module-card-accent" aria-hidden />
                  <div className="marketing-module-card-head">
                    <FeatureIcon icon={Icon} tone={TONES[index] ?? "blue"} size="lg" />
                    <div className="min-w-0">
                      <h2 className="marketing-subsection-title">{mod.title}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{mod.tagline}</p>
                    </div>
                  </div>

                  <p className="landing-lead mt-5 max-w-3xl">{mod.description}</p>

                  <div className="marketing-module-capabilities mt-8">
                    <h3 className="text-sm font-semibold">{copy.capabilitiesTitle}</h3>
                    <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {mod.capabilities.map((cap) => (
                        <li key={cap} className="marketing-check-item">
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="marketing-module-meta mt-6">
                    <p className="text-sm">
                      <span className="font-medium text-foreground">{copy.forWhomLabel}: </span>
                      <span className="text-muted-foreground">{mod.forWhom}</span>
                    </p>

                    {related.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {related.map((r) => (
                          <Link key={r.label} href={r.href} className="marketing-chip-link">
                            {r.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <MarketingRelatedLinks links={relatedSections} />
    </div>
  );
}
