"use client";

import { usePathname } from "next/navigation";
import { ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { useBarbaNavigation } from "@/hooks/use-barba-navigation";
import { pathToBarbaNamespace, shouldAnimateDashboardNavigation } from "@/lib/barba/barba-navigation";

import { createBrandUseCase } from "@/application/use-cases/create-brand";
import { deleteBrandUseCase } from "@/application/use-cases/delete-brand";
import { renameBrandUseCase } from "@/application/use-cases/rename-brand";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarEditBlur } from "@/components/layout/sidebar-edit-blur";
import { CompanyConfigSidebarSync } from "@/components/onboarding/company-config-sidebar-sync";
import { SidebarCustomizationProvider } from "@/components/providers/sidebar-customization-provider";
import { BillingGateProvider } from "@/components/billing/billing-gate-provider";
import { DashboardLayoutProvider } from "@/components/layout/dashboard-layout-context";
import { DashboardTopBar } from "@/components/layout/dashboard-top-bar";
import { BarcodeScanProvider } from "@/components/barcode/barcode-scan-provider";
import { SupportWidget } from "@/components/support/support-widget";
import { CommandPaletteProvider } from "@/components/mission-control/command-palette/command-palette-provider";
import { DashboardRouteCache } from "@/components/layout/dashboard-route-cache";
import { MotorImportHost } from "@/components/motors/motor-import-host";
import { ResizableSidebar } from "@/components/layout/resizable-sidebar";
import { WorkspaceProvider, useWorkspace } from "@/components/layout/workspace-context";
import { WorkspaceStatusBar } from "@/components/layout/workspace-status-bar";
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
  const { wrapperRef: barbaWrapperRef, containerRef: barbaContainerRef } = useBarbaNavigation({
    shouldAnimate: shouldAnimateDashboardNavigation,
  });
  const barbaNamespace = pathToBarbaNamespace(pathname);
  const { profile, isLoading } = useAuth();
  const workspace = useWorkspace();
  const { setAvailability } = workspace;
  const { collapsed, width, setWidth, toggleVisible } = useSidebarLayout();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileSidebarOpen]);

  const sidebarProps = {
    brands: sidebarCatalog.brands,
    engines: sidebarCatalog.engines,
    specificCategories,
    selectedBrandLocalId: workspace.selectedBrandLocalId,
    selectedEngineLocalId: workspace.selectedEngineLocalId,
    onBrandChange: workspace.setSelectedBrandLocalId,
    onEngineChange: workspace.setSelectedEngineLocalId,
    onClearBrandFilters: () => {
      workspace.setSelectedBrandLocalId(null);
      workspace.setSelectedEngineLocalId(null);
    },
    onRenameBrand: canManageBrands ? handleRenameBrand : undefined,
    onDeleteBrand: canManageBrands ? handleDeleteBrand : undefined,
    onAddBrand: canManageBrands ? handleAddBrand : undefined,
    canManageBrands,
    showBrandFilters: pathname === "/motors" || isSoldRoute,
    brandCounts: sidebarCatalog.soldCountByBrand,
    brandsSectionTitle: isSoldRoute ? "Проданные по брендам" : undefined,
  };

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
    <DashboardLayoutProvider
      sidebarCollapsed={collapsed}
      toggleSidebar={toggleVisible}
      mobileSidebarOpen={mobileSidebarOpen}
      setMobileSidebarOpen={setMobileSidebarOpen}
    >
      <CommandPaletteProvider>
      <Suspense fallback={null}>
        <MotorImportHost />
      </Suspense>
      <div
        ref={barbaWrapperRef}
        data-dashboard-shell
        data-barba="wrapper"
        className={cn(
          "flex h-screen overflow-hidden bg-background",
          sidebarOnRight && "flex-row-reverse",
        )}
      >
        <div
          data-app-reveal
          className={cn(
            "relative z-40 my-2 hidden h-[calc(100vh-1rem)] shrink-0 md:block",
            sidebarOnRight ? "mr-2" : "ml-2",
          )}
        >
          <ResizableSidebar
            collapsed={collapsed}
            width={width}
            position={customization.position}
            onWidthChange={setWidth}
          >
            <AppSidebar {...sidebarProps} collapsed={collapsed} />
        </ResizableSidebar>
        </div>

        <div
          data-mobile-sidebar-backdrop
          className={cn(
            "fixed inset-0 z-50 md:hidden",
            mobileSidebarOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          aria-hidden={!mobileSidebarOpen}
        >
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-black/45 transition-opacity duration-200",
              mobileSidebarOpen ? "opacity-100" : "opacity-0",
            )}
            aria-label="Закрыть меню"
            tabIndex={mobileSidebarOpen ? 0 : -1}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside
            data-mobile-sidebar
            className={cn(
              "absolute inset-y-0 flex w-[min(88vw,20rem)] flex-col border-r bg-sidebar shadow-2xl transition-transform duration-200 ease-out",
              sidebarOnRight ? "right-0 border-r-0 border-l" : "left-0",
              mobileSidebarOpen
                ? "translate-x-0"
                : sidebarOnRight
                  ? "translate-x-full"
                  : "-translate-x-full",
            )}
          >
            <AppSidebar
              {...sidebarProps}
              collapsed={false}
              onNavigate={() => setMobileSidebarOpen(false)}
            />
          </aside>
        </div>

        <div className={cn("relative flex min-w-0 flex-1 flex-col", isEditing && "overflow-hidden")}>
          <SidebarEditBlur />
          <div data-app-reveal>
            <DashboardTopBar />
          </div>

          <main
            ref={barbaContainerRef}
            data-barba="container"
            data-barba-namespace={barbaNamespace}
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
            <div className="flex min-h-0 flex-1 flex-col">
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
      <CompanyConfigSidebarSync />
      <WorkspaceProvider>
        <BarcodeScanProvider>
          <FirestoreListenerGuard />
          <DashboardShellInner>{children}</DashboardShellInner>
          <SupportWidget />
        </BarcodeScanProvider>
      </WorkspaceProvider>
    </SidebarCustomizationProvider>
  );
}
