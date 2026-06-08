"use client";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canAccessMotorsArea } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { ChevronRight, ClipboardList, Download, Package, Plus, Upload, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";

import { deepActionRoutes } from "@/lib/navigation/deep-actions";

type QuickAction =
  | {
      kind: "link";
      href: string;
      label: string;
      description: string;
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
      description: string;
      icon: typeof Upload;
      permission: Parameters<typeof can>[1];
    };

const actions: QuickAction[] = [
  {
    kind: "link",
    href: "/work-orders",
    label: "Заказ-наряд",
    description: "Новый ремонт или сервис.",
    icon: ClipboardList,
    permission: "work_orders_edit",
    shortcut: "O",
  },
  {
    kind: "link",
    href: "/warehouse",
    label: "Склад",
    description: "Остатки и движения.",
    icon: Package,
    permission: "inventory_view",
    requiresWarehouse: true,
  },
  {
    kind: "link",
    href: deepActionRoutes.add(),
    label: "Мотор",
    description: "Добавить позицию в каталог.",
    icon: Plus,
    permission: "inventory_edit",
    requiresMotors: true,
    shortcut: "M",
  },
  {
    kind: "link",
    href: deepActionRoutes.expense(),
    label: "Расход",
    description: "Запись в бухгалтерии.",
    icon: Wallet,
    permission: "accounting_edit",
    shortcut: "E",
  },
  {
    kind: "link",
    href: deepActionRoutes.invite(),
    label: "Пригласить",
    description: "Новый сотрудник в команду.",
    icon: UserPlus,
    permission: "employee_manage",
    shortcut: "I",
    proOnly: true,
  },
  {
    kind: "motor-import",
    label: "Импорт моторов",
    description: "Загрузка из Excel.",
    icon: Upload,
    permission: "import_data",
  },
  {
    kind: "link",
    href: deepActionRoutes.export(),
    label: "Экспорт",
    description: "Выгрузка данных.",
    icon: Download,
    permission: "export_data",
  },
];

export function QuickActionsPanel({
  variant = "default",
  className,
}: {
  variant?: "default" | "dashboard";
  className?: string;
}) {
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

  if (variant === "dashboard") {
    return (
      <aside className={cn("mc-sidebar-panel overflow-hidden", className)}>
        <div className="border-b border-border/50 px-3.5 py-2.5">
          <h2 className="text-sm font-semibold tracking-tight">Быстрые действия</h2>
          <p className="text-xs text-muted-foreground">Короткие пути к частым задачам</p>
        </div>
        <div className="space-y-1 p-2">
          {visible.map((action) => (
            <div key={action.label}>
              {action.kind === "motor-import" ? (
                <button
                  type="button"
                  className="mc-action-tile group w-full py-2 text-left text-sm"
                  onClick={() => requirePro("import", () => triggerMotorImportPicker())}
                >
                  <ActionRowContent action={action} />
                </button>
              ) : (
                <Link href={action.href} className="mc-action-tile group py-2 text-sm">
                  <ActionRowContent action={action} shortcut={action.shortcut} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <Card size="sm" className={cn("mc-quick-actions mc-sidebar-panel overflow-hidden", className)}>
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="text-sm">Быстрые действия</CardTitle>
        <CardDescription>Короткие пути к частым задачам</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 p-2">
        <div className="space-y-1">
          {visible.map((action) => (
            <div key={action.label}>
              {action.kind === "motor-import" ? (
                <button
                  type="button"
                  className="mc-action-tile group w-full py-2 text-left text-sm"
                  onClick={() => requirePro("import", () => triggerMotorImportPicker())}
                >
                  <ActionRowContent action={action} />
                </button>
              ) : (
                <Link href={action.href} className="mc-action-tile group py-2 text-sm">
                  <ActionRowContent action={action} shortcut={action.shortcut} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionRowContent({
  action,
  shortcut,
}: {
  action: QuickAction;
  shortcut?: string;
}) {
  const Icon = action.icon;
  return (
    <>
      <span className="mc-action-icon size-7 [&_svg]:size-3.5">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium">{action.label}</span>
        <span className="block text-xs text-muted-foreground">{action.description}</span>
      </span>
      {shortcut ? (
        <span className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘{shortcut}
        </span>
      ) : (
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      )}
    </>
  );
}
