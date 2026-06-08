"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Activity, ClipboardList, Package } from "lucide-react";
import { useRef, useState } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { FeedList } from "@/components/marketing/ui/feed-list";
import { useSimulatedFeed } from "@/components/marketing/hooks/use-simulated-feed";
import { useGsapReveal, useGsapSplitHeading } from "@/components/marketing/motion/use-gsap-reveal";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { cn } from "@/lib/utils";

const copy = landingPageContent.demo;

const TAB_ICONS = {
  control: Activity,
  warehouse: Package,
  orders: ClipboardList,
} as const;

export function LandingDemo() {
  const ref = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<(typeof copy.tabs)[number]["id"]>("control");
  const events = useSimulatedFeed(2800);
  const reduced = usePrefersReducedMotion();

  useGsapSplitHeading(ref, "[data-demo-heading]");
  useGsapReveal(ref, "[data-demo-reveal]");

  useGSAP(
    () => {
      const tabs = tabsRef.current;
      const indicator = indicatorRef.current;
      if (!tabs || !indicator || reduced) return;

      const activeButton = tabs.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      if (!activeButton) return;

      gsap.to(indicator, {
        x: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        duration: activeTab === "control" ? 0 : 0.45,
        ease: "power3.out",
      });
    },
    { dependencies: [activeTab, reduced] },
  );

  useGSAP(
    () => {
      const content = contentRef.current;
      if (!content || reduced) return;

      gsap.killTweensOf(content);
      gsap.fromTo(
        content,
        { opacity: 0, y: 18, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" },
      );

      const metrics = content.querySelectorAll("[data-demo-metric]");
      if (metrics.length > 0) {
        gsap.fromTo(
          metrics,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: "power2.out", delay: 0.08 },
        );
      }

      const rows = content.querySelectorAll("[data-demo-row]");
      if (rows.length > 0) {
        gsap.fromTo(
          rows,
          { opacity: 0, x: -8 },
          { opacity: 1, x: 0, duration: 0.32, stagger: 0.05, ease: "power2.out", delay: 0.06 },
        );
      }
    },
    { dependencies: [activeTab, reduced] },
  );

  return (
    <section ref={ref} id="demo" className="landing-section landing-section-muted">
      <div className="landing-container">
        <div className="landing-section-header">
          <p data-demo-reveal className="landing-eyebrow">
            {copy.eyebrow}
          </p>
          <h2 data-demo-heading className="landing-section-title mt-4 max-w-2xl">
            {copy.title}
          </h2>
          <p data-demo-reveal className="landing-lead mt-5 max-w-xl">
            {copy.description}
          </p>
        </div>

        <div className="mt-12">
          <div data-demo-reveal className="landing-demo-tabs-wrap">
            <div ref={tabsRef} className="landing-demo-tabs" role="tablist">
              <span ref={indicatorRef} className="landing-demo-tab-indicator" aria-hidden />
              {copy.tabs.map((tab) => {
                const Icon = TAB_ICONS[tab.id];
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={cn("landing-demo-tab", activeTab === tab.id && "is-active")}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="size-4" aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={panelRef} className="landing-demo-frame mt-4">
            <div ref={contentRef} key={activeTab} className="landing-demo-panel-wrap">
              {activeTab === "control" ? <DemoMissionControl events={events} /> : null}
              {activeTab === "warehouse" ? <DemoWarehouse /> : null}
              {activeTab === "orders" ? <DemoWorkOrders /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type DemoMissionControlProps = {
  events: ReturnType<typeof useSimulatedFeed>;
};

function DemoMissionControl({ events }: DemoMissionControlProps) {
  const metrics = [
    { label: "Выручка сегодня", value: "₽ 2,4 млн" },
    { label: "Открытые наряды", value: "12" },
    { label: "SKU на складе", value: "4 892" },
    { label: "Низкий остаток", value: "3" },
  ];

  return (
    <div className="landing-demo-panel">
      <div className="landing-demo-panel-bar">
        <span className="text-xs text-muted-foreground">app.autocore · Mission Control</span>
        <span className="landing-demo-live">Live</span>
      </div>
      <div className="p-5 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="landing-demo-metric" data-demo-metric>
              <p className="text-lg font-semibold tabular-nums">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-border bg-card/50 p-4">
          <p className="text-sm font-medium">Журнал активности</p>
          <div className="mt-3">
            <FeedList events={events} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoWarehouse() {
  const rows = [
    { sku: "G4KC-88421", name: "Hyundai G4KC 2.4 MPI", qty: 0, status: "В наряде" },
    { sku: "FLT-OIL-001", name: "Масляный фильтр", qty: 24, status: "В наличии" },
    { sku: "OIL-5W30-4L", name: "Масло 5W-30", qty: 8, status: "Низкий остаток" },
    { sku: "ALT-12V", name: "Генератор 12V", qty: 3, status: "В наличии" },
  ];

  return (
    <div className="landing-demo-panel">
      <div className="landing-demo-panel-bar">
        <span className="text-xs text-muted-foreground">Склад · realtime</span>
      </div>
      <div className="p-5 md:p-6">
        <table className="landing-demo-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Наименование</th>
              <th className="text-right">Остаток</th>
              <th className="text-right">Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sku} data-demo-row>
                <td className="font-mono text-xs">{row.sku}</td>
                <td>{row.name}</td>
                <td className="text-right tabular-nums">{row.qty}</td>
                <td className="text-right">
                  <span
                    className={cn(
                      "landing-demo-badge",
                      row.status === "Низкий остаток" && "is-warn",
                      row.status === "В наряде" && "is-info",
                    )}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DemoWorkOrders() {
  const orders = [
    { num: "НЗ-2026-0142", client: "Алексей К.", vehicle: "Hyundai Sonata", status: "Завершён" },
    { num: "НЗ-2026-0148", client: "Марат С.", vehicle: "Toyota Camry", status: "В работе" },
    { num: "НЗ-2026-0151", client: "Олег В.", vehicle: "Kia Optima", status: "Ожидает запчасти" },
  ];

  return (
    <div className="landing-demo-panel">
      <div className="landing-demo-panel-bar">
        <span className="text-xs text-muted-foreground">Заказ-наряды</span>
      </div>
      <div className="divide-y divide-border">
        {orders.map((order) => (
          <div
            key={order.num}
            data-demo-row
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6"
          >
            <div>
              <p className="font-medium">{order.num}</p>
              <p className="text-sm text-muted-foreground">
                {order.client} · {order.vehicle}
              </p>
            </div>
            <span
              className={cn(
                "landing-demo-badge",
                order.status === "Завершён" && "is-success",
                order.status === "В работе" && "is-info",
                order.status === "Ожидает запчасти" && "is-warn",
              )}
            >
              {order.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
