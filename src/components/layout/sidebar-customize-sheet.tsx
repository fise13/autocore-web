"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PanelLeft, PanelRight, RotateCcw } from "lucide-react";

import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { SidebarNavRow } from "@/components/layout/sidebar-nav-row";
import {
  SIDEBAR_BLOCK_META,
  SIDEBAR_NAV_META,
  type SidebarBlockId,
  type SidebarNavItemId,
  type SidebarPosition,
} from "@/lib/navigation/sidebar-customization";
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
  const { customization, setCustomization, setIsEditing, resetCustomization } =
    useSidebarCustomization();

  const hasPool = disabledNav.length > 0 || disabledBlocks.length > 0;

  return (
    <div className="shrink-0 space-y-2 border-t border-sidebar-border/80 px-2 py-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
        >
          Готово
        </button>

        <div className="flex rounded-md border border-sidebar-border/80 p-0.5 text-[10px]">
          {(["left", "right"] as SidebarPosition[]).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() =>
                setCustomization((current) => ({
                  ...current,
                  position: side,
                }))
              }
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors duration-200",
                customization.position === side
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {side === "left" ? <PanelLeft className="size-3" /> : <PanelRight className="size-3" />}
              {side === "left" ? "Слева" : "Справа"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hasPool ? (
          <motion.div
            key="pool"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-3 py-1 text-[10px] text-muted-foreground">Скрытые — нажмите, чтобы вернуть</p>
            <div className="space-y-0.5">
              {disabledNav.map((navId) => {
                const meta = SIDEBAR_NAV_META[navId];
                return (
                  <motion.button
                    key={navId}
                    type="button"
                    layoutId={`nav-${navId}`}
                    onClick={() => onRestoreNav(navId)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="block w-full text-left"
                  >
                    <SidebarNavRow icon={meta.icon} label={meta.label} ghost />
                  </motion.button>
                );
              })}
              {disabledBlocks.map((blockId) => {
                const meta = SIDEBAR_BLOCK_META[blockId];
                return (
                  <motion.button
                    key={blockId}
                    type="button"
                    layoutId={`block-${blockId}`}
                    onClick={() => onRestoreBlock(blockId)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="block w-full text-left"
                  >
                    <SidebarNavRow icon={meta.icon} label={meta.label} ghost />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={resetCustomization}
        className="flex w-full items-center justify-center gap-1 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <RotateCcw className="size-3" />
        По умолчанию
      </button>
    </div>
  );
}
