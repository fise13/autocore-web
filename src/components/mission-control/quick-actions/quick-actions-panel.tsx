"use client";

import Link from "next/link";
import { Download, Plus, RefreshCw, Upload, UserPlus, Wallet, Zap } from "lucide-react";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { can } from "@/lib/auth/permissions";
import { deepActionRoutes } from "@/lib/navigation/deep-actions";
import { cn } from "@/lib/utils";

const actions = [
  {
    href: deepActionRoutes.add(),
    label: "Добавить мотор",
    icon: Plus,
    permission: "inventory_edit" as const,
    shortcut: "M",
  },
  {
    href: deepActionRoutes.expense(),
    label: "Добавить расход",
    icon: Wallet,
    permission: "accounting_edit" as const,
    shortcut: "E",
  },
  {
    href: deepActionRoutes.invite(),
    label: "Пригласить",
    icon: UserPlus,
    permission: "employee_manage" as const,
    shortcut: "I",
    proOnly: true,
  },
  {
    href: deepActionRoutes.import(),
    label: "Импорт Excel",
    icon: Upload,
    permission: "import_data" as const,
  },
  {
    href: deepActionRoutes.export(),
    label: "Экспорт",
    icon: Download,
    permission: "export_data" as const,
  },
  {
    href: deepActionRoutes.sync(),
    label: "Синхронизация",
    icon: RefreshCw,
    permission: "inventory_edit" as const,
  },
];

export function QuickActionsPanel() {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();

  const visible = actions.filter((action) => can(profile, action.permission) && (!action.proOnly || isPro));
  if (visible.length === 0) return null;

  return (
    <div className="mc-sidebar-panel p-3">
      <div className="mb-3 flex items-center gap-2 px-1">
        <div className="mc-action-icon">
          <Zap className="size-3.5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Быстрые действия</p>
          <p className="text-[11px] text-muted-foreground">Частые операции одним кликом</p>
        </div>
      </div>
      <div className="grid gap-1.5">
        {visible.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={cn("mc-action-tile group")}
          >
            <span className="mc-action-icon transition-transform group-hover:scale-105">
              <action.icon className="size-3.5" />
            </span>
            <span className="font-medium">{action.label}</span>
            {action.shortcut ? (
              <span className="ml-auto rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ⌘{action.shortcut}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
