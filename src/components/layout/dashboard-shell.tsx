"use client";

import Link from "next/link";
import { AccountMenu } from "@/components/account/account-menu";
import { AppLogo } from "@/components/brand/app-logo";
import { usePathname } from "next/navigation";
import { ReactNode, Suspense, useCallback, useEffect, useMemo } from "react";

import { createBrandUseCase } from "@/application/use-cases/create-brand";
import { deleteBrandUseCase } from "@/application/use-cases/delete-brand";
import { renameBrandUseCase } from "@/application/use-cases/rename-brand";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarEditBlur } from "@/components/layout/sidebar-edit-blur";
import { SidebarCustomizationProvider } from "@/components/providers/sidebar-customization-provider";
import { BillingGateProvider } from "@/components/billing/billing-gate-provider";
import { DashboardLayoutProvider } from "@/components/layout/dashboard-layout-context";
import { DashboardImportProgress } from "@/components/warehouse/import/shared/import-progress-host";
import { CommandPaletteProvider } from "@/components/mission-control/command-palette/command-palette-provider";
import { DashboardRouteCache } from "@/components/layout/dashboard-route-cache";
import { MotorImportHost } from "@/components/motors/motor-import-host";
import { MotorImportTriggerButton } from "@/components/motors/motor-import-trigger-button";
import { ResizableSidebar } from "@/components/layout/resizable-sidebar";
import { WorkspaceProvider, useWorkspace } from "@/components/layout/workspace-context";
import { WorkspaceStatusBar } from "@/components/layout/workspace-status-bar";
import { WorkspaceToolbar } from "@/components/layout/workspace-toolbar";
import { FirestoreListenerGuard } from "@/components/providers/firestore-listener-guard";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffectiveCatalog } from "@/hooks/use-effective-catalog";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { canAccessMotorsArea } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";
import { countSoldMotorsByBrand, filterCatalogBySoldMotors } from "@/lib/catalog-sold-filter";
import { BrandEntity, createCatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";

type DashboardShellProps = {
  children: ReactNode;
};

const catalogRepository = createCatalogRepository();
const motorRepository = createMotorRepository();
const specificCategoryRepository = createSpecificCategoryRepository();

function DashboardShellInner({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const { profile, isLoading } = useAuth();
  const workspace = useWorkspace();
  const { setAvailability } = workspace;
  const { visible, width, setWidth, toggleVisible } = useSidebarLayout();
  const { customization, isEditing } = useSidebarCustomization();
  const sidebarOnRight = customization.position === "right";
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const canViewMotors = canAccessMotorsArea(profile);
  const canManageBrands = can(profile, "inventory_edit") && canViewMotors;
  const canSubscribe = Boolean(uid && companyId && !isLoading);

  const isMotorRoute = pathname === "/motors" || pathname === "/sold";
  const isSpecificRoute = pathname.startsWith("/specific/");
  const isWarehouseRoute = pathname === "/warehouse";
  const isMissionControlRoute = pathname === "/";
  const isWorkspaceRoute = isMotorRoute || isSpecificRoute || isWarehouseRoute;

  const isSoldRoute = pathname === "/sold";

  const { brands, engines } = useEffectiveCatalog(catalogRepository, motorRepository, uid, companyId, {
    loadMotorsForCatalog: pathname === "/motors" && canSubscribe && canViewMotors,
    enabled: canSubscribe && canViewMotors,
  });

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: pathname === "/motors" && canSubscribe && canViewMotors,
  });

  const soldMotorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    soldOnly: true,
    availability: "sold",
    enabled: isSoldRoute && canSubscribe && canViewMotors,
  });

  const sidebarCatalog = useMemo(() => {
    if (!isSoldRoute) {
      return { brands, engines, soldCountByBrand: undefined as Map<number, number> | undefined };
    }

    const soldMotors = soldMotorsQuery.data ?? [];
    const filtered = filterCatalogBySoldMotors(brands, engines, soldMotors);
    return {
      brands: filtered.brands,
      engines: filtered.engines,
      soldCountByBrand: countSoldMotorsByBrand(brands, soldMotors),
    };
  }, [brands, engines, isSoldRoute, soldMotorsQuery.data]);

  const specificCategories = useSpecificCategoriesRealtime(
    specificCategoryRepository,
    companyId,
    canSubscribe && canViewMotors,
  );

  const handleAddBrand = useCallback(
    async (name: string) => {
      if (!companyId) return;
      await createBrandUseCase(catalogRepository, {
        companyId,
        name,
        existingBrands: brands,
      });
    },
    [brands, companyId],
  );

  const handleRenameBrand = useCallback(
    async (brand: BrandEntity, newName: string) => {
      if (!uid) return;
      await renameBrandUseCase(catalogRepository, motorRepository, {
        uid,
        brand,
        newName,
        existingBrands: brands,
        motors: motorsQuery.data ?? [],
      });
    },
    [brands, motorsQuery.data, uid],
  );

  const handleDeleteBrand = useCallback(
    async (brand: BrandEntity) => {
      await deleteBrandUseCase(catalogRepository, {
        brand,
        engines,
      });
    },
    [engines],
  );

  useEffect(() => {
    if (isSoldRoute) {
      setAvailability("sold");
    } else if (pathname === "/motors") {
      setAvailability("all");
    }
  }, [isSoldRoute, pathname, setAvailability]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleVisible();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleVisible]);

  return (
    <BillingGateProvider companyId={companyId}>
    <DashboardLayoutProvider sidebarVisible={visible} toggleSidebar={toggleVisible}>
      <CommandPaletteProvider>
      <Suspense fallback={null}>
        <MotorImportHost />
      </Suspense>
      <div
        className={cn(
          "flex h-screen overflow-hidden bg-background",
          sidebarOnRight && "flex-row-reverse",
        )}
      >
        <ResizableSidebar
          visible={visible}
          width={width}
          position={customization.position}
          onWidthChange={setWidth}
        >
          <AppSidebar
            brands={sidebarCatalog.brands}
            engines={sidebarCatalog.engines}
            specificCategories={specificCategories}
            selectedBrandLocalId={workspace.selectedBrandLocalId}
            selectedEngineLocalId={workspace.selectedEngineLocalId}
            onBrandChange={workspace.setSelectedBrandLocalId}
            onEngineChange={workspace.setSelectedEngineLocalId}
            onClearBrandFilters={() => {
              workspace.setSelectedBrandLocalId(null);
              workspace.setSelectedEngineLocalId(null);
            }}
            onRenameBrand={canManageBrands ? handleRenameBrand : undefined}
            onDeleteBrand={canManageBrands ? handleDeleteBrand : undefined}
            onAddBrand={canManageBrands ? handleAddBrand : undefined}
            canManageBrands={canManageBrands}
            showBrandFilters={pathname === "/motors" || isSoldRoute}
            brandCounts={sidebarCatalog.soldCountByBrand}
            brandsSectionTitle={isSoldRoute ? "Проданные по брендам" : undefined}
          />
        </ResizableSidebar>

        <div className={cn("relative flex min-w-0 flex-1 flex-col", isEditing && "overflow-hidden")}>
          <SidebarEditBlur />
          {isWorkspaceRoute ? <WorkspaceToolbar /> : (
            <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur-sm">
              <div className="flex min-w-[120px] items-center gap-2.5">
                <AppLogo size={24} className="rounded-md" alt="AutoCore" />
                <span className="hidden text-sm font-semibold tracking-tight sm:block">AutoCore</span>
              </div>
              {!isMissionControlRoute ? (
                <div className="flex min-w-0 flex-1 justify-center">
                  <DashboardImportProgress variant="compact" />
                </div>
              ) : (
                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <DashboardImportProgress variant="compact" />
                </div>
              )}
              <div className="flex min-w-[120px] items-center justify-end gap-2">
                {canViewMotors && can(profile, "inventory_edit") ? (
                  <MotorImportTriggerButton size="sm" />
                ) : null}
                <Link
                  href="/settings"
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Настройки
                </Link>
                <AccountMenu />
              </div>
            </header>
          )}

          <main
            className={
              isWorkspaceRoute
                ? "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden"
                : cn(
                    "relative z-0 min-h-0 flex-1 overflow-y-auto p-4 md:p-6",
                    isMissionControlRoute &&
                      "bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_oklab,var(--primary)_6%,transparent),transparent_50%)]",
                  )
            }
          >
            <div
              className={
                isWorkspaceRoute
                  ? "flex min-h-0 flex-1 flex-col"
                  : "animate-autocore-page-enter flex min-h-0 flex-1 flex-col"
              }
            >
              <DashboardRouteCache>{children}</DashboardRouteCache>
            </div>
          </main>

          {isWorkspaceRoute ? <WorkspaceStatusBar /> : null}
        </div>
      </div>
      </CommandPaletteProvider>
    </DashboardLayoutProvider>
    </BillingGateProvider>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarCustomizationProvider>
      <WorkspaceProvider>
        <FirestoreListenerGuard />
        <DashboardShellInner>{children}</DashboardShellInner>
      </WorkspaceProvider>
    </SidebarCustomizationProvider>
  );
}
