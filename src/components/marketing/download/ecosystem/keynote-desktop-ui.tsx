"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Check,
  LayoutGrid,
  Package,
  Radio,
  Warehouse,
} from "lucide-react";

import type { KeynoteSceneSnapshot } from "@/components/marketing/download/ecosystem/use-ecosystem-keynote-timeline";
import { cn } from "@/lib/utils";

type KeynoteDesktopUiProps = {
  snapshot: KeynoteSceneSnapshot;
};

const NAV = [
  { icon: LayoutGrid, label: "Обзор", active: false },
  { icon: Warehouse, label: "Склад", active: true },
  { icon: Package, label: "Инвентарь", active: false },
  { icon: Activity, label: "Активность", active: false },
] as const;

export function KeynoteDesktopUi({ snapshot }: KeynoteDesktopUiProps) {
  const synced = snapshot.desktopStatus === "synced";
  const receiving = snapshot.desktopStatus === "receiving";

  return (
    <div className="keynote-desktop-shell">
      <aside className="keynote-desktop-sidebar" aria-hidden>
        <div className="keynote-desktop-sidebar-brand">AutoCore</div>
        <ul className="keynote-desktop-sidebar-nav">
          {NAV.map(({ icon: Icon, label, active }) => (
            <li key={label}>
              <span className={cn("keynote-desktop-sidebar-link", active && "is-active")}>
                <Icon className="size-3" aria-hidden />
                {label}
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="keynote-desktop-main">
        <header className="keynote-desktop-toolbar">
          <div>
            <p className="keynote-desktop-toolbar-title">Mission Control</p>
            <p className="keynote-desktop-toolbar-meta">Склад · live sync</p>
          </div>
          <span
            className={cn(
              "keynote-desktop-sync-badge",
              receiving && "is-receiving",
              synced && "is-synced",
            )}
          >
            {synced ? (
              <>
                <Check className="size-2.5" aria-hidden />
                Синхронизировано
              </>
            ) : receiving ? (
              <>
                <Radio className="size-2.5" aria-hidden />
                Получение…
              </>
            ) : (
              "Ожидание"
            )}
          </span>
        </header>

        <AnimatePresence>
          {snapshot.showNotification ? (
            <motion.div
              className="keynote-desktop-toast"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Radio className="size-3 text-primary" aria-hidden />
              <span>Новый резерв с iPhone</span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="keynote-desktop-content">
          <div className="keynote-desktop-kpis">
            <Kpi label="На складе" value={snapshot.stock} highlight={snapshot.showNewRow} />
            <Kpi label="Резервы" value={snapshot.reserves} highlight={snapshot.reserves > 12} />
          </div>

          <div className="keynote-desktop-inventory">
            <div className="keynote-desktop-section-head">
              <span>Инвентарь</span>
              <span className="keynote-desktop-section-meta">
                {snapshot.showNewRow ? "live" : "—"}
              </span>
            </div>
            <ul className="keynote-desktop-rows">
              <li className="keynote-desktop-row is-muted">
                <span>2.0T · B48</span>
                <span className="keynote-desktop-row-meta">B-04</span>
              </li>
              <AnimatePresence>
                {snapshot.showNewRow ? (
                  <motion.li
                    key="g4kc"
                    className="keynote-desktop-row is-new"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Package className="size-3 text-primary" aria-hidden />
                      G4KC · A-12
                    </span>
                    <span className="keynote-desktop-row-badge">В наличии</span>
                  </motion.li>
                ) : null}
              </AnimatePresence>
            </ul>
          </div>

          <div className="keynote-desktop-activity">
            <div className="keynote-desktop-section-head">
              <span>Активность</span>
            </div>
            <ul className="keynote-desktop-rows">
              <li className="keynote-desktop-row is-muted">
                <span>Резерв создан</span>
                <span className="keynote-desktop-row-meta">12:41</span>
              </li>
              <AnimatePresence>
                {snapshot.showNewActivity ? (
                  <motion.li
                    key="activity-new"
                    className="keynote-desktop-row is-new"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span>Резерв создан</span>
                    <span className="keynote-desktop-row-meta">сейчас</span>
                  </motion.li>
                ) : null}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={cn("keynote-desktop-kpi", highlight && "is-highlight")}>
      <span className="keynote-desktop-kpi-label">{label}</span>
      <motion.span
        key={value}
        className="keynote-desktop-kpi-value"
        initial={{ opacity: 0.55, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {value.toLocaleString("ru-RU")}
      </motion.span>
    </div>
  );
}
