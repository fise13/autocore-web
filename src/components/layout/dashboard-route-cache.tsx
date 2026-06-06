"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { AccountingWorkspace } from "@/components/accounting/accounting-workspace";
import { MissionControlShell } from "@/components/mission-control/mission-control-shell";
import { MotorsWorkspace } from "@/components/motors/motors-workspace";
import { SoldWorkspace } from "@/components/sold/sold-workspace";
import { WarehouseWorkspace } from "@/components/warehouse/warehouse-workspace";
import { WorkOrdersWorkspace } from "@/components/work-orders/work-orders-workspace";
import { SpecificCategoryCachedPage } from "@/components/layout/specific-category-cached-page";
import {
  workOrdersSectionTransition,
  workOrdersSectionVariants,
} from "@/components/work-orders/work-orders-motion";
import { cn } from "@/lib/utils";

/** Routes that stay mounted in the background when you navigate away (Safari-style, no tab UI). */
export function resolveRouteCacheKey(pathname: string): string | null {
  if (pathname === "/") return "/";
  if (pathname === "/work-orders" || pathname.startsWith("/work-orders/")) return "/work-orders";
  if (pathname === "/accounting") return "/accounting";
  if (pathname === "/motors") return "/motors";
  if (pathname === "/sold") return "/sold";
  if (pathname === "/warehouse") return "/warehouse";
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
    default:
      if (cacheKey.startsWith("/specific/")) {
        const categoryId = cacheKey.replace("/specific/", "");
        return <SpecificCategoryCachedPage categoryId={categoryId} />;
      }
      return null;
  }
}

type CachedRoutePanelProps = {
  cacheKey: string;
  isActive: boolean;
};

function CachedRoutePanel({ cacheKey, isActive }: CachedRoutePanelProps) {
  const wasActiveRef = useRef(false);
  const entering = isActive && !wasActiveRef.current;

  useEffect(() => {
    wasActiveRef.current = isActive;
  }, [isActive]);

  return (
    <div
      className={cn("min-h-0", isActive ? "flex flex-1 flex-col" : "hidden")}
      aria-hidden={!isActive}
      data-route-cache={cacheKey}
    >
      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        initial={entering ? "initial" : false}
        animate="animate"
        variants={workOrdersSectionVariants}
        transition={workOrdersSectionTransition}
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
  const activeKey = resolveRouteCacheKey(pathname);
  const [visitedKeys, setVisitedKeys] = useState<string[]>(() => (activeKey ? [activeKey] : []));

  useEffect(() => {
    if (!activeKey) return;
    setVisitedKeys((current) => (current.includes(activeKey) ? current : [...current, activeKey]));
  }, [activeKey]);

  if (!activeKey) {
    return <>{children}</>;
  }

  return (
    <>
      {visitedKeys.map((cacheKey) => (
        <CachedRoutePanel key={cacheKey} cacheKey={cacheKey} isActive={cacheKey === activeKey} />
      ))}
    </>
  );
}
