"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  Barcode,
  Download,
  LayoutGrid,
  MinusCircle,
  Plus,
  Receipt,
  RotateCcw,
  Upload,
  Wallet,
} from "lucide-react";

import { AnimatedSidebarSlot } from "@/components/layout/animated-sidebar-slot";
import { WorkOrdersSidebarContext } from "@/components/work-orders/work-orders-sidebar-context";
import { WarehouseSidebarContext } from "@/components/warehouse/warehouse-sidebar-context";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { deepActionRoutes } from "@/lib/navigation/deep-actions";
import { showSidebarContextInSidebar, type SidebarMode } from "@/lib/navigation/sidebar-mode";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const ACCOUNTING_TABS = [
  { value: "overview", label: "Обзор" },
  { value: "cashbox", label: "Касса" },
  { value: "expenses", label: "Расходы" },
  { value: "operations", label: "Операции" },
  { value: "advances", label: "Авансы" },
] as const;

type SidebarContextPanelProps = {
  mode: SidebarMode;
};

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-1 py-1">
      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={hint}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200",
        "text-sidebar-foreground hover:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      <Icon className="size-4 shrink-0 opacity-80" />
      <span>{label}</span>
    </button>
  );
}

function SidebarContextContent({ mode }: SidebarContextPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { requirePro, isPro } = useBillingGate();
  const {
    triggerMotorExport,
    triggerMotorImportPicker,
    triggerWarehouseExport,
    triggerWarehouseImportPicker,
    triggerWarehouseBarcode,
    motorExcelIo,
    warehouseExcelIo,
  } = useWorkspace();

  const canEditInventory = can(profile, "inventory_edit");
  const canImportWarehouse = can(profile, "inventory_import");
  const canExportWarehouse = can(profile, "inventory_export");
  const canEditAccounting = can(profile, "accounting_edit");

  const accountingTab = searchParams.get("tab") ?? "overview";

  if (mode === "motors" || mode === "specific") {
    return (
      <PanelSection title="Моторы">
        {mode === "specific" ? (
          <Link
            href="/motors"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent"
          >
            <LayoutGrid className="size-4 shrink-0 opacity-80" />
            Все моторы
          </Link>
        ) : null}
        {mode === "motors" ? (
          <>
            <ActionButton
              icon={Download}
              label={userCopy.motors.importExcel}
              disabled={!canEditInventory || motorExcelIo.busy === "import"}
              onClick={() => {
                requirePro("import", () => {
                  if (!triggerMotorImportPicker()) {
                    router.push(deepActionRoutes.import());
                  }
                });
              }}
            />
            <ActionButton
              icon={Upload}
              label="Экспорт Excel"
              disabled={!canEditInventory || !motorExcelIo.canExport || motorExcelIo.busy === "export"}
              onClick={() => {
                requirePro("export", () => void triggerMotorExport().catch(() => undefined));
              }}
            />
            {!isPro ? (
              <p className="px-3 text-[11px] text-muted-foreground">Импорт и экспорт — на тарифе Pro</p>
            ) : null}
          </>
        ) : null}
        <ActionButton
          icon={Receipt}
          label="Продать мотор"
          disabled={!canEditInventory}
          onClick={() => router.push(deepActionRoutes.sell())}
        />
        <ActionButton
          icon={Plus}
          label="Добавить мотор"
          disabled={!canEditInventory}
          onClick={() => router.push(deepActionRoutes.add())}
        />
      </PanelSection>
    );
  }

  if (mode === "sold") {
    return (
      <PanelSection title="Проданные">
        <Link
          href="/motors"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent"
        >
          <LayoutGrid className="size-4 shrink-0 opacity-80" />
          Все моторы
        </Link>
        <p className="flex items-start gap-2 px-3 py-1 text-[11px] leading-relaxed text-muted-foreground">
          <RotateCcw className="mt-0.5 size-3.5 shrink-0 opacity-70" />
          Вернуть в наличие — правый клик по мотору в таблице.
        </p>
        <ActionButton
          icon={Upload}
          label="Экспорт Excel"
          disabled={!canEditInventory || !motorExcelIo.canExport || motorExcelIo.busy === "export"}
          onClick={() => {
            requirePro("export", () => void triggerMotorExport().catch(() => undefined));
          }}
        />
      </PanelSection>
    );
  }

  if (mode === "work_orders") {
    return <WorkOrdersSidebarContext />;
  }

  if (mode === "warehouse") {
    return (
      <>
        <WarehouseSidebarContext />
        <PanelSection title="Действия">
        <ActionButton
          icon={Barcode}
          label="Сканер штрихкода"
          disabled={!canEditInventory}
          onClick={() => triggerWarehouseBarcode()}
        />
        <ActionButton
          icon={Download}
          label="Импорт CSV"
          disabled={!canImportWarehouse || !warehouseExcelIo.canImport || warehouseExcelIo.busy === "import"}
          onClick={() => triggerWarehouseImportPicker()}
        />
        <ActionButton
          icon={Upload}
          label="Экспорт CSV"
          disabled={!canExportWarehouse || !warehouseExcelIo.canExport || warehouseExcelIo.busy === "export"}
          onClick={() => void triggerWarehouseExport().catch(() => undefined)}
        />
        <ActionButton
          icon={MinusCircle}
          label="Корректировка остатков"
          hint="Выберите позицию в таблице → контекстное меню"
          disabled={!canEditInventory}
        />
        <p className="px-3 text-[11px] leading-relaxed text-muted-foreground">
          Приход, продажа и перемещение — через контекстное меню строки.
        </p>
        </PanelSection>
      </>
    );
  }

  if (mode === "accounting") {
    return (
      <PanelSection title="Бухгалтерия">
        {ACCOUNTING_TABS.map((tab) => {
          const href = `/accounting?tab=${tab.value}`;
          const active = pathname === "/accounting" && accountingTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                active
                  ? "bg-primary/12 text-primary shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
        <div className="pt-1">
          <Button
            type="button"
            size="sm"
            className="mx-2 w-[calc(100%-1rem)]"
            disabled={!canEditAccounting}
            onClick={() => router.push(deepActionRoutes.expense())}
          >
            <Wallet className="size-4" />
            Новая операция
          </Button>
        </div>
      </PanelSection>
    );
  }

  return null;
}

export function SidebarContextPanel({ mode }: SidebarContextPanelProps) {
  const visible = showSidebarContextInSidebar(mode);

  return (
    <AnimatedSidebarSlot slotKey={visible ? mode : "context-empty"}>
      {visible ? <SidebarContextContent mode={mode} /> : null}
    </AnimatedSidebarSlot>
  );
}
