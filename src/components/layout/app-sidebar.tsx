"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Cog, FileText, Plus, Tag, Trash2 } from "lucide-react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { Suspense, useCallback, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { reorderList, SidebarEditItem } from "@/components/layout/sidebar-edit-item";
import { AnimatedSidebarSlot } from "@/components/layout/animated-sidebar-slot";
import {
  sidebarNavIconClass,
  sidebarNavRowClass,
  sidebarSectionLabelClass,
} from "@/components/layout/sidebar-nav-row";
import { SidebarCustomizeSheet } from "@/components/layout/sidebar-customize-sheet";
import { SidebarContextPanel } from "@/components/layout/sidebar-context-panel";
import {
  resolveSidebarMode,
  showBrandFiltersInSidebar,
  showSpecificCategoriesInSidebar,
} from "@/lib/navigation/sidebar-mode";
import { resolveVisibleNavItems } from "@/lib/auth/app-access";
import { isLikelyMotorCatalogName } from "@/lib/motors/import/specific-category-intelligence";
import {
  SIDEBAR_BLOCK_META,
  SIDEBAR_NAV_META,
  isBlockEnabled,
  type SidebarBlockId,
  type SidebarCustomization,
  type SidebarNavItemId,
} from "@/lib/navigation/sidebar-customization";
import { userCopy, formatRole } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";

type AppSidebarProps = {
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
  showBrandFilters?: boolean;
  canManageBrands?: boolean;
  brandCounts?: Map<number, number>;
  brandsSectionTitle?: string;
  onNavigate?: () => void;
};

function isManagedBrand(brand: BrandEntity): boolean {
  return !brand.id.startsWith("derived-");
}

function SidebarDivider() {
  return <div className="my-3 h-px bg-sidebar-border" />;
}

export function AppSidebar({
  collapsed = false,
  brands,
  engines,
  specificCategories,
  selectedBrandLocalId,
  selectedEngineLocalId,
  onBrandChange,
  onEngineChange,
  onClearBrandFilters,
  onRenameBrand,
  onDeleteBrand,
  onAddBrand,
  showBrandFilters: showBrandFiltersProp,
  canManageBrands = false,
  brandCounts,
  brandsSectionTitle = "Бренды",
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { customization, isEditing, setCustomization } = useSidebarCustomization();
  const [dragging, setDragging] = useState<
    { kind: "block"; id: SidebarBlockId } | { kind: "nav"; id: SidebarNavItemId } | null
  >(null);

  const patch = useCallback(
    (updater: (current: SidebarCustomization) => SidebarCustomization) => {
      setCustomization((current) => updater(current));
    },
    [setCustomization],
  );
  const sidebarMode = resolveSidebarMode(pathname);
  const showSpecificCategories =
    showSpecificCategoriesInSidebar(sidebarMode) && isBlockEnabled(customization, "specific");
  const showBrandFilters =
    (showBrandFiltersProp ?? showBrandFiltersInSidebar(sidebarMode)) &&
    isBlockEnabled(customization, "brands");
  const { profile } = useAuth();
  const [expandedBrands, setExpandedBrands] = useState<Set<number>>(new Set());
  const [brandToRename, setBrandToRename] = useState<BrandEntity | null>(null);
  const [renameText, setRenameText] = useState("");
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [addBrandText, setAddBrandText] = useState("");
  const [brandToDelete, setBrandToDelete] = useState<BrandEntity | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const enabledNavIds = useMemo(
    () => resolveVisibleNavItems(profile, customization),
    [customization, profile],
  );

  const sidebarSpecificCategories = useMemo(
    () => specificCategories.filter((category) => !isLikelyMotorCatalogName(category.name)),
    [specificCategories],
  );

  const visibleBlocks = useMemo(() => {
    return customization.blockOrder.filter((blockId) => {
      if (collapsed && blockId !== "navigation") return false;
      if (!isBlockEnabled(customization, blockId)) return false;
      if (blockId === "profile") return false;
      if (blockId === "navigation") return enabledNavIds.length > 0;
      if (isEditing) return true;
      if (blockId === "specific") return showSpecificCategories;
      if (blockId === "brands") return showBrandFilters;
      return true;
    });
  }, [
    customization,
    enabledNavIds.length,
    isEditing,
    showBrandFilters,
    showSpecificCategories,
    collapsed,
  ]);

  const enginesByBrand = useMemo(() => {
    const map = new Map<number, EngineEntity[]>();
    for (const engine of engines) {
      const list = map.get(engine.brandLocalId) ?? [];
      list.push(engine);
      map.set(engine.brandLocalId, list);
    }
    return map;
  }, [engines]);

  const disabledNav = useMemo(
    () => customization.navOrder.filter((id) => customization.navItems[id]?.enabled === false),
    [customization],
  );
  const disabledBlocks = useMemo(
    () => customization.blockOrder.filter((id) => customization.blocks[id]?.enabled === false),
    [customization],
  );

  const handleNavDrop = useCallback(
    (targetId: SidebarNavItemId) => {
      if (!dragging || dragging.kind !== "nav" || dragging.id === targetId) return;
      patch((current) => {
        const from = current.navOrder.indexOf(dragging.id);
        const to = current.navOrder.indexOf(targetId);
        if (from < 0 || to < 0) return current;
        return { ...current, navOrder: reorderList(current.navOrder, from, to) };
      });
      setDragging(null);
    },
    [dragging, patch],
  );

  const handleBlockDrop = useCallback(
    (targetId: SidebarBlockId) => {
      if (!dragging || dragging.kind !== "block" || dragging.id === targetId) return;
      patch((current) => {
        const from = current.blockOrder.indexOf(dragging.id);
        const to = current.blockOrder.indexOf(targetId);
        if (from < 0 || to < 0) return current;
        return { ...current, blockOrder: reorderList(current.blockOrder, from, to) };
      });
      setDragging(null);
    },
    [dragging, patch],
  );

  function toggleBrand(brandLocalId: number) {
    setExpandedBrands((current) => {
      const next = new Set(current);
      if (next.has(brandLocalId)) next.delete(brandLocalId);
      else next.add(brandLocalId);
      return next;
    });
  }

  function openRenameDialog(brand: BrandEntity) {
    if (!canManageBrands || !onRenameBrand || !isManagedBrand(brand)) return;
    setActionError(null);
    setBrandToRename(brand);
    setRenameText(brand.name);
  }

  async function confirmAddBrand() {
    if (!onAddBrand) return;
    const trimmed = addBrandText.trim();
    if (!trimmed) return;

    setBusy(true);
    setActionError(null);
    try {
      await onAddBrand(trimmed);
      setAddBrandOpen(false);
      setAddBrandText("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось добавить бренд");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRename() {
    if (!brandToRename || !onRenameBrand) return;
    const trimmed = renameText.trim();
    if (!trimmed || trimmed === brandToRename.name) {
      setBrandToRename(null);
      return;
    }

    setBusy(true);
    setActionError(null);
    try {
      await onRenameBrand(brandToRename, trimmed);
      setBrandToRename(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось переименовать бренд");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!brandToDelete || !onDeleteBrand) return;
    setBusy(true);
    setActionError(null);
    try {
      await onDeleteBrand(brandToDelete);
      if (selectedBrandLocalId === brandToDelete.localId) {
        onClearBrandFilters();
      }
      setBrandToDelete(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось удалить бренд");
    } finally {
      setBusy(false);
    }
  }

  function renderBlockShell(
    blockId: SidebarBlockId,
    showDividerBefore: boolean,
    hint?: string,
    jiggleIndex = 0,
  ) {
    const meta = SIDEBAR_BLOCK_META[blockId];
    return (
      <div key={blockId} className="w-full">
        {showDividerBefore ? <SidebarDivider /> : null}
        <AnimatePresence mode="popLayout">
          <SidebarEditItem
            key={blockId}
            layoutId={`block-${blockId}`}
            icon={meta.icon}
            label={meta.label}
            hint={hint}
            jiggleDelay={jiggleIndex * 0.035}
            dragging={dragging?.kind === "block" && dragging.id === blockId}
            onRemove={() =>
              patch((current) => ({
                ...current,
                blocks: { ...current.blocks, [blockId]: { enabled: false } },
              }))
            }
            onDragStart={() => setDragging({ kind: "block", id: blockId })}
            onDragEnd={() => setDragging(null)}
            onDrop={() => handleBlockDrop(blockId)}
          />
        </AnimatePresence>
      </div>
    );
  }

  function renderBlock(blockId: SidebarBlockId, index: number) {
    const showDividerBefore = index > 0;

    switch (blockId) {
      case "navigation":
        if (isEditing) {
          return (
            <div key={blockId} className="w-full">
              {showDividerBefore ? <SidebarDivider /> : null}
              <nav className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {enabledNavIds.map((navId, navIndex) => {
                    const item = SIDEBAR_NAV_META[navId];
                    return (
                      <SidebarEditItem
                        key={navId}
                        layoutId={`nav-${navId}`}
                        icon={item.icon}
                        label={item.label}
                        jiggleDelay={navIndex * 0.035}
                        dragging={dragging?.kind === "nav" && dragging.id === navId}
                        onRemove={() =>
                          patch((current) => ({
                            ...current,
                            navItems: { ...current.navItems, [navId]: { enabled: false } },
                          }))
                        }
                        onDragStart={() => setDragging({ kind: "nav", id: navId })}
                        onDragEnd={() => setDragging(null)}
                        onDrop={() => handleNavDrop(navId)}
                      />
                    );
                  })}
                </AnimatePresence>
              </nav>
            </div>
          );
        }
        return (
          <div key={blockId}>
            {showDividerBefore ? <SidebarDivider /> : null}
            <nav className="space-y-1">
              {enabledNavIds.map((navId) => {
                const item = SIDEBAR_NAV_META[navId];
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : item.href === "/motors"
                      ? pathname === "/motors" || pathname.startsWith("/specific/")
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={navId}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      sidebarNavRowClass,
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-primary/12 text-primary shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5",
                      collapsed && "hover:translate-x-0",
                    )}
                  >
                    <Icon className={sidebarNavIconClass} />
                    <span className="sidebar-nav-label truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        );
      case "context":
        if (isEditing) {
          return renderBlockShell(blockId, showDividerBefore, undefined, index);
        }
        return (
          <div key={blockId}>
            {showDividerBefore ? <SidebarDivider /> : null}
            <Suspense fallback={null}>
              <SidebarContextPanel mode={sidebarMode} />
            </Suspense>
          </div>
        );
      case "specific":
        if (isEditing) {
          return renderBlockShell(
            blockId,
            showDividerBefore,
            showSpecificCategories
              ? `${sidebarSpecificCategories.length} категорий`
              : "Видно на странице моторов",
            index,
          );
        }
        return (
          <div key={blockId}>
            {showDividerBefore ? <SidebarDivider /> : null}
            <AnimatedSidebarSlot slotKey={showSpecificCategories ? `specific-${sidebarMode}` : "specific-hidden"}>
              {showSpecificCategories ? (
                <div className="px-3 py-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className={sidebarSectionLabelClass}>Специфичные</p>
                  </div>
                  {sidebarSpecificCategories.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs italic text-muted-foreground">Нет категорий</p>
                  ) : (
                    <div className="space-y-0.5">
                      {sidebarSpecificCategories.map((category) => {
                        const href = `/specific/${category.id}`;
                        const active =
                          pathname === href ||
                          pathname.startsWith(`${href}/`) ||
                          pathname.endsWith(`_${category.localId}`);
                        return (
                          <Link
                            key={category.id}
                            href={href}
                            onClick={onNavigate}
                            className={cn(
                              sidebarNavRowClass,
                              active
                                ? "bg-primary/12 text-primary shadow-sm"
                                : "text-sidebar-foreground hover:bg-sidebar-accent",
                            )}
                            title={category.name}
                          >
                            <FileText className="size-4 shrink-0 opacity-80" />
                            <span className="truncate">{category.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </AnimatedSidebarSlot>
          </div>
        );
      case "brands":
        if (isEditing) {
          return renderBlockShell(
            blockId,
            showDividerBefore,
            showBrandFilters ? brandsSectionTitle : "Видно на моторах и проданных",
            index,
          );
        }
        return (
          <div key={blockId}>
            {showDividerBefore ? <SidebarDivider /> : null}
            <AnimatedSidebarSlot
              slotKey={showBrandFilters ? `brands-${sidebarMode}` : "brands-hidden"}
            >
              {showBrandFilters ? (
            <div className="px-1 py-1">
              <div className="mb-1 flex items-center justify-between gap-2 px-3 py-2">
                <p className={sidebarSectionLabelClass}>{brandsSectionTitle}</p>
                {canManageBrands && onAddBrand ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setAddBrandText("");
                      setAddBrandOpen(true);
                    }}
                    className="rounded-md p-1 text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
                    aria-label="Добавить бренд"
                    title="Добавить бренд"
                  >
                    <Plus className="size-3.5" />
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClearBrandFilters}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                  selectedBrandLocalId == null && selectedEngineLocalId == null
                    ? "bg-primary/12 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Tag className="size-4 shrink-0 opacity-80" />
                {brandCounts ? "Все проданные" : "Все бренды"}
              </button>

              {brands.length === 0 ? (
                <p className="px-3 py-2 text-xs italic text-muted-foreground">
                  {brandCounts
                    ? "Проданных моторов пока нет"
                    : "Добавьте бренд кнопкой «+» или укажите в колонке таблицы"}
                </p>
              ) : null}

              {brands.map((brand) => {
                const brandEngines = enginesByBrand.get(brand.localId) ?? [];
                const expanded = expandedBrands.has(brand.localId);
                const brandSelected =
                  selectedBrandLocalId === brand.localId && selectedEngineLocalId == null;
                const manageable = canManageBrands && isManagedBrand(brand);
                const soldCount = brandCounts?.get(brand.localId);

                return (
                  <div key={brand.id} className="group mt-0.5">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => toggleBrand(brand.localId)}
                        className="rounded-md p-1 text-muted-foreground transition hover:bg-sidebar-accent"
                        aria-label={expanded ? "Свернуть" : "Развернуть"}
                      >
                        {expanded ? (
                          <ChevronDown className="size-3.5 transition-transform duration-200 ease-linear" />
                        ) : (
                          <ChevronRight className="size-3.5 transition-transform duration-200 ease-linear" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedBrands((current) => new Set(current).add(brand.localId));
                          onBrandChange(brand.localId);
                        }}
                        onDoubleClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openRenameDialog(brand);
                        }}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-all duration-200",
                          brandSelected
                            ? "bg-primary/12 text-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent",
                        )}
                        title={manageable ? "Двойной клик — переименовать" : undefined}
                      >
                        <span className="truncate">{brand.name}</span>
                        {soldCount != null && soldCount > 0 ? (
                          <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {soldCount}
                          </span>
                        ) : null}
                      </button>
                      {manageable && onDeleteBrand ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActionError(null);
                            setBrandToDelete(brand);
                          }}
                          className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Удалить ${brand.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-linear motion-reduce:transition-none",
                        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                      <div className="ml-5 space-y-0.5 border-l border-sidebar-border pl-2 pt-1">
                        {brandEngines.map((engine) => (
                          <button
                            key={engine.id}
                            type="button"
                            onClick={() => {
                              onBrandChange(brand.localId);
                              onEngineChange(engine.localId);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-all duration-200",
                              selectedEngineLocalId === engine.localId
                                ? "bg-primary/12 text-primary"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                            )}
                          >
                            <Cog className="size-3 shrink-0 opacity-70" />
                            <span className="truncate uppercase">{engine.code}</span>
                          </button>
                        ))}
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
              ) : null}
            </AnimatedSidebarSlot>
          </div>
        );
      case "profile":
        return null;
      default:
        return null;
    }
  }

  const showProfileFooter = isBlockEnabled(customization, "profile");

  return (
    <>
      <aside
        data-collapsed={collapsed ? "true" : "false"}
        className={cn("app-sidebar flex h-full w-full flex-col bg-sidebar", collapsed && "app-sidebar--collapsed")}
      >
        {isEditing ? (
          <LayoutGroup id="sidebar-customize">
            <div className="flex-1 overflow-y-auto px-2 py-3">
              {visibleBlocks.map((blockId, index) => renderBlock(blockId, index))}
              {showProfileFooter ? (
                <>
                  <SidebarDivider />
                  <SidebarEditItem
                    layoutId="block-profile"
                    icon={SIDEBAR_BLOCK_META.profile.icon}
                    label={SIDEBAR_BLOCK_META.profile.label}
                    hint={profile?.email ?? undefined}
                    jiggleDelay={0.08}
                    dragging={dragging?.kind === "block" && dragging.id === "profile"}
                    onRemove={() =>
                      patch((current) => ({
                        ...current,
                        blocks: { ...current.blocks, profile: { enabled: false } },
                      }))
                    }
                    onDragStart={() => setDragging({ kind: "block", id: "profile" })}
                    onDragEnd={() => setDragging(null)}
                    onDrop={() => handleBlockDrop("profile")}
                  />
                </>
              ) : null}
            </div>

            <SidebarCustomizeSheet
              disabledNav={disabledNav}
              disabledBlocks={disabledBlocks}
              onRestoreNav={(navId) =>
                patch((current) => ({
                  ...current,
                  navItems: { ...current.navItems, [navId]: { enabled: true } },
                }))
              }
              onRestoreBlock={(blockId) =>
                patch((current) => ({
                  ...current,
                  blocks: { ...current.blocks, [blockId]: { enabled: true } },
                }))
              }
            />
          </LayoutGroup>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-2 py-3">
              {visibleBlocks.map((blockId, index) => renderBlock(blockId, index))}
            </div>
            <div className="shrink-0 border-t border-sidebar-border/80 px-2 py-2 transition-opacity duration-200 ease-linear">
              {showProfileFooter && !collapsed ? (
                <div className="px-1">
                  <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {userCopy.settings.role}: {formatRole(profile?.role)}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </aside>

      <Dialog open={addBrandOpen} onOpenChange={(open) => !open && setAddBrandOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userCopy.brands.addTitle}</DialogTitle>
            <DialogDescription>{userCopy.brands.addHint}</DialogDescription>
          </DialogHeader>
          <Input
            value={addBrandText}
            onChange={(event) => setAddBrandText(event.target.value)}
            placeholder={userCopy.brands.addPlaceholder}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void confirmAddBrand();
              }
            }}
          />
          {actionError && addBrandOpen ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAddBrandOpen(false)} disabled={busy}>
              Отмена
            </Button>
            <Button type="button" onClick={() => void confirmAddBrand()} disabled={busy || !addBrandText.trim()}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={brandToRename != null} onOpenChange={(open) => !open && setBrandToRename(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userCopy.brands.renameTitle}</DialogTitle>
            <DialogDescription>{userCopy.brands.renameHint}</DialogDescription>
          </DialogHeader>
          <Input
            value={renameText}
            onChange={(event) => setRenameText(event.target.value)}
            placeholder={userCopy.brands.renamePlaceholder}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void confirmRename();
              }
            }}
          />
          {actionError && brandToRename ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setBrandToRename(null)} disabled={busy}>
              Отмена
            </Button>
            <Button type="button" onClick={() => void confirmRename()} disabled={busy || !renameText.trim()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={brandToDelete != null} onOpenChange={(open) => !open && setBrandToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userCopy.brands.deleteTitle}</DialogTitle>
            <DialogDescription>{userCopy.brands.deleteHint}</DialogDescription>
          </DialogHeader>
          {brandToDelete ? (
            <p className="text-sm font-medium">{brandToDelete.name}</p>
          ) : null}
          {actionError && brandToDelete ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setBrandToDelete(null)} disabled={busy}>
              Отмена
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={busy}>
              {userCopy.brands.deleteAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
