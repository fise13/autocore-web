"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { updateSpecificColumnSchemaUseCase } from "@/application/use-cases/specific/update-specific-column-schema";
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
import { Label } from "@/components/ui/label";
import { SpecificColumnDef } from "@/domain/specific-category";
import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";
import {
  customColumnsFromSchema,
  normalizeColumnSchema,
  slugifyColumnKey,
} from "@/lib/specific/specific-category-schema";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type SpecificColumnManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: SpecificCategoryEntity;
  companyId: string;
  actorUid: string;
  repository: SpecificCategoryRepository;
  onSaved?: (category: SpecificCategoryEntity) => void;
};

function newColumnId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `col_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function SpecificColumnManagerDialog({
  open,
  onOpenChange,
  category,
  companyId,
  actorUid,
  repository,
  onSaved,
}: SpecificColumnManagerDialogProps) {
  const [draft, setDraft] = useState<SpecificColumnDef[]>(category.columnSchema);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCustomTitle, setNewCustomTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(normalizeColumnSchema(category.columnSchema));
    setError(null);
    setNewCustomTitle("");
  }, [category.columnSchema, open]);

  const canonical = useMemo(
    () => draft.filter((column) => column.kind === "canonical"),
    [draft],
  );
  const custom = useMemo(() => customColumnsFromSchema(draft), [draft]);

  function updateColumn(id: string, patch: Partial<SpecificColumnDef>) {
    setDraft((current) =>
      current.map((column) => (column.id === id ? { ...column, ...patch } : column)),
    );
  }

  function moveCustomColumn(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const canonicalPart = current.filter((column) => column.kind === "canonical");
      const customPart = current.filter((column) => column.kind === "custom");
      const index = customPart.findIndex((column) => column.id === id);
      if (index < 0) return current;
      const target = index + direction;
      if (target < 0 || target >= customPart.length) return current;
      const nextCustom = [...customPart];
      const [item] = nextCustom.splice(index, 1);
      nextCustom.splice(target, 0, item!);
      return [...canonicalPart, ...nextCustom];
    });
  }

  function removeCustomColumn(id: string) {
    setDraft((current) => current.filter((column) => column.id !== id));
  }

  function addCustomColumn() {
    const title = newCustomTitle.trim();
    if (!title) return;
    const existingKeys = draft.map((column) => column.key);
    const key = slugifyColumnKey(title, existingKeys);
    const column: SpecificColumnDef = {
      id: newColumnId(),
      key,
      title,
      kind: "custom",
      editable: true,
    };
    setDraft((current) => [...current, column]);
    setNewCustomTitle("");
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      const normalized = normalizeColumnSchema(
        draft.map((column) => {
          if (column.kind !== "canonical") return column;
          const title = column.title.trim() || column.key;
          const key =
            column.slotIndex === 6
              ? column.key
              : slugifyColumnKey(title, draft.filter((item) => item.id !== column.id).map((item) => item.key));
          return { ...column, title, key };
        }),
      );
      const updated = await updateSpecificColumnSchemaUseCase(repository, {
        companyId,
        category,
        nextSchema: normalized,
        actorUid,
      });
      onSaved?.(updated);
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить колонки");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{userCopy.specificSheets.columnsTitle}</DialogTitle>
          <DialogDescription>{userCopy.specificSheets.columnsHint}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Базовые колонки</Label>
            <div className="space-y-1.5">
              {canonical.map((column) => (
                <div key={column.id} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2 py-1.5">
                  <span className="w-5 shrink-0 text-center text-[10px] text-muted-foreground">
                    {(column.slotIndex ?? 0) + 1}
                  </span>
                  <Input
                    value={column.title}
                    onChange={(event) => updateColumn(column.id, { title: event.target.value })}
                    disabled={column.slotIndex === 6}
                    className="h-8"
                  />
                  {column.slotIndex === 6 ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">только продажа</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Дополнительные колонки</Label>
            {custom.length === 0 ? (
              <p className="text-xs text-muted-foreground">Пока нет дополнительных колонок</p>
            ) : (
              <div className="space-y-1.5">
                {custom.map((column, index) => (
                  <div key={column.id} className="flex items-center gap-1 rounded-lg border px-2 py-1.5">
                    <Input
                      value={column.title}
                      onChange={(event) => updateColumn(column.id, { title: event.target.value })}
                      className="h-8 min-w-0 flex-1"
                    />
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveCustomColumn(column.id, -1)}
                        className={cn(
                          "rounded p-1 text-muted-foreground hover:bg-muted",
                          index === 0 && "opacity-30",
                        )}
                        aria-label="Выше"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === custom.length - 1}
                        onClick={() => moveCustomColumn(column.id, 1)}
                        className={cn(
                          "rounded p-1 text-muted-foreground hover:bg-muted",
                          index === custom.length - 1 && "opacity-30",
                        )}
                        aria-label="Ниже"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomColumn(column.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Удалить колонку"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newCustomTitle}
                onChange={(event) => setNewCustomTitle(event.target.value)}
                placeholder="Название колонки"
                className="h-8"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomColumn();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomColumn} disabled={!newCustomTitle.trim()}>
                <Plus className="size-3.5" />
                Добавить
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Превью заголовков</p>
            <div className="flex flex-wrap gap-1">
              {draft.map((column) => (
                <span
                  key={column.id}
                  className="rounded-md bg-background px-2 py-0.5 text-xs shadow-sm ring-1 ring-border"
                >
                  {column.title.trim() || column.key}
                </span>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Отмена
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={busy}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
