import type { BrandEntity } from "@/infrastructure/firestore/catalog-repository";
import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";
import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";

export type SidebarPanelBaseProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
  linkAnimationIndex?: number;
};

export type AppSidebarProps = {
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

export type SidebarOrganizationSwitcherProps = Pick<SidebarPanelBaseProps, "collapsed">;

export type SidebarDocumentsPanelProps = SidebarPanelBaseProps;

export type SidebarTeamPanelProps = SidebarPanelBaseProps;

export function isSidebarNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/motors")) {
    return pathname === "/motors" || pathname.startsWith("/specific/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
