"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Minus, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { createBrandUseCase } from "@/application/use-cases/create-brand";
import { deleteBrandUseCase } from "@/application/use-cases/delete-brand";
import { renameBrandUseCase } from "@/application/use-cases/rename-brand";
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCatalogRealtime } from "@/hooks/use-catalog-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import type { BrandEntity } from "@/infrastructure/firestore/catalog-repository";
import { createCatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { can } from "@/lib/auth/permissions";
import { businessNavCopy } from "@/lib/navigation/business-nav-copy";
import { buildBrandHref } from "@/lib/navigation/inventory-collections";
import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const catalogRepository = createCatalogRepository();
const motorRepository = createMotorRepository();

type DialogMode =
  | { kind: "create" }
  | { kind: "rename"; brand: BrandEntity }
  | { kind: "delete"; brand: BrandEntity }
  | null;

type BrandsSidebarGroupProps = {
  brands: BrandEntity[];
  brandCounts?: Map<number, number>;
  activeCollection: InventoryCollectionId;
  activeBrandLocalId?: number;
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
  soldRoute = false,
  collapsed = false,
  onNavigate,
  isEditing = false,
  onHide,
}: BrandsSidebarGroupProps) {
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

  const [dialog, setDialog] = useState<DialogMode>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedBrands = useMemo(
    () => [...brands].sort((left, right) => left.name.localeCompare(right.name, "ru")),
    [brands],
  );

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

  function openDelete(brand: BrandEntity) {
    if (!canManage) return;
    setError(null);
    setName("");
    setDialog({ kind: "delete", brand });
  }

  function closeDialog() {
    setDialog(null);
    setError(null);
    setName("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || !companyId) return;

    const trimmed = name.trim();
    if (dialog.kind !== "delete" && !trimmed) return;

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
      } else if (dialog.kind === "delete") {
        await deleteBrandUseCase(catalogRepository, {
          brand: dialog.brand,
          engines,
        });
      }
      closeDialog();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить бренд");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!dialog || dialog.kind !== "delete" || !companyId) return;
    setBusy(true);
    setError(null);
    try {
      await deleteBrandUseCase(catalogRepository, {
        brand: dialog.brand,
        engines,
      });
      closeDialog();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось удалить бренд");
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
              title="Скрыть"
            >
              <Minus className="size-2.5" strokeWidth={2.5} />
            </button>
          ) : null}
          <SidebarGroupLabel className={cn(isEditing && "pl-4")}>
            {businessNavCopy.collections.brands}
          </SidebarGroupLabel>
        </div>
        {canManage && !isEditing ? (
          <SidebarGroupAction title="Добавить бренд" onClick={openCreate}>
            <Plus />
            <span className="sr-only">Добавить бренд</span>
          </SidebarGroupAction>
        ) : null}

        <SidebarMenu>
          {sortedBrands.length === 0 ? (
            <SidebarMenuItem>
              <div className="rounded-lg border border-dashed border-sidebar-border/70 px-3 py-3 text-center">
                <p className="text-xs text-muted-foreground">{businessNavCopy.empty.brands}</p>
                {canManage ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    Добавить бренд
                  </button>
                ) : null}
              </div>
            </SidebarMenuItem>
          ) : (
            sortedBrands.map((brand) => {
              const href = buildBrandHref({
                brandLocalId: brand.localId,
                sold: soldRoute,
                collection: activeCollection,
              });
              const brandCount = brandCounts?.get(brand.localId) ?? 0;
              const isActive = activeBrandLocalId === brand.localId;

              return (
                <SidebarMenuItem key={brand.id} className="group/menu-item">
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={brand.name}
                    render={
                      isEditing ? undefined : <Link href={href} onClick={() => onNavigate?.()} />
                    }
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      openRename(brand);
                    }}
                  >
                    <span className="truncate">{brand.name}</span>
                    {brandCount > 0 ? (
                      <SidebarMenuBadge>{brandCount > 99 ? "99+" : brandCount}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuButton>

                  {canManage && !isEditing ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <SidebarMenuAction showOnHover title={`Действия: ${brand.name}`} />
                        }
                      >
                        <MoreHorizontal />
                        <span className="sr-only">Действия</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="w-44">
                        <DropdownMenuItem className="gap-2" onClick={() => openRename(brand)}>
                          <Pencil className="size-4" />
                          Переименовать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onClick={() => openDelete(brand)}
                        >
                          <Trash2 className="size-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={dialog?.kind === "create" || dialog?.kind === "rename"} onOpenChange={(open) => !open && closeDialog()}>
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
              <Label htmlFor="brand-name">Название</Label>
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
                Отмена
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {dialog?.kind === "rename" ? "Сохранить" : "Добавить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === "delete"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userCopy.brands.deleteTitle}</DialogTitle>
            <DialogDescription>
              {dialog?.kind === "delete" ? (
                <>
                  {userCopy.brands.deleteHint}
                  {dialog.brand.name ? (
                    <span className="mt-2 block font-medium text-foreground">{dialog.brand.name}</span>
                  ) : null}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={busy}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void confirmDelete()}
            >
              {userCopy.brands.deleteAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
