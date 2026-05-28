"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import {
  Barcode,
  CloudUpload,
  Download,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Upload,
} from "lucide-react";

import { AccountMenu } from "@/components/account/account-menu";

import { useDashboardLayout } from "@/components/layout/dashboard-layout-context";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";
import { MotorAvailability } from "@/infrastructure/firestore/motor-repository";

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
    search,
    setSearch,
    availability,
    setAvailability,
    saveStatus,
    motorSyncState,
    triggerSync,
    motorExcelIo,
    triggerMotorExport,
    triggerMotorImport,
    registerMotorImportPicker,
    warehouseExcelIo,
    triggerWarehouseExport,
    triggerWarehouseImport,
    registerWarehouseImportPicker,
    triggerWarehouseBarcode,
  } = useWorkspace();
  const { requirePro, isPro } = useBillingGate();

  const importInputRef = useRef<HTMLInputElement>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isSpecificRoute = pathname.startsWith("/specific/");
  const isMotorRoute = pathname === "/motors" || pathname === "/sold";
  const isWarehouseRoute = pathname === "/warehouse";
  const isSoldRoute = pathname === "/sold";
  const showAvailabilityFilter = (pathname === "/motors" || isSpecificRoute) && !isSoldRoute;
  const showExcelIo = isMotorRoute || isWarehouseRoute;

  const syncBadge =
    !isWarehouseRoute &&
    (motorSyncState.localDirty ||
      motorSyncState.remotePending ||
      motorSyncState.status === "error" ||
      saveStatus === "pending");

  const canEdit = can(profile, "inventory_edit");
  const canImportWarehouse = can(profile, "inventory_import");
  const canExportWarehouse = can(profile, "inventory_export");
  const exportBusy = isWarehouseRoute ? warehouseExcelIo.busy === "export" : motorExcelIo.busy === "export";
  const importBusy = isWarehouseRoute ? warehouseExcelIo.busy === "import" : motorExcelIo.busy === "import";
  const canExport = isWarehouseRoute ? warehouseExcelIo.canExport : motorExcelIo.canExport;
  const canImport = isWarehouseRoute ? warehouseExcelIo.canImport : motorExcelIo.canImport;

  useEffect(() => {
    if (!isMotorRoute) {
      registerMotorImportPicker(null);
      return;
    }
    registerMotorImportPicker(() => {
      importInputRef.current?.click();
    });
    return () => registerMotorImportPicker(null);
  }, [isMotorRoute, registerMotorImportPicker]);

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
    requirePro("import", () => importInputRef.current?.click());
  }

  async function handleImportFile(file: File) {
    setExcelError(null);
    requirePro("import", () => void runImport(file));
  }

  async function runImport(file: File) {
    try {
      await triggerMotorImport(file);
    } catch (error) {
      setExcelError(error instanceof Error ? error.message : "Не удалось импортировать файл");
    }
  }

  async function handleSync() {
    setSyncError(null);
    requirePro("sync", () => void runSync());
  }

  async function runSync() {
    const synced = await triggerSync();
    if (!synced) {
      setSyncError(
        isSpecificRoute
          ? "Дождитесь загрузки таблицы"
          : "Откройте «Моторы» или «Специфичные» для синхронизации",
      );
    }
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
        <span className="hidden text-sm font-semibold tracking-tight md:block">AutoCore</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
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

        <div className="relative hidden w-full max-w-[360px] md:block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-no-grid-undo
            placeholder={
              isWarehouseRoute
                ? "Поиск по SKU, названию, бренду..."
                : isSpecificRoute
                  ? "Поиск по записям..."
                  : "Поиск по номеру, бренду, комплектации..."
            }
            className="h-9 bg-muted/30 pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {excelError || syncError ? (
          <span
            className="hidden max-w-[180px] truncate text-xs text-destructive lg:inline"
            title={excelError ?? syncError ?? undefined}
          >
            {excelError ?? syncError}
          </span>
        ) : null}
        {!isWarehouseRoute ? (
          <Button
            variant={syncBadge ? "secondary" : "ghost"}
            size="sm"
            className="hidden gap-1.5 md:inline-flex"
            onClick={() => void handleSync()}
            disabled={motorSyncState.status === "syncing" || saveStatus === "saving"}
            title={userCopy.sync.syncNow}
          >
            <CloudUpload className="size-4" />
            {userCopy.sync.syncNow}
            {syncBadge ? (
              <span className="rounded-full bg-amber-500 px-1.5 py-0 text-[10px] font-semibold text-white">
                !
              </span>
            ) : null}
          </Button>
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
              <Button variant="ghost" size="icon-sm" disabled title="Скоро">
                <Plus className="size-4" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={
                isWarehouseRoute
                  ? !canImportWarehouse || !canImport || importBusy
                  : !canEdit || importBusy
              }
              title={
                isWarehouseRoute
                  ? "Импорт CSV"
                  : isPro
                    ? userCopy.motors.importExcel
                    : userCopy.billing.paywall.import.title
              }
              onClick={handleImportClick}
              className={cn("relative", !isPro && !isWarehouseRoute && "text-primary/80")}
            >
              <Download className="size-4" />
              {!isPro && !isWarehouseRoute ? (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" />
              ) : null}
            </Button>
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
            {isMotorRoute ? (
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleImportFile(file);
                }}
              />
            ) : null}
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
