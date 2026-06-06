"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

import { EmployeesWorkspace } from "@/components/employees/employees-workspace";
import { RolesWorkspace } from "@/components/employees/roles-workspace";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

export type CompanyTeamTab = "employees" | "roles";

type CompanyTeamTabsProps = {
  initialTab?: CompanyTeamTab;
};

const tabSpring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.85 };

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let parent = element?.parentElement ?? null;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function readScrollPosition(element: HTMLElement | null): number {
  const scrollParent = findScrollParent(element);
  return scrollParent?.scrollTop ?? window.scrollY;
}

function restoreScrollPosition(element: HTMLElement | null, scrollTop: number) {
  const scrollParent = findScrollParent(element);
  if (scrollParent) {
    scrollParent.scrollTop = scrollTop;
    return;
  }
  window.scrollTo({ top: scrollTop, left: 0, behavior: "auto" });
}

export function CompanyTeamTabs({ initialTab = "employees" }: CompanyTeamTabsProps) {
  const [teamTab, setTeamTab] = useState<CompanyTeamTab>(initialTab);
  const pendingScrollRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  function selectTeamTab(next: CompanyTeamTab) {
    if (next === teamTab) return;
    pendingScrollRef.current = readScrollPosition(contentRef.current);
    setTeamTab(next);
  }

  useLayoutEffect(() => {
    if (pendingScrollRef.current == null) return;
    const savedScroll = pendingScrollRef.current;
    pendingScrollRef.current = null;
    restoreScrollPosition(contentRef.current, savedScroll);
  }, [teamTab]);

  const tabs: { id: CompanyTeamTab; label: string }[] = [
    { id: "employees", label: userCopy.settings.employees },
    { id: "roles", label: userCopy.settings.roles },
  ];

  return (
    <div className="space-y-4">
      <LayoutGroup id="company-team-tabs">
        <div className="inline-flex rounded-lg border bg-background p-0.5">
          {tabs.map((tab) => {
            const active = teamTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  selectTeamTab(tab.id);
                }}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-sm transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="company-team-tab-active"
                    className="absolute inset-0 rounded-md bg-primary/10 shadow-sm"
                    transition={tabSpring}
                  />
                ) : null}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <div ref={contentRef} className="relative overflow-hidden [overflow-anchor:none]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={teamTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {teamTab === "employees" ? <EmployeesWorkspace embedded /> : <RolesWorkspace embedded />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
