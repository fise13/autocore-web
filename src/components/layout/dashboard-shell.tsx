"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBarbaNavigation } from "@/hooks/use-barba-navigation";
import { pathToBarbaNamespace, shouldAnimateDashboardNavigation } from "@/lib/barba/barba-navigation";

import { createBrandUseCase } from "@/application/use-cases/create-brand";
import { deleteBrandUseCase } from "@/application/use-cases/delete-brand";
import { renameBrandUseCase } from "@/application/use-cases/rename-brand";
import { createSpecificCategoryUseCase } from "@/application/use-cases/specific/create-specific-category";
import { deleteSpecificCategoryUseCase } from "@/application/use-cases/specific/delete-specific-category";
import { renameSpecificCategoryUseCase } from "@/application/use-cases/specific/rename-specific-category";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarEditBlur } from "@/components/layout/sidebar-edit-blur";
import { CompanyConfigSidebarSync } from "@/components/onboarding/company-config-sidebar-sync";
import { SidebarCustomizationProvider } from "@/components/providers/sidebar-customization-provider";
import { BillingGateProvider } from "@/components/billing/billing-gate-provider";
import { DashboardLayoutProvider } from "@/components/layout/dashboard-layout-context";
import { DashboardTopBar } from "@/components/layout/dashboard-top-bar";
import { BarcodeScanProvider } from "@/components/barcode/barcode-scan-provider";
import { CommandPaletteProvider } from "@/components/mission-control/command-palette/command-palette-provider";
import { DashboardRouteCache } from "@/components/layout/dashboard-route-cache";
import { ResizableSidebar } from "@/components/layout/resizable-sidebar";
import { WorkspaceProvider, useWorkspace } from "@/components/layout/workspace-context";
import { WorkspaceStatusBar } from "@/components/layout/workspace-status-bar";
import { FirestoreListenerGuard } from "@/components/providers/firestore-listener-guard";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffectiveCatalog } from "@/hooks/use-effective-catalog";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { useSidebarLayout, SIDEBAR_EDIT_MIN_WIDTH } from "@/hooks/use-sidebar-layout";
import { useSidebarEditMode } from "@/hooks/use-sidebar-edit-mode";
import { useEnsureDefaultWarehouse } from "@/hooks/use-ensure-default-warehouse";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { canAccessMotorsArea } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";
import { countSoldMotorsByBrand, filterCatalogBySoldMotors } from "@/lib/catalog-sold-filter";
import { BrandEntity, createCatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import {
  createSpecificCategoryRepository,
  SpecificCategoryEntity,
} from "@/infrastructure/firestore/specific-category-repository";

type DashboardShellProps = {
  children: ReactNode;
};

const catalogRepository = createCatalogRepository();
const motorRepository = createMotorRepository();
const specificCategoryRepository = createSpecificCategoryRepository();

const MotorImportHost = dynamic(
  () => import("@/components/motors/motor-import-host").then((m) => ({ default: m.MotorImportHost })),
  { ssr: false, loading: () => null },
);

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
  const { prepareSidebarForEdit } = useSidebarEditMode();
  const wasEditingRef = useRef(false);
  const sidebarOnRight = customization.position === "right";
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const canViewMotors = canAccessMotorsArea(profile);
  const canManageBrands = can(profile, "inventory_edit") && canViewMotors;
  const canManageSpecificCategories = can(profile, "inventory_edit") && canViewMotors;
  const canSubscribe = Boolean(uid && companyId && !isLoading);
  useEnsureDefaultWarehouse(canSubscribe);

  const isMotorRoute = pathname === "/motors" || pathname === "/sold";
  const isWarehouseRoute = pathname === "/warehouse";
  const isWorkspaceRoute = isMotorRoute || isWarehouseRoute;

  const isSoldRoute = pathname === "/sold";
  const needsSidebarCatalog =
    (isMotorRoute || isSoldRoute) && canSubscribe && canViewMotors;

  const { brands, engines } = useEffectiveCatalog(catalogRepository, motorRepository, uid, companyId, {
    loadMotorsForCatalog: pathname === "/motors" && needsSidebarCatalog,
    enabled: needsSidebarCatalog,
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
    needsSidebarCatalog,
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

  const handleAddSpecificCategory = useCallback(
    async (name: string) => {
      if (!companyId || !uid) return;
      const created = await createSpecificCategoryUseCase(specificCategoryRepository, {
        companyId,
        name,
        existingCategories: specificCategories,
        actorUid: uid,
      });
      if (created?.id) {
        workspace.setSelectedSpecificCategoryId(created.id);
        workspace.setSelectedBrandLocalId(null);
        workspace.setSelectedEngineLocalId(null);
      }
      return created;
    },
    [companyId, specificCategories, uid, workspace],
  );

  const handleRenameSpecificCategory = useCallback(
    async (category: SpecificCategoryEntity, newName: string) => {
      if (!companyId) return;
      await renameSpecificCategoryUseCase(specificCategoryRepository, {
        companyId,
        category,
        newName,
        existingCategories: specificCategories,
      });
    },
    [companyId, specificCategories],
  );

  const handleDeleteSpecificCategory = useCallback(
    async (category: SpecificCategoryEntity) => {
      if (!companyId || !uid) return;
      await deleteSpecificCategoryUseCase(specificCategoryRepository, {
        companyId,
        category,
        actorUid: uid,
      });
      if (workspace.selectedSpecificCategoryId === category.id) {
        workspace.setSelectedSpecificCategoryId(null);
      }
    },
    [companyId, uid, workspace],
  );

  useEffect(() => {
    if (isSoldRoute) {
      setAvailability("sold");
    } else if (pathname === "/motors") {
      setAvailability("all");
    }
  }, [isSoldRoute, pathname, setAvailability]);

  useEffect(() => {
    if (isEditing && !wasEditingRef.current) {
      prepareSidebarForEdit();
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, prepareSidebarForEdit]);

  const handleSidebarWidthChange = useCallback(
    (next: number) => {
      const min = isEditing ? SIDEBAR_EDIT_MIN_WIDTH : undefined;
      setWidth(min !== undefined ? Math.max(next, min) : next);
    },
    [isEditing, setWidth],
  );

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
    selectedSpecificCategoryId: workspace.selectedSpecificCategoryId,
    onBrandChange: (brandLocalId: number | null) => {
      workspace.setSelectedBrandLocalId(brandLocalId);
      workspace.setSelectedSpecificCategoryId(null);
    },
    onEngineChange: workspace.setSelectedEngineLocalId,
    onClearBrandFilters: () => {
      workspace.setSelectedBrandLocalId(null);
      workspace.setSelectedEngineLocalId(null);
      workspace.setSelectedSpecificCategoryId(null);
    },
    onRenameBrand: canManageBrands ? handleRenameBrand : undefined,
    onDeleteBrand: canManageBrands ? handleDeleteBrand : undefined,
    onAddBrand: canManageBrands ? handleAddBrand : undefined,
    onAddSpecificCategory: canManageSpecificCategories ? handleAddSpecificCategory : undefined,
    onRenameSpecificCategory: canManageSpecificCategories ? handleRenameSpecificCategory : undefined,
    onDeleteSpecificCategory: can(profile, "inventory_delete") ? handleDeleteSpecificCategory : undefined,
    onSpecificCategoryChange: (categoryId: string | null) => {
      workspace.setSelectedSpecificCategoryId(categoryId);
      if (categoryId) {
        workspace.setSelectedBrandLocalId(null);
        workspace.setSelectedEngineLocalId(null);
      }
    },
    onOpenSpecificColumnsSettings: () => workspace.setSpecificColumnsDialogOpen(true),
    canManageSpecificCategories,
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
        data-dashboard-shell
        className={cn(
          "flex h-screen overflow-hidden bg-background",
          sidebarOnRight && "flex-row-reverse",
        )}
      >
        <div
          data-app-reveal
          data-barba-prevent
          className="relative z-40 hidden h-full shrink-0 md:block"
        >
          <ResizableSidebar
            collapsed={collapsed}
            width={width}
            position={customization.position}
            isEditing={isEditing}
            onWidthChange={handleSidebarWidthChange}
          >
            <AppSidebar {...sidebarProps} collapsed={collapsed} />
          </ResizableSidebar>
        </div>

        <div
          data-mobile-sidebar-backdrop
          data-barba-prevent
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

        <div
          ref={barbaWrapperRef}
          data-barba="wrapper"
          className={cn("relative flex min-w-0 flex-1 flex-col", isEditing && "overflow-hidden")}
        >
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
                : "relative z-0 min-h-0 flex-1 overflow-y-auto p-4 md:p-6"
            }
          >
            <div className="flex min-h-0 flex-1 flex-col dashboard-workspace-scroll">
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
        </BarcodeScanProvider>
      </WorkspaceProvider>
    </SidebarCustomizationProvider>
  );
}
