"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Cog, FileText, Folder, LayoutGrid, Package, Radar, Receipt, Tag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
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
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";

type AppSidebarProps = {
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
  showBrandFilters: boolean;
  canManageBrands?: boolean;
  hideSpecificCategories?: boolean;
  brandCounts?: Map<number, number>;
  brandsSectionTitle?: string;
};

const navItems = [
  { href: "/", label: "Mission Control", icon: Radar },
  { href: "/motors", label: "Все моторы", icon: LayoutGrid },
  { href: "/sold", label: "Проданные", icon: Receipt },
  { href: "/accounting", label: "Бухгалтерия", icon: Folder },
  { href: "/warehouse", label: "Склад", icon: Package },
];

function isManagedBrand(brand: BrandEntity): boolean {
  return !brand.id.startsWith("derived-");
}

export function AppSidebar({
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
  showBrandFilters,
  canManageBrands = false,
  hideSpecificCategories = false,
  brandCounts,
  brandsSectionTitle = "Бренды",
}: AppSidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [expandedBrands, setExpandedBrands] = useState<Set<number>>(new Set());
  const [brandToRename, setBrandToRename] = useState<BrandEntity | null>(null);
  const [renameText, setRenameText] = useState("");
  const [brandToDelete, setBrandToDelete] = useState<BrandEntity | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const enginesByBrand = useMemo(() => {
    const map = new Map<number, EngineEntity[]>();
    for (const engine of engines) {
      const list = map.get(engine.brandLocalId) ?? [];
      list.push(engine);
      map.set(engine.brandLocalId, list);
    }
    return map;
  }, [engines]);

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

  return (
    <>
      <aside className="flex h-full w-full flex-col bg-sidebar">
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                    active
                      ? "bg-primary/12 text-primary shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5",
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="my-3 h-px bg-sidebar-border" />

          {!hideSpecificCategories ? (
            <div className="px-3 py-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Специфичные
                </p>
              </div>
              {specificCategories.length === 0 ? (
                <p className="px-2 py-1.5 text-xs italic text-muted-foreground">Нет категорий</p>
              ) : (
                <div className="space-y-0.5">
                  {specificCategories.map((category) => {
                    const href = `/specific/${category.id}`;
                    const active =
                      pathname === href ||
                      pathname.startsWith(`${href}/`) ||
                      pathname.endsWith(`_${category.localId}`);
                    return (
                      <Link
                        key={category.id}
                        href={href}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                          active
                            ? "bg-primary/12 text-primary shadow-sm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5",
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

          {showBrandFilters ? (
            <>
              <div className="my-3 h-px bg-sidebar-border" />
              <div className="px-1 py-1">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {brandsSectionTitle}
                </p>

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
                    {brandCounts ? "Проданных моторов пока нет" : "Бренды не найдены"}
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
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
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
                          "overflow-hidden transition-all duration-300 ease-out",
                          expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                        )}
                      >
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
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        <div className="border-t px-3 py-3">
          <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          <p className="text-[11px] capitalize text-muted-foreground">
            Роль: {profile?.role}
          </p>
        </div>
      </aside>

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
