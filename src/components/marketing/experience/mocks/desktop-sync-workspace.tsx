"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Package, Radio } from "lucide-react";

import type { PlatformSyncStep } from "@/components/marketing/experience/motion/platform-sync-steps";
import { isPlatformStepAtLeast } from "@/components/marketing/experience/motion/platform-sync-steps";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { LiveBadge } from "@/components/marketing/experience/ui/live-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BASE_STOCK = 4891;
const NEW_STOCK = 4892;

const ACTIVITY = [
  { id: "a1", text: "Резерв создан", meta: "НЗ-0142 · Мастерская", time: "12:41" },
  { id: "a2", text: "Позиция на складе", meta: "G4KC · A-12", time: "сейчас" },
] as const;

type DesktopSyncWorkspaceProps = {
  step: PlatformSyncStep;
  className?: string;
  variant?: "panel" | "device";
};

export function DesktopSyncWorkspace({ step, className, variant = "panel" }: DesktopSyncWorkspaceProps) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [stock, setStock] = useState(BASE_STOCK);

  const showNotification = isPlatformStepAtLeast(step, "save");
  const showRow = isPlatformStepAtLeast(step, "sync");
  const isLive = step === "live";
  const isReceiving = step === "detect" || step === "sync";

  useEffect(() => {
    if (reduced) {
      setStock(isPlatformStepAtLeast(step, "sync") ? NEW_STOCK : BASE_STOCK);
      return;
    }
    if (!isPlatformStepAtLeast(step, "sync")) {
      setStock(BASE_STOCK);
      return;
    }

    const counter = { value: BASE_STOCK };
    gsap.to(counter, {
      value: NEW_STOCK,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => setStock(Math.round(counter.value)),
    });
  }, [reduced, step]);

  useEffect(() => {
    if (reduced || !panelRef.current || step !== "detect") return;

    gsap.fromTo(
      panelRef.current,
      { boxShadow: "0 0 0 0 color-mix(in srgb, var(--primary) 0%, transparent)" },
      {
        boxShadow: "0 0 0 1px color-mix(in srgb, var(--primary) 28%, transparent)",
        duration: 0.35,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
      },
    );
  }, [reduced, step]);

  const syncLabel = isLive
    ? "Синхронизировано"
    : isReceiving
      ? "Получение данных"
      : showNotification
        ? "Обработка"
        : "Ожидание";

  const showToast = step === "live";
  const isDevice = variant === "device";

  return (
    <div ref={panelRef} className={cn("relative rounded-xl", isDevice && "device-desktop-app", className)}>
      <AnimatePresence>
        {showToast ? (
          <motion.div
            className="device-desktop-toast"
            initial={reduced ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="status"
          >
            Inventory updated
          </motion.div>
        ) : null}
      </AnimatePresence>

      <McPanel className={cn("shadow-none dark:ring-0", isDevice && "border-0 bg-transparent shadow-none ring-0")}>
        {!isDevice ? (
          <McPanelHeader
            title="Mission Control · Склад"
            description="Рабочее место мастера"
            bordered
            badge={
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={cn(
                    "transition-opacity duration-300",
                    isLive ? "opacity-100" : "pointer-events-none opacity-0",
                  )}
                  aria-hidden={!isLive}
                >
                  <LiveBadge label="Live" />
                </div>
                <Badge variant="outline" className="gap-1 font-normal text-[10px]">
                  <Radio className={cn("size-3", isReceiving && !reduced && "animate-pulse")} aria-hidden />
                  {syncLabel}
                </Badge>
              </div>
            }
          />
        ) : null}

        <McPanelBody className={cn("flex flex-col gap-3", isDevice ? "p-0 pt-0" : "pt-3")}>
          <div className={cn("grid gap-2", isDevice ? "grid-cols-3" : "grid-cols-3")}>
            <MetricTile label="На складе" value={stock} highlight={showRow} compact={isDevice} />
            <MetricTile label="Резервы" value={isPlatformStepAtLeast(step, "save") ? 13 : 12} compact={isDevice} />
            <MetricTile label="Сегодня" value={isPlatformStepAtLeast(step, "sync") ? 4 : 3} compact={isDevice} />
          </div>

          {!isDevice ? (
            <div
              className={cn(
                "overflow-hidden rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 transition-opacity duration-300",
                showNotification ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              aria-hidden={!showNotification}
            >
              <p className="text-xs font-medium text-foreground">Новая позиция с телефона</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">G4KC · 2.4L · полка A-12</p>
            </div>
          ) : null}

          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-2">
              <span className="text-xs font-medium">Инвентарь</span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {isLive ? "обновлено сейчас" : "—"}
              </span>
            </div>
            <ul className="divide-y divide-border">
              <li className="flex items-center justify-between px-3 py-2.5 text-xs text-muted-foreground">
                <span>2.0T · B48</span>
                <span className="font-mono tabular-nums">B-04</span>
              </li>
              <motion.li
                initial={false}
                animate={{ opacity: showRow ? 1 : 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 text-xs",
                  isLive && showRow && "bg-primary/5",
                  !showRow && "pointer-events-none",
                )}
                aria-hidden={!showRow}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Package className="size-3 text-primary" aria-hidden />
                  G4KC · A-12
                </span>
                <Badge variant="outline" className="h-5 font-normal text-[10px]">
                  В наличии
                </Badge>
              </motion.li>
            </ul>
          </div>

          <div className="rounded-lg border border-border">
            <div className="border-b border-border bg-muted/20 px-3 py-2">
              <span className="text-xs font-medium">Активность</span>
            </div>
            <ul className="divide-y divide-border">
              {ACTIVITY.map((item, index) => {
                const visible = index === 0 || isPlatformStepAtLeast(step, "live");

                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-start justify-between gap-3 px-3 py-2.5 transition-opacity duration-300",
                      visible ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                    aria-hidden={!visible}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{item.text}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.meta}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                      {item.time}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </McPanelBody>
      </McPanel>
    </div>
  );
}

function MetricTile({
  label,
  value,
  highlight,
  compact,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <Card
      className={cn(
        "shadow-none dark:ring-0",
        highlight && "border-primary/30 bg-primary/5",
        compact && "gap-0 py-0",
      )}
    >
      <CardHeader className={cn("pb-0", compact && "px-2 pt-2")}>
        <CardTitle className={cn("font-normal text-muted-foreground", compact ? "text-[8px]" : "text-[10px]")}>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("pt-1", compact && "px-2 pb-2 pt-0")}>
        <span className={cn("font-semibold tabular-nums", compact ? "text-sm" : "text-lg")}>
          {value.toLocaleString("ru-RU")}
        </span>
      </CardContent>
    </Card>
  );
}
