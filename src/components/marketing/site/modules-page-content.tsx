"use client";

import Link from "next/link";
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
import { useEffect, useRef, useState } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { FeatureIcon } from "@/components/marketing/site/feature-icon";
import { MarketingRelatedLinks } from "@/components/marketing/site/marketing-related-links";
import { ModulesTocNav } from "@/components/marketing/site/modules-toc-nav";
import {
  useGsapReveal,
  useGsapStaggerChildren,
} from "@/components/marketing/motion/use-gsap-reveal";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { marketingRoutes } from "@/lib/marketing-routes";
import { smoothScrollToElement } from "@/lib/motion/smooth-scroll-to";

const MODULE_SCROLL_OFFSET = 112;

gsap.registerPlugin(ScrollTrigger);

const copy = marketingSiteContent.modules;

const ICONS: Record<string, LucideIcon> = {
  "mission-control": Radar,
  warehouse: Warehouse,
  "work-orders": Wrench,
  accounting: Banknote,
  inventory: Package,
  employees: Users,
};

const TONES = ["blue", "green", "amber", "blue", "green", "violet"] as const;

const RELATED: Record<string, { label: string; href: string }[]> = {
  "mission-control": [
    { label: "Склад", href: `${marketingRoutes.modules}#warehouse` },
    { label: "Бухгалтерия", href: `${marketingRoutes.modules}#accounting` },
  ],
  warehouse: [
    { label: "Заказ-наряды", href: `${marketingRoutes.modules}#work-orders` },
    { label: "Как работает", href: `${marketingRoutes.home}#story` },
  ],
  "work-orders": [
    { label: "Склад", href: `${marketingRoutes.modules}#warehouse` },
    { label: "Документы", href: `${marketingRoutes.home}#documents` },
  ],
  accounting: [
    { label: "Mission Control", href: `${marketingRoutes.modules}#mission-control` },
    { label: "Безопасность", href: marketingRoutes.security },
  ],
  inventory: [
    { label: "Склад", href: `${marketingRoutes.modules}#warehouse` },
    { label: "Документы", href: `${marketingRoutes.home}#documents` },
  ],
  employees: [
    { label: "Безопасность", href: marketingRoutes.security },
    { label: "Демо", href: `${marketingRoutes.home}#demo` },
  ],
};

const RELATED_SECTIONS = [
  { href: marketingRoutes.product, label: "Обзор продукта", hint: "Mission Control и процессы" },
  { href: marketingRoutes.pricing, label: "Тарифы", hint: "Пробный период и Pro" },
  { href: marketingRoutes.security, label: "Безопасность", hint: "RBAC и аудит" },
  { href: marketingRoutes.contact, label: "Контакты", hint: "Демо и внедрение" },
];

export function ModulesPageContent() {
  const ref = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>(copy.items[0]?.id ?? "");
  const reduced = usePrefersReducedMotion();

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
        <p className="landing-eyebrow mb-4">Быстрый обзор</p>
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
            const related = RELATED[mod.id] ?? [];
            return (
              <article key={mod.id} id={mod.id} className="marketing-module-card scroll-mt-28">
                <div className="marketing-module-card-inner">
                  <span className="marketing-module-card-accent" aria-hidden />
                  <div className="marketing-module-card-head">
                    <FeatureIcon icon={Icon} tone={TONES[index] ?? "blue"} size="lg" />
                    <div className="min-w-0">
                      <p className="landing-eyebrow">{mod.tagline}</p>
                      <h2 className="marketing-subsection-title mt-2">{mod.title}</h2>
                    </div>
                  </div>

                  <p className="landing-lead mt-5 max-w-3xl">{mod.description}</p>

                  <div className="marketing-module-capabilities mt-8">
                    <h3 className="text-sm font-semibold">Возможности</h3>
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
                      <span className="font-medium text-foreground">Для кого: </span>
                      <span className="text-muted-foreground">{mod.forWhom}</span>
                    </p>

                    {related.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {related.map((r) => (
                          <Link key={r.href} href={r.href} className="marketing-chip-link">
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

      <MarketingRelatedLinks links={RELATED_SECTIONS} />
    </div>
  );
}
