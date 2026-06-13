"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { AccountingWorkspace } from "@/components/accounting/accounting-workspace";
import { MissionControlShell } from "@/components/mission-control/mission-control-shell";
import { MotorsWorkspace } from "@/components/motors/motors-workspace";
import { QuotesWorkspace } from "@/components/quotes/quotes-workspace";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { SoldWorkspace } from "@/components/sold/sold-workspace";
import { WarehouseWorkspace } from "@/components/warehouse/warehouse-workspace";
import { WorkOrdersWorkspace } from "@/components/work-orders/work-orders-workspace";
import { SpecificCategoryCachedPage } from "@/components/layout/specific-category-cached-page";
import { usePerformanceTier } from "@/components/providers/performance-tier-provider";
import { usePanelLifecycle } from "@/hooks/use-panel-lifecycle";
import {
  workOrdersSectionTransition,
  workOrdersSectionVariants,
} from "@/components/work-orders/work-orders-motion";
import {
  registerRouteCacheKey,
  unregisterRouteCacheKey,
} from "@/lib/performance/route-cache-store";
import { ROUTE_CACHE_MAX_PANELS } from "@/lib/performance/performance-tier";
import { cn } from "@/lib/utils";

/** Routes that stay mounted in the background when you navigate away (Safari-style, no tab UI). */
export function resolveRouteCacheKey(pathname: string): string | null {
  if (pathname === "/") return "/";
  if (pathname === "/work-orders" || pathname.startsWith("/work-orders/")) return "/work-orders";
  if (pathname === "/accounting") return "/accounting";
  if (pathname === "/motors") return "/motors";
  if (pathname === "/sold") return "/sold";
  if (pathname === "/warehouse") return "/warehouse";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "/settings";
  if (pathname === "/quotes" || pathname.startsWith("/quotes/")) return "/quotes";
  if (pathname.startsWith("/specific/")) return pathname;
  return null;
}

function renderCachedRoute(cacheKey: string): ReactNode {
  switch (cacheKey) {
    case "/":
      return <MissionControlShell />;
    case "/work-orders":
      return <WorkOrdersWorkspace />;
    case "/accounting":
      return (
        <Suspense fallback={null}>
          <AccountingWorkspace />
        </Suspense>
      );
    case "/motors":
      return <MotorsWorkspace />;
    case "/sold":
      return <SoldWorkspace />;
    case "/warehouse":
      return <WarehouseWorkspace />;
    case "/settings":
      return (
        <Suspense fallback={null}>
          <SettingsWorkspace />
        </Suspense>
      );
    case "/quotes":
      return <QuotesWorkspace />;
    default:
      if (cacheKey.startsWith("/specific/")) {
        const categoryId = cacheKey.replace("/specific/", "");
        return <SpecificCategoryCachedPage categoryId={categoryId} />;
      }
      return null;
  }
}

function trimVisitedKeys(keys: string[], maxPanels: number): string[] {
  if (!Number.isFinite(maxPanels) || keys.length <= maxPanels) return keys;
  return keys.slice(keys.length - maxPanels);
}

type CachedRoutePanelProps = {
  cacheKey: string;
  isActive: boolean;
  instantEnter?: boolean;
};

function CachedRoutePanel({ cacheKey, isActive, instantEnter = false }: CachedRoutePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const wasActiveRef = useRef(false);
  const entering = isActive && !wasActiveRef.current;

  usePanelLifecycle({ isActive, rootRef: panelRef });

  useEffect(() => {
    wasActiveRef.current = isActive;
  }, [isActive]);

  return (
    <div
      ref={panelRef}
      className={cn("min-h-0", isActive ? "flex flex-1 flex-col" : "hidden")}
      aria-hidden={!isActive}
      data-route-cache={cacheKey}
      data-panel-active={isActive ? "true" : "false"}
    >
      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        initial={entering ? (instantEnter ? { opacity: 0.92 } : "initial") : false}
        animate={instantEnter && entering ? { opacity: 1 } : "animate"}
        variants={workOrdersSectionVariants}
        transition={
          instantEnter && entering
            ? { duration: 0.08, ease: "easeOut" }
            : workOrdersSectionTransition
        }
      >
        {renderCachedRoute(cacheKey)}
      </motion.div>
    </div>
  );
}

type DashboardRouteCacheProps = {
  children: ReactNode;
};

export function DashboardRouteCache({ children }: DashboardRouteCacheProps) {
  const pathname = usePathname();
  const { tier } = usePerformanceTier();
  const activeKey = resolveRouteCacheKey(pathname);
  const [visitedKeys, setVisitedKeys] = useState<string[]>(() => (activeKey ? [activeKey] : []));
  const [instantEnterKey, setInstantEnterKey] = useState<string | null>(null);
  const maxPanels = ROUTE_CACHE_MAX_PANELS[tier];

  useEffect(() => {
    if (!activeKey) return;
    setVisitedKeys((current) => {
      const next = current.includes(activeKey) ? current : [...current, activeKey];
      const trimmed = trimVisitedKeys(next, maxPanels);
      const evicted = next.filter((key) => !trimmed.includes(key));
      evicted.forEach((key) => unregisterRouteCacheKey(key));
      trimmed.forEach((key) => registerRouteCacheKey(key));
      return trimmed;
    });
    registerRouteCacheKey(activeKey);
  }, [activeKey, maxPanels]);

  useEffect(() => {
    if (!activeKey) return;
    const handleInstantEnter = (event: Event) => {
      const detail = (event as CustomEvent<{ cacheKey: string }>).detail;
      if (detail?.cacheKey === activeKey) {
        setInstantEnterKey(activeKey);
      }
    };
    window.addEventListener("route-cache:instant-enter", handleInstantEnter);
    return () => window.removeEventListener("route-cache:instant-enter", handleInstantEnter);
  }, [activeKey]);

  useEffect(() => {
    if (instantEnterKey && instantEnterKey !== activeKey) {
      setInstantEnterKey(null);
    }
  }, [activeKey, instantEnterKey]);

  if (!activeKey) {
    return <>{children}</>;
  }

  return (
    <>
      {visitedKeys.map((cacheKey) => (
        <CachedRoutePanel
          key={cacheKey}
          cacheKey={cacheKey}
          isActive={cacheKey === activeKey}
          instantEnter={instantEnterKey === cacheKey}
        />
      ))}
    </>
  );
}

export function notifyInstantCacheEnter(pathname: string): void {
  const cacheKey = resolveRouteCacheKey(pathname);
  if (!cacheKey) return;
  window.dispatchEvent(
    new CustomEvent("route-cache:instant-enter", { detail: { cacheKey } }),
  );
}
