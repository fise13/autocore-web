"use client";

import Link from "next/link";
import { AccountMenu } from "@/components/account/account-menu";
import { AppLogo } from "@/components/brand/app-logo";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useMemo } from "react";

import { deleteBrandUseCase } from "@/application/use-cases/delete-brand";
import { renameBrandUseCase } from "@/application/use-cases/rename-brand";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BillingGateProvider } from "@/components/billing/billing-gate-provider";
import { DashboardLayoutProvider } from "@/components/layout/dashboard-layout-context";
import { CommandPaletteProvider } from "@/components/mission-control/command-palette/command-palette-provider";
import { ResizableSidebar } from "@/components/layout/resizable-sidebar";
import { WorkspaceProvider, useWorkspace } from "@/components/layout/workspace-context";
import { WorkspaceStatusBar } from "@/components/layout/workspace-status-bar";
import { WorkspaceToolbar } from "@/components/layout/workspace-toolbar";
import { FirestoreListenerGuard } from "@/components/providers/firestore-listener-guard";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffectiveCatalog } from "@/hooks/use-effective-catalog";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
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
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const canViewInventory = can(profile, "inventory_view");
  const canManageBrands = can(profile, "inventory_edit");
  const canSubscribe = Boolean(uid && companyId && !isLoading);

  const isMotorRoute = pathname === "/motors" || pathname === "/sold";
  const isSpecificRoute = pathname.startsWith("/specific/");
  const isMissionControlRoute = pathname === "/";
  const isWorkspaceRoute = isMotorRoute || isSpecificRoute;

  const isSoldRoute = pathname === "/sold";

  const { brands, engines } = useEffectiveCatalog(catalogRepository, motorRepository, uid, companyId, {
    loadMotorsForCatalog: pathname === "/motors" && canSubscribe && canViewInventory,
    enabled: canSubscribe && canViewInventory,
  });

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: pathname === "/motors" && canSubscribe && canViewInventory,
  });

  const soldMotorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    soldOnly: true,
    availability: "sold",
    enabled: isSoldRoute && canSubscribe && canViewInventory,
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
    canSubscribe && canViewInventory,
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
      <div className="flex h-screen overflow-hidden bg-background">
        <ResizableSidebar visible={visible} width={width} onWidthChange={setWidth}>
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
            canManageBrands={canManageBrands}
            showBrandFilters={pathname === "/motors" || isSoldRoute}
            hideSpecificCategories={isSoldRoute}
            brandCounts={sidebarCatalog.soldCountByBrand}
            brandsSectionTitle={isSoldRoute ? "Проданные по брендам" : undefined}
          />
        </ResizableSidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          {isWorkspaceRoute ? (
            <WorkspaceToolbar />
          ) : (
            <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b bg-card/95 px-4 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <AppLogo size={24} className="rounded-md" alt="AutoCore" />
                <span className="text-sm font-semibold tracking-tight">AutoCore</span>
              </div>
              <div className="flex items-center gap-2">
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
              key={pathname}
              className={
                isWorkspaceRoute
                  ? "flex min-h-0 flex-1 flex-col"
                  : "animate-autocore-page-enter"
              }
            >
              {children}
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
    <WorkspaceProvider>
      <FirestoreListenerGuard />
      <DashboardShellInner>{children}</DashboardShellInner>
    </WorkspaceProvider>
  );
}
