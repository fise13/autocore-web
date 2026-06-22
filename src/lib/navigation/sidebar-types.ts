import type { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";

export type SidebarPanelBaseProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
  linkAnimationIndex?: number;
};

export type AppSidebarProps = {
  collapsed?: boolean;
  brands: BrandEntity[];
  engines: EngineEntity[];
  specificCategories: SpecificCategoryEntity[];
  selectedBrandLocalId: number | null;
  selectedEngineLocalId: number | null;
  onBrandChange: (brandLocalId: number | null) => void;
  onEngineChange: (engineLocalId: number | null) => void;
  onClearBrandFilters: () => void;
  onRenameBrand?: (brand: BrandEntity, newName: string) => Promise<void>;
  onDeleteBrand?: (brand: BrandEntity) => Promise<void>;
  onAddBrand?: (name: string) => Promise<void>;
  onAddSpecificCategory?: (name: string) => Promise<SpecificCategoryEntity | void>;
  onRenameSpecificCategory?: (category: SpecificCategoryEntity, newName: string) => Promise<void>;
  onDeleteSpecificCategory?: (category: SpecificCategoryEntity) => Promise<void>;
  selectedSpecificCategoryId?: string | null;
  onSpecificCategoryChange?: (categoryId: string | null) => void;
  onOpenSpecificColumnsSettings?: () => void;
  canManageSpecificCategories?: boolean;
  showBrandFilters?: boolean;
  canManageBrands?: boolean;
  brandCounts?: Map<number, number>;
  brandsSectionTitle?: string;
  onNavigate?: () => void;
};

export type SidebarOrganizationSwitcherProps = Pick<SidebarPanelBaseProps, "collapsed">;

export type SidebarDocumentsPanelProps = SidebarPanelBaseProps;

export type SidebarTeamPanelProps = SidebarPanelBaseProps;

export function isSidebarNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/motors") {
    return pathname === "/motors";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
