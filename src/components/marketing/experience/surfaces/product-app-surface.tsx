"use client";

import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  PanelLeft,
  Search,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import { MissionControlSurface } from "@/components/marketing/experience/surfaces/mission-control-surface";
import { landingDemoMissionControl } from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  warehouse: Package,
  documents: FileText,
  sales: ShoppingCart,
  "work-orders": ClipboardList,
  earnings: Wallet,
  finance: Wallet,
} as const;

type ProductAppSurfaceProps = {
  className?: string;
  compact?: boolean;
};

/** Real AutoCore app chrome: sidebar + top bar + Mission Control. */
export function ProductAppSurface({ className, compact = false }: ProductAppSurfaceProps) {
  const mc = landingDemoMissionControl;

  return (
    <div
      className={cn("exp-product-app", compact && "is-compact", className)}
      aria-label="Продукт"
    >
      <aside className="exp-product-app-sidebar" aria-label="Навигация">
        <div className="exp-product-app-workspace">
          <p className="exp-product-app-workspace-name">{mc.companyName}</p>
          <p className="exp-product-app-workspace-meta">{mc.spacesLabel}</p>
        </div>

        <nav className="exp-product-app-nav">
          {mc.nav.map((item) => {
            const Icon = NAV_ICONS[item.id as keyof typeof NAV_ICONS] ?? LayoutDashboard;
            const active = item.id === "dashboard";
            return (
              <div
                key={item.id}
                className={cn("exp-product-app-nav-item", active && "is-active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.count != null ? (
                  <span className="exp-product-app-nav-count exp-mock-mono">{item.count}</span>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="exp-product-app-main">
        <div className="exp-product-app-topbar">
          <button
            type="button"
            className="exp-product-app-icon-btn"
            aria-label="Боковая панель"
            tabIndex={-1}
          >
            <PanelLeft className="size-3.5" />
          </button>
          <div className="exp-product-app-topbar-search">
            <Search className="size-3.5 text-muted-foreground" aria-hidden />
            <span>Поиск по компании…</span>
            <kbd>⌘K</kbd>
          </div>
          <span className="exp-product-app-topbar-meta">Сохранено</span>
        </div>
        <MissionControlSurface className="exp-product-app-mc" />
      </div>
    </div>
  );
}
