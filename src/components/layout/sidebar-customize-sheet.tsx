"use client";

import { PanelLeft, PanelRight, RotateCcw } from "lucide-react";
import { motion } from "motion/react";

import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { useSidebarPreferences } from "@/components/providers/sidebar-preferences-provider";
import { SidebarNavRow } from "@/components/layout/sidebar-nav-row";
import { useSidebarEditMode } from "@/hooks/use-sidebar-edit-mode";
import {
  SIDEBAR_BLOCK_META,
  SIDEBAR_NAV_META,
  DEFAULT_SIDEBAR_CUSTOMIZATION,
  type SidebarBlockId,
  type SidebarNavItemId,
  type SidebarPosition,
} from "@/lib/navigation/sidebar-customization";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type SidebarCustomizeSheetProps = {
  disabledNav: SidebarNavItemId[];
  disabledBlocks: SidebarBlockId[];
  onRestoreNav: (id: SidebarNavItemId) => void;
  onRestoreBlock: (id: SidebarBlockId) => void;
};

export function SidebarCustomizeSheet({
  disabledNav,
  disabledBlocks,
  onRestoreNav,
  onRestoreBlock,
}: SidebarCustomizeSheetProps) {
  const { customization, setCustomization, resetCustomization } = useSidebarCustomization();
  const { setPreferences } = useSidebarPreferences();
  const { exitEditMode } = useSidebarEditMode();

  function setSidebarPosition(side: SidebarPosition) {
    setCustomization((current) => ({ ...current, position: side }));
    setPreferences((current) => ({ ...current, position: side }));
  }

  const hasPool = disabledNav.length > 0 || disabledBlocks.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 flex shrink-0 flex-col gap-2 border-t border-sidebar-border/80 bg-sidebar px-2 py-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-1">
        <button
          type="button"
          onClick={exitEditMode}
          className="shrink-0 text-xs font-medium text-primary transition-opacity hover:opacity-80"
        >
          {userCopy.layout.done}
        </button>

        <div className="relative flex shrink-0 rounded-md border border-sidebar-border/80 p-0.5 text-micro">
          {(["left", "right"] as SidebarPosition[]).map((side) => {
            const active = customization.position === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => setSidebarPosition(side)}
                className={cn(
                  "relative z-10 inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors duration-200",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="sidebar-position-pill"
                    className="absolute inset-0 -z-10 rounded bg-sidebar-accent"
                    transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
                  />
                ) : null}
                {side === "left" ? <PanelLeft className="size-3" /> : <PanelRight className="size-3" />}
                {side === "left" ? userCopy.layout.positionLeft : userCopy.layout.positionRight}
              </button>
            );
          })}
        </div>
      </div>

      {hasPool ? (
        <div className="min-h-0 overflow-hidden">
          <p className="px-3 py-1 text-micro text-muted-foreground">
            {userCopy.layout.hiddenPoolHint}
          </p>
          <div className="max-h-[min(38vh,11rem)] space-y-0.5 overflow-y-auto overscroll-y-contain pr-0.5">
            {disabledNav.map((navId) => {
              const meta = SIDEBAR_NAV_META[navId];
              return (
                <button
                  key={navId}
                  type="button"
                  onClick={() => onRestoreNav(navId)}
                  className="block w-full text-left opacity-100"
                >
                  <SidebarNavRow icon={meta.icon} label={meta.label} ghost />
                </button>
              );
            })}
            {disabledBlocks.map((blockId) => {
              const meta = SIDEBAR_BLOCK_META[blockId];
              return (
                <button
                  key={blockId}
                  type="button"
                  onClick={() => onRestoreBlock(blockId)}
                  className="block w-full text-left opacity-100"
                >
                  <SidebarNavRow icon={meta.icon} label={meta.label} ghost />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          resetCustomization();
          setPreferences((current) => ({
            ...current,
            position: DEFAULT_SIDEBAR_CUSTOMIZATION.position,
          }));
        }}
        className="flex w-full shrink-0 items-center justify-center gap-1 py-1 text-micro text-muted-foreground transition-colors hover:text-foreground"
      >
        <RotateCcw className="size-3" />
        {userCopy.layout.resetDefaults}
      </button>
    </motion.div>
  );
}
