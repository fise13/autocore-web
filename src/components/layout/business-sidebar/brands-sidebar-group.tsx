"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon, Minus, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { createBrandUseCase } from "@/application/use-cases/create-brand";
import { deleteBrandUseCase } from "@/application/use-cases/delete-brand";
import { renameBrandUseCase } from "@/application/use-cases/rename-brand";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useToast } from "@/components/ui/toast-provider";
import { useCatalogRealtime } from "@/hooks/use-catalog-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import type { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { createCatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { can } from "@/lib/auth/permissions";
import { countStockByBrandEngine, type EngineStock } from "@/lib/catalog-brand-counts";
import { normalizeCompanyId } from "@/lib/company-id";
import { businessNavCopy } from "@/lib/navigation/business-nav-copy";
import {
  buildBrandHref,
  buildCollectionHref,
  type InventoryCollectionId,
} from "@/lib/navigation/inventory-collections";
import type { PinnedFilterId } from "@/lib/navigation/pinned-filters";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const catalogRepository = createCatalogRepository();
const motorRepository = createMotorRepository();

type DialogMode =
  | { kind: "create" }
  | { kind: "rename"; brand: BrandEntity }
  | null;

type BrandsSidebarGroupProps = {
  brands: BrandEntity[];
  brandCounts?: Map<number, number>;
  activeCollection: InventoryCollectionId;
  activeBrandLocalId?: number;
  activeFilter?: PinnedFilterId;
  soldRoute?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  isEditing?: boolean;
  onHide?: () => void;
};

export function BrandsSidebarGroup({
  brands,
  brandCounts,
  activeCollection,
  activeBrandLocalId,
  activeFilter,
  soldRoute = false,
  collapsed = false,
  onNavigate,
  isEditing = false,
  onHide,
}: BrandsSidebarGroupProps) {
  const router = useRouter();
  const activeEngineCode = useSearchParams().get("engine")?.trim().toLowerCase() || null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const canManage = can(profile, "inventory_edit");

  const { engines } = useCatalogRealtime(catalogRepository, companyId, Boolean(companyId));
  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: Boolean(uid && companyId),
  });

  // Sold archive counts come from the parent; the per-model stock list is for live stock only.
  const stockByBrand = useMemo(
    () => (soldRoute ? new Map<string, EngineStock[]>() : countStockByBrandEngine(motorsQuery.data ?? [])),
    [motorsQuery.data, soldRoute],
  );
  const [openBrandIds, setOpenBrandIds] = useState<Set<number>>(
    () => new Set(activeBrandLocalId != null ? [activeBrandLocalId] : []),
  );
  // Navigating to a brand (from anywhere) unfolds it; adjusted during render, not in an effect.
  const [lastActiveBrand, setLastActiveBrand] = useState(activeBrandLocalId);
  if (lastActiveBrand !== activeBrandLocalId) {
    setLastActiveBrand(activeBrandLocalId);
    if (activeBrandLocalId != null && !openBrandIds.has(activeBrandLocalId)) {
      setOpenBrandIds(new Set(openBrandIds).add(activeBrandLocalId));
    }
  }

  const toggleBrandOpen = useCallback((brandLocalId: number) => {
    setOpenBrandIds((current) => {
      const next = new Set(current);
      if (next.has(brandLocalId)) next.delete(brandLocalId);
      else next.add(brandLocalId);
      return next;
    });
  }, []);

  const brandsKey = useMemo(
    () => ["catalog", "brands", companyId] as const,
    [companyId],
  );
  const enginesKey = useMemo(
    () => ["catalog", "engines", companyId] as const,
    [companyId],
  );

  const [dialog, setDialog] = useState<DialogMode>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Excel-style: vanish immediately, persist in background. */
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(() => new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());

  const sortedBrands = useMemo(
    () =>
      [...brands]
        .filter((brand) => !pendingDeleteIds.has(brand.id))
        .sort((left, right) => left.name.localeCompare(right.name, "ru")),
    [brands, pendingDeleteIds],
  );

  const allBrandCount = useMemo(() => {
    if (!brandCounts || brandCounts.size === 0) return 0;
    let total = 0;
    for (const count of brandCounts.values()) {
      total += count;
    }
    return total;
  }, [brandCounts]);

  const allBrandsHref = useMemo(() => {
    if (soldRoute) {
      const params = new URLSearchParams();
      params.set("collection", activeCollection);
      if (activeFilter) params.set("filter", activeFilter);
      const query = params.toString();
      return query ? `/sold?${query}` : "/sold";
    }
    return buildCollectionHref({
      collection: activeCollection,
      filter: activeFilter,
      brandLocalId: null,
    });
  }, [activeCollection, activeFilter, soldRoute]);

  // Drop pending markers once realtime confirms the brand is gone.
  useEffect(() => {
    setPendingDeleteIds((current) => {
      if (current.size === 0) return current;
      let changed = false;
      const next = new Set<string>();
      for (const id of current) {
        if (brands.some((brand) => brand.id === id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [brands]);

  const displayBrands = useMemo(() => {
    const exiting = brands.filter(
      (brand) => exitingIds.has(brand.id) && !pendingDeleteIds.has(brand.id),
    );
    // Exiting rows stay mounted briefly so the collapse can play.
    const byId = new Map(sortedBrands.map((brand) => [brand.id, brand]));
    for (const brand of exiting) {
      if (!byId.has(brand.id)) byId.set(brand.id, brand);
    }
    return Array.from(byId.values()).sort((left, right) =>
      left.name.localeCompare(right.name, "ru"),
    );
  }, [brands, exitingIds, pendingDeleteIds, sortedBrands]);

  function openCreate() {
    setError(null);
    setName("");
    setDialog({ kind: "create" });
  }

  function openRename(brand: BrandEntity) {
    if (!canManage) return;
    setError(null);
    setName(brand.name);
    setDialog({ kind: "rename", brand });
  }

  function closeDialog() {
    setDialog(null);
    setError(null);
    setName("");
  }

  const applyOptimisticDelete = useCallback(
    (brand: BrandEntity) => {
      queryClient.setQueryData<BrandEntity[]>(brandsKey, (current) =>
        (current ?? []).filter((entry) => entry.id !== brand.id),
      );
      queryClient.setQueryData<EngineEntity[]>(enginesKey, (current) =>
        (current ?? []).filter((entry) => entry.brandLocalId !== brand.localId),
      );
    },
    [brandsKey, enginesKey, queryClient],
  );

  const restoreOptimisticDelete = useCallback(
    (brand: BrandEntity, brandEngines: EngineEntity[]) => {
      queryClient.setQueryData<BrandEntity[]>(brandsKey, (current) => {
        const list = current ?? [];
        if (list.some((entry) => entry.id === brand.id)) return list;
        return [...list, brand].sort((left, right) =>
          left.name.localeCompare(right.name, "ru"),
        );
      });
      if (brandEngines.length === 0) return;
      queryClient.setQueryData<EngineEntity[]>(enginesKey, (current) => {
        const list = current ?? [];
        const missing = brandEngines.filter(
          (engine) => !list.some((entry) => entry.id === engine.id),
        );
        if (missing.length === 0) return list;
        return [...list, ...missing];
      });
    },
    [brandsKey, enginesKey, queryClient],
  );

  const handleDelete = useCallback(
    (brand: BrandEntity) => {
      if (!canManage || !companyId || !uid || pendingDeleteIds.has(brand.id) || exitingIds.has(brand.id)) {
        return;
      }

      const brandEngines = engines.filter(
        (engine) => engine.brandLocalId === brand.localId,
      );
      const motors = motorsQuery.data ?? [];

      // Match Excel Clear: collapse + hide immediately, persist in background.
      setExitingIds((current) => new Set(current).add(brand.id));
      setPendingDeleteIds((current) => new Set(current).add(brand.id));
      applyOptimisticDelete(brand);

      window.setTimeout(() => {
        setExitingIds((current) => {
          const next = new Set(current);
          next.delete(brand.id);
          return next;
        });
      }, 180);

      if (activeBrandLocalId === brand.localId) {
        router.replace(
          soldRoute ? "/sold" : buildCollectionHref({ collection: activeCollection }),
        );
      }

      void deleteBrandUseCase(catalogRepository, motorRepository, {
        uid,
        brand,
        engines,
        motors,
      }).catch((submitError: unknown) => {
        setPendingDeleteIds((current) => {
          const next = new Set(current);
          next.delete(brand.id);
          return next;
        });
        setExitingIds((current) => {
          const next = new Set(current);
          next.delete(brand.id);
          return next;
        });
        restoreOptimisticDelete(brand, brandEngines);
        const message =
          submitError instanceof Error ? submitError.message : undefined;
        const permissionDenied =
          typeof message === "string" &&
          /permission|insufficient|Missing or insufficient/i.test(message);
        toast({
          title: userCopy.brands.deleteFailed,
          description: permissionDenied
            ? userCopy.migration.errors.permissionDenied
            : message,
          variant: "error",
        });
      });
    },
    [
      activeBrandLocalId,
      activeCollection,
      applyOptimisticDelete,
      canManage,
      companyId,
      engines,
      exitingIds,
      motorsQuery.data,
      pendingDeleteIds,
      restoreOptimisticDelete,
      router,
      soldRoute,
      toast,
      uid,
    ],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || !companyId) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    try {
      if (dialog.kind === "create") {
        await createBrandUseCase(catalogRepository, {
          companyId,
          name: trimmed,
          existingBrands: brands,
        });
      } else if (dialog.kind === "rename") {
        await renameBrandUseCase(catalogRepository, motorRepository, {
          uid,
          brand: dialog.brand,
          newName: trimmed,
          existingBrands: brands,
          motors: motorsQuery.data ?? [],
        });
      }
      closeDialog();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : userCopy.brands.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  if (collapsed) return null;

  return (
    <>
      <SidebarGroup
        className={cn(
          "group/brands relative",
          isEditing && "animate-sidebar-jiggle pl-1",
        )}
      >
        <div className="relative flex items-center">
          {isEditing ? (
            <button
              type="button"
              onClick={onHide}
              className="absolute left-0 top-1/2 z-10 flex size-4 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title={userCopy.layout.hide}
            >
              <Minus className="size-2.5" strokeWidth={2.5} />
            </button>
          ) : null}
          <SidebarGroupLabel className={cn(isEditing && "pl-4")}>
            {businessNavCopy.collections.brands}
          </SidebarGroupLabel>
        </div>
        {canManage && !isEditing ? (
          <SidebarGroupAction title={userCopy.brands.addAction} onClick={openCreate}>
            <Plus />
            <span className="sr-only">{userCopy.brands.addAction}</span>
          </SidebarGroupAction>
        ) : null}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeBrandLocalId == null}
              tooltip={userCopy.motors.filters.allBrands}
              render={
                isEditing ? undefined : <Link href={allBrandsHref} onClick={() => onNavigate?.()} />
              }
            >
              <span className="min-w-0 flex-1 truncate">{userCopy.motors.filters.all}</span>
              {allBrandCount > 0 ? (
                <span className="shrink-0 text-xs tabular-nums tracking-tight text-muted-foreground">
                  {allBrandCount.toLocaleString("en-US")}
                </span>
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {displayBrands.length === 0 ? (
            <SidebarMenuItem>
              <div className="rounded-lg border border-dashed border-sidebar-border/70 px-3 py-3 text-center">
                <p className="text-xs text-muted-foreground">{businessNavCopy.empty.brands}</p>
                {canManage ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    {userCopy.brands.addAction}
                  </button>
                ) : null}
              </div>
            </SidebarMenuItem>
          ) : (
            displayBrands.map((brand) => {
              const href = buildBrandHref({
                brandLocalId: brand.localId,
                sold: soldRoute,
                filter: activeFilter,
                collection: activeCollection,
              });
              const brandCount = brandCounts?.get(brand.localId) ?? 0;
              const isActive = activeBrandLocalId === brand.localId;
              const showActions = canManage && !isEditing;
              const isExiting = exitingIds.has(brand.id);
              const engineStock = stockByBrand.get(brand.name.trim().toLowerCase()) ?? [];
              const hasEngines = engineStock.length > 0 && !isEditing;
              const isOpen = hasEngines && openBrandIds.has(brand.localId);

              return (
                <Collapsible
                  key={brand.id}
                  open={isOpen}
                  className={cn(
                    "group/menu-item overflow-hidden transition-[opacity,transform,max-height] duration-200 ease-out",
                    isExiting
                      ? "pointer-events-none max-h-0 opacity-0 -translate-y-0.5"
                      : "max-h-[200rem] opacity-100",
                  )}
                  render={<SidebarMenuItem />}
                >
                  <SidebarMenuButton
                    isActive={isActive && !activeEngineCode}
                    tooltip={brand.name}
                    className={cn("group", showActions && "pr-8")}
                    data-panel-open={isOpen ? "" : undefined}
                    render={
                      isEditing ? undefined : (
                        <Link
                          href={href}
                          onClick={() => {
                            // First click opens the brand; clicking the open, unfiltered brand folds it.
                            if (!isOpen || (isActive && !activeEngineCode)) toggleBrandOpen(brand.localId);
                            onNavigate?.();
                          }}
                        />
                      )
                    }
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      openRename(brand);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{brand.name}</span>
                    {brandCount > 0 ? (
                      <span className="shrink-0 text-xs tabular-nums tracking-tight text-muted-foreground">
                        {brandCount.toLocaleString("en-US")}
                      </span>
                    ) : null}
                    {hasEngines ? (
                      <ChevronRightIcon className="size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[panel-open]:rotate-90 motion-reduce:transition-none" />
                    ) : null}
                  </SidebarMenuButton>

                  {showActions ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <SidebarMenuAction
                            showOnHover
                            title={userCopy.brands.actionsFor(brand.name)}
                          />
                        }
                      >
                        <MoreHorizontal />
                        <span className="sr-only">{userCopy.brands.actions}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="w-44">
                        <DropdownMenuItem className="gap-2" onClick={() => openRename(brand)}>
                          <Pencil className="size-4" />
                          {userCopy.brands.rename}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onClick={() => handleDelete(brand)}
                        >
                          <Trash2 className="size-4" />
                          {userCopy.brands.deleteAction}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}

                  {hasEngines ? (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {engineStock.map((engine) => (
                          <SidebarMenuSubItem key={engine.code}>
                            <SidebarMenuSubButton
                              isActive={isActive && activeEngineCode === engine.code.toLowerCase()}
                              render={
                                <Link
                                  href={buildBrandHref({
                                    brandLocalId: brand.localId,
                                    engineCode: engine.code,
                                    filter: activeFilter,
                                    collection: activeCollection,
                                  })}
                                  onClick={() => onNavigate?.()}
                                />
                              }
                            >
                              <span className="min-w-0 flex-1 truncate">{engine.code}</span>
                              <span className="shrink-0 text-xs tabular-nums tracking-tight text-muted-foreground">
                                {engine.count.toLocaleString("en-US")}
                              </span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  ) : null}
                </Collapsible>
              );
            })
          )}
        </SidebarMenu>
      </SidebarGroup>

      <Dialog
        open={dialog?.kind === "create" || dialog?.kind === "rename"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "rename" ? userCopy.brands.renameTitle : userCopy.brands.addTitle}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "rename" ? userCopy.brands.renameHint : userCopy.brands.addHint}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand-name">{userCopy.brands.nameLabel}</Label>
              <Input
                id="brand-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={
                  dialog?.kind === "rename"
                    ? userCopy.brands.renamePlaceholder
                    : userCopy.brands.addPlaceholder
                }
                autoFocus
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={busy}>
                {userCopy.brands.cancel}
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {dialog?.kind === "rename" ? userCopy.brands.save : userCopy.brands.add}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
