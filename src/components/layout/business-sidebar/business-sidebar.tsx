"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { AutocoreNavGroup } from "@/components/layout/business-sidebar/autocore-nav-group";
import {
  buildAutocoreNavGroups,
  shouldShowBrandsSidebarGroup,
} from "@/components/layout/business-sidebar/build-autocore-nav-groups";
import { BrandsSidebarGroup } from "@/components/layout/business-sidebar/brands-sidebar-group";
import { SpecificCategoriesSidebarGroup } from "@/components/layout/business-sidebar/specific-categories-sidebar-group";
import { SidebarFooter } from "@/components/layout/business-sidebar/sidebar-footer";
import { SidebarCustomizeSheet } from "@/components/layout/sidebar-customize-sheet";
import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, SidebarContent, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/components/providers/auth-provider";
import { useSidebarCounts } from "@/hooks/use-sidebar-counts";
import { isNavAllowed } from "@/lib/auth/app-access";
import { parseCollectionFromSearchParams } from "@/lib/navigation/inventory-collections";
import {
  getDisabledBlocks,
  getDisabledNavItems,
  setBlockEnabled,
  setNavItemEnabled,
} from "@/lib/navigation/sidebar-edit-model";
import { isBlockEnabled, type SidebarBlockId, type SidebarNavItemId } from "@/lib/navigation/sidebar-customization";
import { collectionUsesSpecificSheets } from "@/lib/navigation/specific-categories-for-collection";
import { cn } from "@/lib/utils";
import type { BrandEntity } from "@/infrastructure/firestore/catalog-repository";
import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";
import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";
import { normalizeCompanyId } from "@/lib/company-id";

export type BusinessSidebarProps = {
  collapsed?: boolean;
  brands: BrandEntity[];
  brandCounts?: Map<number, number>;
  soldRoute?: boolean;
  onNavigate?: () => void;
  specificCategories?: SpecificCategoryEntity[];
  selectedSpecificCategoryId?: string | null;
  activeCollection?: InventoryCollectionId;
  canManageSpecificCategories?: boolean;
  onSelectSpecificCategory?: (categoryId: string | null) => void;
  onAddSpecificCategory?: (name: string) => Promise<SpecificCategoryEntity | void>;
  onRenameSpecificCategory?: (
    category: SpecificCategoryEntity,
    newName: string,
  ) => Promise<void>;
  onDeleteSpecificCategory?: (category: SpecificCategoryEntity) => Promise<void>;
  onOpenSpecificColumnsSettings?: () => void;
};

function BusinessSidebarInner({
  collapsed = false,
  brands,
  brandCounts,
  soldRoute = false,
  onNavigate,
  specificCategories = [],
  selectedSpecificCategoryId = null,
  activeCollection: activeCollectionProp,
  canManageSpecificCategories = false,
  onSelectSpecificCategory,
  onAddSpecificCategory,
  onRenameSpecificCategory,
  onDeleteSpecificCategory,
  onOpenSpecificColumnsSettings,
}: BusinessSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { customization, isEditing, setCustomization } = useSidebarCustomization();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";

  const { collection: activeCollection, brandLocalId: activeBrandLocalId } = useMemo(
    () => parseCollectionFromSearchParams(searchParams, pathname),
    [pathname, searchParams],
  );
  const resolvedCollection = activeCollectionProp ?? activeCollection;

  const baseCounts = useSidebarCounts({
    profile,
    uid,
    companyId,
    brands,
    soldOnly: soldRoute || pathname === "/sold",
    enabled: Boolean(uid && companyId),
  });

  const counts = useMemo(() => {
    if (!brandCounts) return baseCounts;
    return { ...baseCounts, brandCounts };
  }, [baseCounts, brandCounts]);

  const navGroups = useMemo(
    () =>
      buildAutocoreNavGroups({
        profile,
        pathname,
        activeCollection,
        activeBrandLocalId,
        counts,
        brands,
        soldRoute,
        customization,
      }),
    [
      activeBrandLocalId,
      activeCollection,
      brands,
      counts,
      customization,
      pathname,
      profile,
      soldRoute,
    ],
  );

  const allowedNavIds = useMemo(
    () => customization.navOrder.filter((navId) => isNavAllowed(profile, navId)),
    [customization.navOrder, profile],
  );

  const disabledNav = useMemo(
    () => getDisabledNavItems(customization, allowedNavIds),
    [allowedNavIds, customization],
  );
  const disabledBlocks = useMemo(() => getDisabledBlocks(customization), [customization]);

  const hideNav = useCallback(
    (navId: SidebarNavItemId) => {
      setCustomization((current) => setNavItemEnabled(current, navId, false));
    },
    [setCustomization],
  );

  const restoreNav = useCallback(
    (navId: SidebarNavItemId) => {
      setCustomization((current) => setNavItemEnabled(current, navId, true));
    },
    [setCustomization],
  );

  const hideBlock = useCallback(
    (blockId: SidebarBlockId) => {
      setCustomization((current) => setBlockEnabled(current, blockId, false));
    },
    [setCustomization],
  );

  const restoreBlock = useCallback(
    (blockId: SidebarBlockId) => {
      setCustomization((current) => setBlockEnabled(current, blockId, true));
    },
    [setCustomization],
  );

  const showBrands =
    isBlockEnabled(customization, "brands") &&
    (shouldShowBrandsSidebarGroup(pathname, resolvedCollection) || isEditing);

  const showSpecificSheets =
    isBlockEnabled(customization, "specific") &&
    pathname === "/motors" &&
    collectionUsesSpecificSheets(resolvedCollection);

  const visibleNavGroups = useMemo(() => {
    if (isEditing || !collapsed) return navGroups;
    return navGroups.filter((group) => group.label == null || group.label === "Бизнес");
  }, [collapsed, isEditing, navGroups]);

  const effectiveCollapsed = isEditing ? false : collapsed;

  return (
    <aside
      data-barba-prevent
      data-collapsed={effectiveCollapsed ? "true" : "false"}
      data-sidebar-editing={isEditing ? "true" : undefined}
      className={cn(
        "app-sidebar flex h-full w-full flex-col bg-sidebar",
        effectiveCollapsed && "app-sidebar--collapsed",
      )}
    >
      <SidebarProvider
        open={!effectiveCollapsed}
        className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      >
        <TooltipProvider delay={0}>
          <Sidebar collapsible="none" variant="inset" className="border-none bg-transparent shadow-none">
            <SidebarContent className={cn("min-h-0 gap-0 pt-2", effectiveCollapsed && "px-1 pt-1")}>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                  {visibleNavGroups.map((group, index) => (
                    <AutocoreNavGroup
                      key={group.label ?? `nav-group-${index}`}
                      {...group}
                      collapsed={effectiveCollapsed}
                      onNavigate={onNavigate}
                      isEditing={isEditing}
                      onHideNav={hideNav}
                      onHideBlock={hideBlock}
                    />
                  ))}
                  {showSpecificSheets ? (
                    <SpecificCategoriesSidebarGroup
                      categories={specificCategories}
                      activeCollection={resolvedCollection}
                      selectedCategoryId={selectedSpecificCategoryId}
                      collapsed={effectiveCollapsed}
                      isEditing={isEditing}
                      canManage={canManageSpecificCategories}
                      onSelectCategory={(categoryId) => onSelectSpecificCategory?.(categoryId)}
                      onAddCategory={onAddSpecificCategory}
                      onRenameCategory={onRenameSpecificCategory}
                      onDeleteCategory={onDeleteSpecificCategory}
                      onOpenColumnsSettings={onOpenSpecificColumnsSettings}
                      onHide={() => hideBlock("specific")}
                    />
                  ) : null}
                  {showBrands ? (
                    <BrandsSidebarGroup
                      brands={brands}
                      brandCounts={brandCounts}
                      activeCollection={resolvedCollection}
                      activeBrandLocalId={activeBrandLocalId}
                      soldRoute={soldRoute || pathname === "/sold"}
                      collapsed={effectiveCollapsed}
                      onNavigate={onNavigate}
                      isEditing={isEditing}
                      onHide={() => hideBlock("brands")}
                    />
                  ) : null}
                </div>
                {!isEditing ? (
                  <SidebarFooter collapsed={effectiveCollapsed} onNavigate={onNavigate} />
                ) : null}
              </div>
              {isEditing ? (
                <SidebarCustomizeSheet
                  disabledNav={disabledNav}
                  disabledBlocks={disabledBlocks}
                  onRestoreNav={restoreNav}
                  onRestoreBlock={restoreBlock}
                />
              ) : null}
            </SidebarContent>
          </Sidebar>
        </TooltipProvider>
      </SidebarProvider>
    </aside>
  );
}

export function BusinessSidebar(props: BusinessSidebarProps) {
  return (
    <Suspense fallback={null}>
      <BusinessSidebarInner {...props} />
    </Suspense>
  );
}
