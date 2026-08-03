"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/overview/dashboard/dashboard-panel";
import type { EmployeeQuickAction } from "@/lib/overview/compute-employee-dashboard";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type McEmployeeQuickActionsProps = {
  actions: EmployeeQuickAction[];
  className?: string;
};

export function McEmployeeQuickActions({ actions, className }: McEmployeeQuickActionsProps) {
  return (
    <McPanel className={cn("shadow-none dark:ring-0", className)}>
      <McPanelHeader title={userCopy.overview.employee.quickActionsTitle} />
      <McPanelBody className="gap-0 p-0">
        <ul>
          {actions.map((action) => (
            <li key={action.id} className="border-t first:border-t-0">
              <Link
                href={action.href}
                className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </McPanelBody>
    </McPanel>
  );
}
