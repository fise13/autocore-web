"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Barcode,
  Download,
  PanelLeft,
  Settings,
  Upload,
} from "lucide-react";

import { AccountMenu } from "@/components/account/account-menu";

import { useDashboardLayout } from "@/components/layout/dashboard-layout-context";
import { WorkspaceSearchField } from "@/components/layout/workspace-search-field";
import { DashboardImportProgress } from "@/components/warehouse/import/shared/import-progress-host";
import { MotorImportTriggerButton } from "@/components/motors/motor-import-trigger-button";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { resolveSidebarMode } from "@/lib/navigation/sidebar-mode";
import { userCopy } from "@/lib/user-copy";
import { MotorAvailability } from "@/infrastructure/firestore/motor-repository";

const WORKSPACE_TITLES: Record<string, string> = {
  motors: "Все моторы",
  sold: "Проданные",
  specific: "Специфичные",
  warehouse: "Склад",
};

const availabilityOptions: { value: MotorAvailability; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "available", label: "В наличии" },
  { value: "sold", label: "Продан" },
];

export function WorkspaceToolbar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { toggleSidebar } = useDashboardLayout();
  const {
    availability,
    setAvailability,
    motorExcelIo,
    triggerMotorExport,
    triggerMotorImportPicker,
    warehouseExcelIo,
    triggerWarehouseExport,
    triggerWarehouseImport,
    registerWarehouseImportPicker,
    triggerWarehouseBarcode,
  } = useWorkspace();
  const { requirePro, isPro } = useBillingGate();

  const [excelError, setExcelError] = useState<string | null>(null);
  const sidebarMode = resolveSidebarMode(pathname);
  const isSpecificRoute = pathname.startsWith("/specific/");
  const isMotorRoute = pathname === "/motors" || pathname === "/sold";
  const workspaceTitle = WORKSPACE_TITLES[sidebarMode];
  const isWarehouseRoute = pathname === "/warehouse";
  const isSoldRoute = pathname === "/sold";
  const showAvailabilityFilter = (pathname === "/motors" || isSpecificRoute) && !isSoldRoute;
  const showExcelIo = isMotorRoute || isWarehouseRoute;

  const canEdit = can(profile, "inventory_edit");
  const canImportWarehouse = can(profile, "inventory_import");
  const canExportWarehouse = can(profile, "inventory_export");
  const exportBusy = isWarehouseRoute ? warehouseExcelIo.busy === "export" : motorExcelIo.busy === "export";
  const importBusy = isWarehouseRoute ? warehouseExcelIo.busy === "import" : motorExcelIo.busy === "import";
  const canExport = isWarehouseRoute ? warehouseExcelIo.canExport : motorExcelIo.canExport;
  const canImport = isWarehouseRoute ? warehouseExcelIo.canImport : motorExcelIo.canImport;

  useEffect(() => {
    if (!isWarehouseRoute) {
      registerWarehouseImportPicker(null);
      return;
    }
    registerWarehouseImportPicker(() => {
      void triggerWarehouseImport();
    });
    return () => registerWarehouseImportPicker(null);
  }, [isWarehouseRoute, registerWarehouseImportPicker, triggerWarehouseImport]);

  async function handleExport() {
    setExcelError(null);
    if (isWarehouseRoute) {
      await runExport();
      return;
    }
    if (!requirePro("export", () => void runExport())) return;
  }

  async function runExport() {
    try {
      if (isWarehouseRoute) {
        await triggerWarehouseExport();
      } else {
        await triggerMotorExport();
      }
    } catch (error) {
      setExcelError(error instanceof Error ? error.message : "Не удалось экспортировать файл");
    }
  }

  function handleImportClick() {
    setExcelError(null);
    if (isWarehouseRoute) {
      void triggerWarehouseImport();
      return;
    }
    requirePro("import", () => {
      if (!triggerMotorImportPicker()) {
        setExcelError("Импорт недоступен");
      }
    });
  }

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      <div className="flex min-w-[88px] items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          title="Показать/скрыть боковую панель"
          className="hidden md:inline-flex"
        >
          <PanelLeft className="size-4" />
        </Button>
        <span className="hidden text-sm font-semibold tracking-tight md:block">
          {workspaceTitle ?? "AutoCore"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3 px-1">
        <DashboardImportProgress variant="compact" />

        {showAvailabilityFilter ? (
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
            {availabilityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAvailability(option.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  availability === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {(isWarehouseRoute || isMotorRoute || isSpecificRoute) ? (
            <WorkspaceSearchField
              className="hidden md:block"
            placeholder={
              isWarehouseRoute
                ? "Поиск по артикулу, названию, бренду..."
                : isSpecificRoute
                  ? "Поиск по записям..."
                  : "Поиск по номеру, бренду, комплектации..."
            }
          />
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {excelError ? (
          <span
            className="hidden max-w-[180px] truncate text-xs text-destructive lg:inline"
            title={excelError}
          >
            {excelError}
          </span>
        ) : null}
        {showExcelIo ? (
          <>
            {isWarehouseRoute ? (
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!canEdit}
                title="Сканер штрихкода"
                onClick={() => {
                  if (!triggerWarehouseBarcode()) {
                    setExcelError("Сканер склада ещё не готов");
                  }
                }}
              >
                <Barcode className="size-4" />
              </Button>
            ) : null}
            {isMotorRoute ? (
              <MotorImportTriggerButton size="sm" showLabel={false} variant="ghost" />
            ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canImportWarehouse || !canImport || importBusy}
              title="Импорт CSV"
              onClick={handleImportClick}
            >
              <Download className="size-4" />
            </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={
                exportBusy ||
                (isWarehouseRoute
                  ? !canExportWarehouse || !canExport
                  : !canEdit || (isPro && !canExport))
              }
              title={
                isWarehouseRoute
                  ? "Экспорт CSV"
                  : isPro
                    ? "Экспорт в Excel"
                    : userCopy.billing.paywall.export.title
              }
              onClick={() => void handleExport()}
              className={cn("relative", !isPro && !isWarehouseRoute && "text-primary/80")}
            >
              <Upload className="size-4" />
              {!isPro && !isWarehouseRoute ? (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" />
              ) : null}
            </Button>
          </>
        ) : null}
        <Link href="/settings" title="Настройки">
          <Button variant="ghost" size="icon-sm">
            <Settings className="size-4" />
          </Button>
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
