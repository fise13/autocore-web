"use client";

import { FormEvent, useMemo, useState } from "react";
import { FileText, Minus, MoreHorizontal, Pencil, Plus, Settings2, Trash2 } from "lucide-react";

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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";
import { groupIdForCollection } from "@/lib/navigation/inventory-collections";
import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";
import { specificCategoriesForCollection } from "@/lib/navigation/specific-categories-for-collection";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type DialogMode =
  | { kind: "create" }
  | { kind: "rename"; category: SpecificCategoryEntity }
  | { kind: "delete"; category: SpecificCategoryEntity }
  | null;

export type SpecificCategoriesSidebarGroupProps = {
  categories: SpecificCategoryEntity[];
  activeCollection: InventoryCollectionId;
  selectedCategoryId?: string | null;
  collapsed?: boolean;
  isEditing?: boolean;
  canManage?: boolean;
  onSelectCategory: (categoryId: string | null) => void;
  onAddCategory?: (name: string) => Promise<SpecificCategoryEntity | void>;
  onRenameCategory?: (category: SpecificCategoryEntity, newName: string) => Promise<void>;
  onDeleteCategory?: (category: SpecificCategoryEntity) => Promise<void>;
  onOpenColumnsSettings?: () => void;
  onHide?: () => void;
};

function EditRemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick();
      }}
      className="absolute left-0 top-1/2 z-10 flex size-4 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      title="Скрыть"
    >
      <Minus className="size-2.5" strokeWidth={2.5} />
    </button>
  );
}

export function SpecificCategoriesSidebarGroup({
  categories,
  activeCollection,
  selectedCategoryId = null,
  collapsed = false,
  isEditing = false,
  canManage = false,
  onSelectCategory,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onOpenColumnsSettings,
  onHide,
}: SpecificCategoriesSidebarGroupProps) {
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const visibleCategories = useMemo(
    () => specificCategoriesForCollection(activeCollection, categories),
    [activeCollection, categories],
  );

  async function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Введите название");
      return;
    }

    setPending(true);
    setError(null);
    try {
      if (dialog.kind === "create") {
        if (!onAddCategory) return;
        await onAddCategory(trimmed);
      } else if (dialog.kind === "rename") {
        if (!onRenameCategory) return;
        await onRenameCategory(dialog.category, trimmed);
      } else if (dialog.kind === "delete") {
        if (!onDeleteCategory) return;
        await onDeleteCategory(dialog.category);
      }
      setDialog(null);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setPending(false);
    }
  }

  function openCreate() {
    setError(null);
    setText("");
    setDialog({ kind: "create" });
  }

  function openRename(category: SpecificCategoryEntity) {
    setError(null);
    setText(category.name);
    setDialog({ kind: "rename", category });
  }

  function openDelete(category: SpecificCategoryEntity) {
    setError(null);
    setText("");
    setDialog({ kind: "delete", category });
  }

  const groupLabel = groupIdForCollection(activeCollection) === "parts" ? "Листы запчастей" : "Листы агрегатов";

  return (
    <>
      <SidebarGroup className={cn(collapsed && "p-1", isEditing && "relative")}>
        {collapsed ? null : (
          <div className="relative flex items-center justify-between pr-1">
            {isEditing ? <EditRemoveButton onClick={() => onHide?.()} /> : null}
            <SidebarGroupLabel className={cn(isEditing && "pl-4")}>{groupLabel}</SidebarGroupLabel>
            {canManage && !isEditing ? (
              <div className="flex items-center gap-0.5">
                {selectedCategoryId && onOpenColumnsSettings ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Колонки листа"
                    title="Колонки"
                    onClick={onOpenColumnsSettings}
                  >
                    <Settings2 className="size-3.5" />
                  </Button>
                ) : null}
                {onAddCategory ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Создать лист"
                    title="Создать лист"
                    onClick={openCreate}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        <SidebarMenu className={cn(collapsed && "gap-1")}>
          {visibleCategories.length === 0 ? (
            collapsed ? null : (
              <SidebarMenuItem>
                {canManage && onAddCategory ? (
                  <SidebarMenuButton onClick={openCreate} className="text-primary">
                    <Plus className="size-4" />
                    <span data-sidebar-hide-collapsed>{userCopy.specificSheets.emptyCta}</span>
                  </SidebarMenuButton>
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Нет листов</p>
                )}
              </SidebarMenuItem>
            )
          ) : (
            visibleCategories.map((category) => {
              const active = selectedCategoryId === category.id;
              return (
                <SidebarMenuItem key={category.id}>
                  <div className="group/item flex w-full items-center gap-0.5">
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={category.name}
                      onClick={() => onSelectCategory(active ? null : category.id)}
                      className={cn(collapsed && "justify-center")}
                    >
                      <FileText className="size-4 shrink-0 opacity-80" />
                      <span data-sidebar-hide-collapsed className="truncate">
                        {category.name}
                      </span>
                    </SidebarMenuButton>
                    {canManage && onRenameCategory && onDeleteCategory && !collapsed && !isEditing ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="opacity-0 group-hover/item:opacity-100 data-[popup-open]:opacity-100"
                              aria-label={`Действия для ${category.name}`}
                            />
                          }
                        >
                          <MoreHorizontal className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-40">
                          <DropdownMenuItem onClick={() => openRename(category)}>
                            <Pencil className="size-3.5" />
                            Переименовать
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => openDelete(category)}>
                            <Trash2 className="size-3.5" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitDialog}>
            <DialogHeader>
              <DialogTitle>
                {dialog?.kind === "create"
                  ? userCopy.specificSheets.addTitle
                  : dialog?.kind === "rename"
                    ? userCopy.specificSheets.renameTitle
                    : userCopy.specificSheets.deleteTitle}
              </DialogTitle>
              <DialogDescription>
                {dialog?.kind === "create"
                  ? userCopy.specificSheets.addHint
                  : dialog?.kind === "rename"
                    ? userCopy.specificSheets.renameHint
                    : userCopy.specificSheets.deleteHint}
              </DialogDescription>
            </DialogHeader>

            {dialog?.kind === "delete" ? null : (
              <div className="py-2">
                <Label htmlFor="specific-category-name">Название</Label>
                <Input
                  id="specific-category-name"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={
                    dialog?.kind === "rename"
                      ? userCopy.specificSheets.renamePlaceholder
                      : userCopy.specificSheets.addPlaceholder
                  }
                  autoFocus
                />
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                Отмена
              </Button>
              <Button
                type="submit"
                variant={dialog?.kind === "delete" ? "destructive" : "default"}
                disabled={pending}
              >
                {pending
                  ? "Сохраняем..."
                  : dialog?.kind === "delete"
                    ? userCopy.specificSheets.deleteAction
                    : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
