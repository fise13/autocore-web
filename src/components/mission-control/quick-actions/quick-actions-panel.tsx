"use client";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useAuth } from "@/components/providers/auth-provider";
import { canAccessMotorsArea } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ClipboardList, Download, Package, Plus, Upload, UserPlus, Wallet, Zap } from "lucide-react";
import Link from "next/link";

import { mcCardVariants, mcPageVariants } from "@/lib/motion/mission-control-motion";
import { deepActionRoutes } from "@/lib/navigation/deep-actions";

type QuickAction =
  | {
      kind: "link";
      href: string;
      label: string;
      icon: typeof Plus;
      permission: Parameters<typeof can>[1];
      shortcut?: string;
      proOnly?: boolean;
      requiresMotors?: boolean;
      requiresWarehouse?: boolean;
    }
  | {
      kind: "motor-import";
      label: string;
      icon: typeof Upload;
      permission: Parameters<typeof can>[1];
    };

const actions: QuickAction[] = [
  {
    kind: "link",
    href: "/work-orders",
    label: "Заказ-наряд",
    icon: ClipboardList,
    permission: "work_orders_edit",
    shortcut: "O",
  },
  {
    kind: "link",
    href: "/warehouse",
    label: "Склад",
    icon: Package,
    permission: "inventory_view",
    requiresWarehouse: true,
  },
  {
    kind: "link",
    href: deepActionRoutes.add(),
    label: "Мотор",
    icon: Plus,
    permission: "inventory_edit",
    requiresMotors: true,
    shortcut: "M",
  },
  {
    kind: "link",
    href: deepActionRoutes.expense(),
    label: "Расход",
    icon: Wallet,
    permission: "accounting_edit",
    shortcut: "E",
  },
  {
    kind: "link",
    href: deepActionRoutes.invite(),
    label: "Пригласить",
    icon: UserPlus,
    permission: "employee_manage",
    shortcut: "I",
    proOnly: true,
  },
  {
    kind: "motor-import",
    label: "Импорт моторов",
    icon: Upload,
    permission: "import_data",
  },
  {
    kind: "link",
    href: deepActionRoutes.export(),
    label: "Экспорт",
    icon: Download,
    permission: "export_data",
  },
];

export function QuickActionsPanel() {
  const { profile } = useAuth();
  const { isPro, requirePro } = useBillingGate();
  const { triggerMotorImportPicker } = useWorkspace();

  const visible = actions.filter((action) => {
    if (!can(profile, action.permission)) return false;
    if (action.kind === "link" && action.proOnly && !isPro) return false;
    if (action.kind === "link" && action.requiresMotors && !canAccessMotorsArea(profile)) return false;
    if (action.kind === "link" && action.requiresWarehouse && !can(profile, "inventory_view")) return false;
    if (action.kind === "motor-import" && !canAccessMotorsArea(profile)) return false;
    return true;
  });
  if (visible.length === 0) return null;

  return (
    <div className="mc-sidebar-panel p-2.5">
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="mc-action-icon size-7 [&_svg]:size-3.5">
          <Zap className="size-3.5" />
        </div>
        <p className="text-sm font-semibold tracking-tight">Действия</p>
      </div>
      <motion.div
        variants={mcPageVariants}
        initial="hidden"
        animate="show"
        className="grid gap-1"
      >
        {visible.map((action) => (
          <motion.div key={action.label} variants={mcCardVariants}>
            {action.kind === "motor-import" ? (
              <button
                type="button"
                className={cn("mc-action-tile group w-full py-2 text-left text-sm")}
                onClick={() => requirePro("import", () => triggerMotorImportPicker())}
              >
                <span className="mc-action-icon size-7 transition-transform group-hover:scale-105 [&_svg]:size-3.5">
                  <action.icon className="size-3.5" />
                </span>
                <span className="font-medium">{action.label}</span>
              </button>
            ) : (
              <Link href={action.href} className={cn("mc-action-tile group py-2 text-sm")}>
                <span className="mc-action-icon size-7 transition-transform group-hover:scale-105 [&_svg]:size-3.5">
                  <action.icon className="size-3.5" />
                </span>
                <span className="font-medium">{action.label}</span>
                {action.shortcut ? (
                  <span className="ml-auto rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    ⌘{action.shortcut}
                  </span>
                ) : null}
              </Link>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
