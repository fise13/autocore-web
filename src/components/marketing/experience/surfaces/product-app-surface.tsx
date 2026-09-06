"use client";

import { useState } from "react";
import {
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  PanelLeft,
  Search,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";

import { OverviewSurface } from "@/components/marketing/experience/surfaces/overview-surface";
import { landingDemoOverview } from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  warehouse: Package,
  documents: FileText,
  sales: ShoppingCart,
  "work-orders": ClipboardList,
  earnings: Wallet,
  finance: CircleDollarSign,
} as const;

const NAV_LABEL_KEYS = {
  dashboard: "nav.dashboard",
  warehouse: "nav.warehouse",
  documents: "nav.documents",
  sales: "nav.sales",
  "work-orders": "nav.workOrders",
  earnings: "nav.earnings",
  finance: "nav.finance",
} as const;

type ProductAppSurfaceProps = {
  className?: string;
  compact?: boolean;
  /** Full dashboard playground: internal scroll, working sidebar, Dashboard only. */
  playground?: boolean;
};

/** Real AutoCore app chrome: sidebar + top bar + Overview. */
export function ProductAppSurface({
  className,
  compact = false,
  playground = false,
}: ProductAppSurfaceProps) {
  const t = useTranslations("marketing.landing.productChrome");
  const reduced = useReducedMotion();
  const mc = landingDemoOverview;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "exp-product-app",
        compact && "is-compact",
        playground && "is-playground",
        playground && collapsed && "is-collapsed",
        className,
      )}
      aria-label={t("ariaProduct")}
    >
      <aside className="exp-product-app-sidebar" aria-label={t("ariaNav")}>
        <div className="exp-product-app-workspace">
          <p className="exp-product-app-workspace-name">{mc.companyName}</p>
          {collapsed && playground ? null : (
            <p className="exp-product-app-workspace-meta">{t("spacesLabel")}</p>
          )}
        </div>

        <nav className="exp-product-app-nav">
          {mc.nav.map((item) => {
            const Icon = NAV_ICONS[item.id as keyof typeof NAV_ICONS] ?? LayoutDashboard;
            const labelKey = NAV_LABEL_KEYS[item.id as keyof typeof NAV_LABEL_KEYS];
            const label = labelKey ? t(labelKey) : item.label;
            const isDashboard = item.id === "dashboard";
            const active = isDashboard;

            if (!playground) {
              return (
                <div
                  key={item.id}
                  className={cn("exp-product-app-nav-item", active && "is-active")}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {item.count != null ? (
                    <span className="exp-product-app-nav-count exp-mock-mono">{item.count}</span>
                  ) : null}
                </div>
              );
            }

            return (
              <motion.button
                key={item.id}
                type="button"
                className={cn(
                  "exp-product-app-nav-item",
                  active && "is-active",
                  !isDashboard && "is-locked",
                )}
                aria-current={active ? "page" : undefined}
                aria-disabled={!isDashboard || undefined}
                title={collapsed ? label : !isDashboard ? t("navLocked") : label}
                whileTap={reduced || !isDashboard ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.16, ease: EASE }}
              >
                <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                {collapsed ? <span className="sr-only">{label}</span> : (
                  <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                )}
                {!collapsed && item.count != null ? (
                  <span className="exp-product-app-nav-count exp-mock-mono">{item.count}</span>
                ) : null}
              </motion.button>
            );
          })}
        </nav>
      </aside>

      <div className="exp-product-app-main">
        <div className="exp-product-app-topbar">
          <button
            type="button"
            className="exp-product-app-icon-btn"
            aria-label={
              playground
                ? collapsed
                  ? t("sidebarExpandAria")
                  : t("sidebarCollapseAria")
                : t("sidebarAria")
            }
            tabIndex={playground ? 0 : -1}
            onClick={playground ? () => setCollapsed((value) => !value) : undefined}
          >
            <PanelLeft className="size-3.5" />
          </button>
          <div className="exp-product-app-topbar-search">
            <Search className="size-3.5 text-muted-foreground" aria-hidden />
            <span>{t("searchPlaceholder")}</span>
            <kbd>⌘K</kbd>
          </div>
        </div>
        <OverviewSurface className="exp-product-app-mc" full={playground} />
      </div>
    </div>
  );
}
