"use client";

import { usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { useBarbaNavigation } from "@/hooks/use-barba-navigation";
import { pathToBarbaNamespace, shouldAnimateDashboardNavigation } from "@/lib/barba/barba-navigation";

import { createSpecificCategoryUseCase } from "@/application/use-cases/specific/create-specific-category";
import { deleteSpecificCategoryUseCase } from "@/application/use-cases/specific/delete-specific-category";
import { renameSpecificCategoryUseCase } from "@/application/use-cases/specific/rename-specific-category";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { InventoryCollectionSync } from "@/components/layout/inventory-collection-sync";
import { CompanyConfigSidebarSync } from "@/components/onboarding/company-config-sidebar-sync";
import { SidebarCustomizationProvider, useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { SidebarPreferencesProvider, useSidebarPreferences } from "@/components/providers/sidebar-preferences-provider";
import { BillingGateProvider } from "@/components/billing/billing-gate-provider";
import { DashboardLayoutProvider } from "@/components/layout/dashboard-layout-context";
import { DashboardTopBar } from "@/components/layout/dashboard-top-bar";
import { DemoSessionBanner } from "@/components/demo/demo-session-banner";
import { useDemoExitReset } from "@/hooks/use-demo-exit-reset";
import { BarcodeScanProvider } from "@/components/barcode/barcode-scan-provider";
import { DomainDictionaryProvider } from "@/components/domain/domain-dictionary-provider";
import { CommandPaletteProvider } from "@/components/mission-control/command-palette/command-palette-provider";
import { DashboardRouteCache } from "@/components/layout/dashboard-route-cache";
import { ResizableSidebar } from "@/components/layout/resizable-sidebar";
import { SidebarEditBlur } from "@/components/layout/sidebar-edit-blur";
import { WorkspaceProvider, useWorkspace } from "@/components/layout/workspace-context";
import { WorkspaceStatusBar } from "@/components/layout/workspace-status-bar";
import { FirestoreListenerGuard } from "@/components/providers/firestore-listener-guard";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffectiveCatalog } from "@/hooks/use-effective-catalog";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { useEnsureDefaultWarehouse } from "@/hooks/use-ensure-default-warehouse";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { canAccessMotorsArea } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { groupIdForCollection, parseCollectionFromSearchParams } from "@/lib/navigation/inventory-collections";
import { cn } from "@/lib/utils";
import { countSoldMotorsByBrand, filterCatalogBySoldMotors } from "@/lib/catalog-sold-filter";
import { createCatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";

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
  const searchParams = useSearchParams();
  const workspace = useWorkspace();
  const { wrapperRef: barbaWrapperRef, containerRef: barbaContainerRef } = useBarbaNavigation({
    shouldAnimate: shouldAnimateDashboardNavigation,
  });
  const barbaNamespace = pathToBarbaNamespace(pathname);
  const { profile, isLoading } = useAuth();
  const { preferences } = useSidebarPreferences();
  const { isEditing } = useSidebarCustomization();
  const { collapsed, width, setWidth, toggleCollapsed } = useSidebarLayout();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarOnRight = preferences.position === "right";
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const canViewMotors = canAccessMotorsArea(profile);
  const canSubscribe = Boolean(uid && companyId && !isLoading);
  useEnsureDefaultWarehouse(canSubscribe);
  useDemoExitReset();

  const isMotorRoute = pathname === "/motors" || pathname === "/sold";
  const isWarehouseRoute = pathname === "/warehouse";
  const isWorkspaceRoute = isMotorRoute || isWarehouseRoute;
  const isSoldRoute = pathname === "/sold";
  const needsSidebarCatalog = (isMotorRoute || isSoldRoute) && canSubscribe && canViewMotors;

  const { brands, engines } = useEffectiveCatalog(catalogRepository, motorRepository, uid, companyId, {
    loadMotorsForCatalog: pathname === "/motors" && needsSidebarCatalog,
    enabled: needsSidebarCatalog,
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
      return { brands, soldCountByBrand: undefined as Map<number, number> | undefined };
    }

    const soldMotors = soldMotorsQuery.data ?? [];
    const filtered = filterCatalogBySoldMotors(brands, engines, soldMotors);
    return {
      brands: filtered.brands,
      soldCountByBrand: countSoldMotorsByBrand(brands, soldMotors),
    };
  }, [brands, engines, isSoldRoute, soldMotorsQuery.data]);

  const specificCategories = useSpecificCategoriesRealtime(
    specificCategoryRepository,
    companyId,
    needsSidebarCatalog || pathname === "/warehouse",
  );

  const canManageSpecificCategories = can(profile, "inventory_edit");

  const collectionContext = useMemo(
    () => parseCollectionFromSearchParams(searchParams, pathname),
    [pathname, searchParams],
  );

  const handleAddSpecificCategory = useCallback(
    async (name: string) => {
      if (!companyId || !uid) return;
      const groupId = groupIdForCollection(collectionContext.collection) ?? undefined;
      const created = await createSpecificCategoryUseCase(specificCategoryRepository, {
        companyId,
        name,
        existingCategories: specificCategories,
        actorUid: uid,
        groupId,
      });
      if (created?.id) {
        workspace.setSelectedSpecificCategoryId(created.id);
        workspace.setSelectedBrandLocalId(null);
        workspace.setSelectedEngineLocalId(null);
      }
      return created;
    },
    [collectionContext.collection, companyId, specificCategories, uid, workspace],
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
    brandCounts: sidebarCatalog.soldCountByBrand,
    soldRoute: isSoldRoute,
    specificCategories,
    selectedSpecificCategoryId: workspace.selectedSpecificCategoryId,
    activeCollection: collectionContext.collection,
    canManageSpecificCategories,
    onSelectSpecificCategory: (categoryId: string | null) => {
      workspace.setSelectedSpecificCategoryId(categoryId);
      if (categoryId) {
        workspace.setSelectedBrandLocalId(null);
        workspace.setSelectedEngineLocalId(null);
      }
    },
    onAddSpecificCategory: canManageSpecificCategories ? handleAddSpecificCategory : undefined,
    onRenameSpecificCategory: canManageSpecificCategories ? handleRenameSpecificCategory : undefined,
    onDeleteSpecificCategory: can(profile, "inventory_delete") ? handleDeleteSpecificCategory : undefined,
    onOpenSpecificColumnsSettings: () => workspace.setSpecificColumnsDialogOpen(true),
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  return (
    <BillingGateProvider companyId={companyId}>
      <DashboardLayoutProvider
        sidebarCollapsed={collapsed}
        toggleSidebar={toggleCollapsed}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      >
        <CommandPaletteProvider>
          <Suspense fallback={null}>
            <InventoryCollectionSync
              specificCategories={specificCategories}
              enabled={isMotorRoute || isWarehouseRoute}
            />
          </Suspense>
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
                collapsed={isEditing ? false : collapsed}
                width={width}
                position={preferences.position}
                isEditing={isEditing}
                onWidthChange={setWidth}
              >
                <AppSidebar {...sidebarProps} collapsed={isEditing ? false : collapsed} />
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
              className="relative flex min-w-0 flex-1 flex-col"
            >
              <SidebarEditBlur />
              <DemoSessionBanner />
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
      <SidebarPreferencesProvider>
        <CompanyConfigSidebarSync />
        <WorkspaceProvider>
          <BarcodeScanProvider>
            <DomainDictionaryProvider>
              <FirestoreListenerGuard />
              <DashboardShellInner>{children}</DashboardShellInner>
            </DomainDictionaryProvider>
          </BarcodeScanProvider>
        </WorkspaceProvider>
      </SidebarPreferencesProvider>
    </SidebarCustomizationProvider>
  );
}
