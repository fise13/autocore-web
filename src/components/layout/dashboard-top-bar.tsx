"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Barcode,
  PanelLeft,
  Settings2,
  Upload,
} from "lucide-react";

import { AccountMenu } from "@/components/account/account-menu";
import { AppLogo } from "@/components/brand/app-logo";
import { DocumentImportTopBarIsland } from "@/components/document-import/document-import-top-bar-island";
import { useDashboardLayout } from "@/components/layout/dashboard-layout-context";
import {
  dashboardTopBarSlotVariants,
  dashboardTopBarTransition,
} from "@/components/layout/dashboard-top-bar-motion";
import { WorkspaceSearchField } from "@/components/layout/workspace-search-field";
import { MotorImportTriggerButton } from "@/components/motors/motor-import-trigger-button";
import { WarehouseImportTriggerButton } from "@/components/warehouse/warehouse-import-trigger-button";
import { WarehouseTopBarSelector } from "@/components/warehouse/warehouse-top-bar-selector";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DashboardImportProgress } from "@/components/warehouse/import/shared/import-progress-host";
import { canAccessMotorsArea } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { resolveSidebarMode, type SidebarMode } from "@/lib/navigation/sidebar-mode";
import { userCopy } from "@/lib/user-copy";
import { MotorAvailability } from "@/infrastructure/firestore/motor-repository";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import { normalizeCompanyId } from "@/lib/company-id";
import { businessNavCopy, inventoryCollectionLabel } from "@/lib/navigation/business-nav-copy";
import { parseCollectionFromSearchParams } from "@/lib/navigation/inventory-collections";
import { pinnedFilterMeta } from "@/lib/navigation/pinned-filters";

const specificCategoryRepository = createSpecificCategoryRepository();

function TopBarPageLabel({ title }: { title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <AppLogo size={20} className="shrink-0 rounded-md" alt="AutoCore" />
      <span className="truncate text-sm font-semibold tracking-tight">{title}</span>
    </div>
  );
}

const availabilityOptionValues: MotorAvailability[] = ["all", "available", "sold"];

function isWorkspaceRoute(pathname: string): boolean {
  return (
    pathname === "/motors" ||
    pathname === "/sold" ||
    pathname === "/warehouse" ||
    pathname === "/specific" ||
    pathname.startsWith("/specific/")
  );
}

function topBarLeftKey(mode: SidebarMode, pageTitle: string): string {
  return `page-${mode}-${pageTitle}`;
}

function topBarCenterKey(mode: SidebarMode, workspace: boolean, specificView: boolean): string {
  if (workspace) {
    if (mode === "warehouse") return "center-warehouse";
    if (mode === "sold") return "center-sold";
    if (mode === "motors" && specificView) return "center-specific-filters";
    if (mode === "motors") return "center-motors-filters";
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
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { sidebarCollapsed, toggleSidebar, toggleMobileSidebar } = useDashboardLayout();
  const {
    availability,
    setAvailability,
    motorExcelIo,
    triggerMotorExport,
    warehouseExcelIo,
    triggerWarehouseExport,
    triggerWarehouseImport,
    registerWarehouseImportPicker,
    triggerWarehouseBarcode,
    lastBarcodeScan,
    selectedSpecificCategoryId,
    setSpecificColumnsDialogOpen,
  } = useWorkspace();
  const { requirePro, isPro } = useBillingGate();

  const companyId = normalizeCompanyId(profile?.companyId);
  const specificCategories = useSpecificCategoriesRealtime(
    specificCategoryRepository,
    companyId,
    Boolean(selectedSpecificCategoryId && companyId),
  );
  const selectedSpecificCategory = specificCategories.find(
    (item) => item.id === selectedSpecificCategoryId,
  );

  const [excelError, setExcelError] = useState<string | null>(null);
  const sidebarMode = resolveSidebarMode(pathname);
  const workspace = isWorkspaceRoute(pathname);
  const isSpecificView =
    pathname.startsWith("/specific/") ||
    (pathname === "/motors" && Boolean(selectedSpecificCategoryId));
  const isMotorsRoute = pathname === "/motors";
  const isMotorRoute = pathname === "/motors" || pathname === "/sold";
  const isWarehouseRoute = pathname === "/warehouse";
  const isSoldRoute = pathname === "/sold";
  const isOverviewRoute = pathname === "/";
  const collectionContext = parseCollectionFromSearchParams(searchParams, pathname);

  const topBarTitle = useMemo(() => {
    if (isOverviewRoute) return businessNavCopy.workspace.dashboard;

    if (isSpecificView && selectedSpecificCategory) {
      return selectedSpecificCategory.name;
    }

    if (isMotorsRoute) {
      const filterLabel = collectionContext.filter
        ? ` · ${pinnedFilterMeta(collectionContext.filter).label}`
        : "";
      return `${inventoryCollectionLabel(collectionContext.collection)}${filterLabel}`;
    }

    if (isWarehouseRoute) return businessNavCopy.inventoryCollection.consumables;
    if (isSoldRoute) return businessNavCopy.business.sales;

    const sectionByMode: Partial<Record<SidebarMode, string>> = {
      work_orders: businessNavCopy.business.workOrders,
      accounting: businessNavCopy.business.accounting,
      documents: businessNavCopy.business.documents,
      team: businessNavCopy.business.team,
      activity: userCopy.layout.activity,
    };

    if (sectionByMode[sidebarMode]) return sectionByMode[sidebarMode]!;
    if (pathname.startsWith("/my-earnings")) return businessNavCopy.business.myEarnings;
    if (pathname.startsWith("/settings")) return userCopy.layout.settings;
    if (pathname.startsWith("/help")) return userCopy.layout.help;
    if (pathname.startsWith("/media/")) return userCopy.gridPhotos.galleryTitle;

    return userCopy.appName;
  }, [
    collectionContext.collection,
    collectionContext.filter,
    isOverviewRoute,
    isMotorsRoute,
    isSoldRoute,
    isSpecificView,
    isWarehouseRoute,
    pathname,
    selectedSpecificCategory,
    sidebarMode,
  ]);

  const showAvailabilityFilter =
    (pathname === "/motors" || pathname.startsWith("/specific/") || isSpecificView) &&
    !isSoldRoute;
  const showExcelIo = (isMotorRoute || isWarehouseRoute) && !isSpecificView;
  const canViewMotors = canAccessMotorsArea(profile);
  const canEdit = can(profile, "inventory_edit");
  const canMotorImport = canViewMotors && canEdit;
  const canImportWarehouse = can(profile, "inventory_import");
  const canExportWarehouse = can(profile, "inventory_export");
  const showMotorMagicImport = isMotorsRoute && canMotorImport && !isSpecificView;
  const showWarehouseMagicImport = isWarehouseRoute && canImportWarehouse;
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
      setExcelError(error instanceof Error ? error.message : userCopy.layout.exportFailed);
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

  const leftKey = topBarLeftKey(sidebarMode, topBarTitle);
  const centerKey = topBarCenterKey(sidebarMode, workspace, isSpecificView);
  const rightKey = topBarRightKey(sidebarMode, workspace);

  const availabilityOptions = availabilityOptionValues.map((value) => ({
    value,
    label:
      value === "all"
        ? userCopy.layout.filterAll
        : value === "available"
          ? userCopy.layout.filterAvailable
          : userCopy.layout.filterSold,
  }));

  return (
    <header
      className={cn(
        "relative z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6",
        isOverviewRoute
          ? "border-border bg-background"
          : "border-sidebar-border bg-sidebar px-4 md:px-5",
        !workspace && !isOverviewRoute && "bg-sidebar/95 perf-backdrop-blur",
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleMobileSidebar}
          title={userCopy.layout.menu}
          aria-label={userCopy.layout.openMenu}
          className="md:hidden"
        >
          <PanelLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          title={
            sidebarCollapsed
              ? userCopy.layout.expandSidebarHint
              : userCopy.layout.collapseSidebarHint
          }
          aria-label={
            sidebarCollapsed ? userCopy.layout.expandSidebar : userCopy.layout.collapseSidebar
          }
          className="hidden md:inline-flex"
        >
          <PanelLeft
            className={cn(
              "size-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              sidebarCollapsed && "rotate-180",
            )}
          />
        </Button>
        <Separator orientation="vertical" className="hidden h-4 md:block" />
        <AnimatedSlot slotKey={leftKey} className="flex min-w-0 items-center gap-2">
          <TopBarPageLabel title={topBarTitle} />
        </AnimatedSlot>
      </div>

      <div className="relative z-[55] flex min-h-9 min-w-0 flex-1 items-center justify-center">
        <AnimatedSlot
          slotKey={centerKey}
          className="flex w-full items-center justify-center gap-3 px-1"
        >
          <DashboardImportProgress variant="compact" />
          <DocumentImportTopBarIsland />

          {isWarehouseRoute ? <WarehouseTopBarSelector /> : null}

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

          {(isWarehouseRoute || isMotorRoute || isSpecificView) ? (
            <WorkspaceSearchField
              className={cn("w-full max-w-md md:max-w-lg", workspace && "workspace-search-mobile")}
              placeholder={
                isWarehouseRoute
                  ? userCopy.layout.searchSku
                  : isSpecificView
                    ? userCopy.layout.searchRecords
                    : userCopy.layout.searchMotors
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

          {lastBarcodeScan && !isWarehouseRoute ? (
            <span
              className="hidden max-w-[160px] truncate rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-foreground lg:inline"
              title={lastBarcodeScan.barcode}
            >
              {lastBarcodeScan.itemName ?? lastBarcodeScan.barcode}
            </span>
          ) : null}

          {isSpecificView && canEdit ? (
            <Button
              variant="ghost"
              size="icon-sm"
              title={userCopy.layout.columns}
              aria-label={userCopy.layout.columns}
              onClick={() => setSpecificColumnsDialogOpen(true)}
            >
              <Settings2 className="size-4" />
            </Button>
          ) : null}

          {showMotorMagicImport ? (
            <MotorImportTriggerButton size="sm" showLabel={false} variant="ghost" />
          ) : null}

          {showWarehouseMagicImport ? (
            <WarehouseImportTriggerButton
              size="sm"
              showLabel={false}
              variant="ghost"
              disabled={!canImport || importBusy}
            />
          ) : null}

          {showExcelIo ? (
            <>
              {isWarehouseRoute ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!canEdit}
                  title={userCopy.layout.barcodeScanner}
                  onClick={() => {
                    if (!triggerWarehouseBarcode()) {
                      setExcelError(userCopy.layout.warehouseScannerNotReady);
                    }
                  }}
                >
                  <Barcode className="size-4" />
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
                    ? userCopy.layout.exportCsv
                    : isPro
                      ? userCopy.layout.exportExcel
                      : userCopy.billing.paywall.export.title
                }
                onClick={() => void handleExport()}
                className={cn("relative", !isPro && !isWarehouseRoute && "text-primary/80")}
              >
                <Upload className="size-4" />
                {!isPro && !isWarehouseRoute ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
                ) : null}
              </Button>
            </>
          ) : null}

          <AccountMenu />
        </AnimatedSlot>
      </div>
    </header>
  );
}
