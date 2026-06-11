"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Barcode,
  Download,
  PanelLeft,
  Settings,
  Upload,
} from "lucide-react";

import { AccountMenu } from "@/components/account/account-menu";
import { AppLogo } from "@/components/brand/app-logo";
import { useDashboardLayout } from "@/components/layout/dashboard-layout-context";
import {
  dashboardTopBarSlotVariants,
  dashboardTopBarTransition,
} from "@/components/layout/dashboard-top-bar-motion";
import { WorkspaceSearchField } from "@/components/layout/workspace-search-field";
import { DashboardImportProgress } from "@/components/warehouse/import/shared/import-progress-host";
import { MotorImportTriggerButton } from "@/components/motors/motor-import-trigger-button";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { canAccessMotorsArea } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { resolveSidebarMode, type SidebarMode } from "@/lib/navigation/sidebar-mode";
import { userCopy } from "@/lib/user-copy";
import { MotorAvailability } from "@/infrastructure/firestore/motor-repository";

const WORKSPACE_TITLES: Partial<Record<SidebarMode, string>> = {
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

function isWorkspaceRoute(pathname: string): boolean {
  return (
    pathname === "/motors" ||
    pathname === "/sold" ||
    pathname.startsWith("/specific/") ||
    pathname === "/warehouse"
  );
}

function topBarLeftKey(mode: SidebarMode, workspace: boolean): string {
  if (workspace) return `workspace-${mode}`;
  return "app-brand";
}

function topBarCenterKey(mode: SidebarMode, workspace: boolean): string {
  if (workspace) {
    if (mode === "warehouse") return "center-warehouse";
    if (mode === "sold") return "center-sold";
    if (mode === "motors") return "center-motors-filters";
    if (mode === "specific") return "center-specific-filters";
    return "center-workspace";
  }
  return mode === "home" ? "center-home" : `center-app-${mode}`;
}

function topBarRightKey(mode: SidebarMode, workspace: boolean): string {
  if (workspace) {
    if (mode === "motors" || mode === "sold") return "right-motor-excel";
    if (mode === "warehouse") return "right-warehouse-excel";
    return "right-workspace-minimal";
  }
  return mode === "home" ? "right-home" : "right-app";
}

function AnimatedSlot({
  slotKey,
  children,
  className,
}: {
  slotKey: string;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={slotKey}
        className={className}
        variants={dashboardTopBarSlotVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={dashboardTopBarTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function DashboardTopBar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { sidebarCollapsed, toggleSidebar, toggleMobileSidebar } = useDashboardLayout();
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
  const workspace = isWorkspaceRoute(pathname);
  const isSpecificRoute = pathname.startsWith("/specific/");
  const isMotorRoute = pathname === "/motors" || pathname === "/sold";
  const isAllMotorsRoute = pathname === "/motors";
  const isWarehouseRoute = pathname === "/warehouse";
  const isSoldRoute = pathname === "/sold";
  const isMissionControlRoute = pathname === "/";
  const workspaceTitle = WORKSPACE_TITLES[sidebarMode];
  const showAvailabilityFilter = (pathname === "/motors" || isSpecificRoute) && !isSoldRoute;
  const showExcelIo = isMotorRoute || isWarehouseRoute;
  const canViewMotors = canAccessMotorsArea(profile);

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

  async function handleExport() {
    setExcelError(null);
    if (isWarehouseRoute) {
      await runExport();
      return;
    }
    if (!requirePro("export", () => void runExport())) return;
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

  const leftKey = topBarLeftKey(sidebarMode, workspace);
  const centerKey = topBarCenterKey(sidebarMode, workspace);
  const rightKey = topBarRightKey(sidebarMode, workspace);

  return (
    <header
      className={cn(
        "relative z-30 flex h-14 shrink-0 items-center gap-3 overflow-hidden border-b px-4 md:px-5",
        workspace ? "bg-card" : "bg-card/95 backdrop-blur-sm",
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleMobileSidebar}
          title="Меню"
          aria-label="Открыть меню"
          className="md:hidden"
        >
          <PanelLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          title="Свернуть боковую панель (⌘B)"
          className="hidden md:inline-flex"
        >
          <PanelLeft
            className={cn(
              "size-4 transition-transform duration-200 ease-linear motion-reduce:transition-none",
              sidebarCollapsed && "rotate-180",
            )}
          />
        </Button>
        <Separator orientation="vertical" className="hidden h-4 md:block" />
        <AnimatedSlot slotKey={leftKey} className="flex min-w-0 items-center gap-2">
          {workspace ? (
            <span className="truncate text-sm font-semibold tracking-tight">
              {workspaceTitle ?? "AutoCore"}
            </span>
          ) : isMissionControlRoute ? (
            <span className="truncate text-sm text-muted-foreground">
              {new Date().toLocaleDateString("ru-RU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
          ) : (
            <div className="flex items-center gap-2.5">
              <AppLogo size={24} className="rounded-md" alt="AutoCore" />
              <span className="hidden text-sm font-semibold tracking-tight sm:block">AutoCore</span>
            </div>
          )}
        </AnimatedSlot>
      </div>

      <div className="relative flex min-h-9 min-w-0 flex-1 items-center justify-center">
        <AnimatedSlot
          slotKey={centerKey}
          className="flex w-full items-center justify-center gap-3 px-1"
        >
          <DashboardImportProgress variant="compact" showMotors={isAllMotorsRoute} />

          {showAvailabilityFilter ? (
            <div className="autocore-segmented-tabs inline-flex rounded-lg p-0.5">
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
              className={cn("w-full max-w-md md:max-w-lg", workspace && "workspace-search-mobile")}
              placeholder={
                isWarehouseRoute
                  ? "Поиск по артикулу, названию, бренду..."
                  : isSpecificRoute
                    ? "Поиск по записям..."
                    : "Поиск по номеру, бренду, комплектации..."
              }
            />
          ) : null}
        </AnimatedSlot>
      </div>

      <div className="flex min-w-[88px] shrink-0 items-center justify-end">
        <AnimatedSlot slotKey={rightKey} className="flex items-center gap-1">
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
              {isAllMotorsRoute ? (
                <MotorImportTriggerButton size="sm" showLabel={false} variant="ghost" />
              ) : isWarehouseRoute ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!canImportWarehouse || !canImport || importBusy}
                  title="Импорт CSV"
                  onClick={handleImportClick}
                >
                  <Download className="size-4" />
                </Button>
              ) : null}
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

          {workspace ? (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Настройки"
              render={<Link href="/settings" />}
            >
              <Settings className="size-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              render={<Link href="/settings" />}
            >
              Настройки
            </Button>
          )}

          <AccountMenu />
        </AnimatedSlot>
      </div>
    </header>
  );
}
