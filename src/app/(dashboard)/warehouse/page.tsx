"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Package, Plus } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InventoryItem } from "@/domain/inventory";
import { createInventoryRepository } from "@/infrastructure/firestore/inventory-repository";

const inventoryRepository = createInventoryRepository();

export default function WarehousePage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [newName, setNewName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.companyId) return;
    return inventoryRepository.subscribe(profile.companyId, setItems);
  }, [profile?.companyId]);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.companyId || !newName.trim()) return;
    await inventoryRepository.create(profile.companyId, newName.trim(), 0, profile.id);
    setNewName("");
  }

  return (
    <section className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <FadeIn>
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Склад</h2>
          <p className="text-sm text-muted-foreground">Учёт позиций и остатков на складе компании.</p>
        </header>
      </FadeIn>

      <FadeIn delay={60}>
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-primary" />
              <div>
                <CardTitle>Новая позиция</CardTitle>
                <CardDescription>Добавление товара на склад компании.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={onAdd} className="flex flex-wrap gap-2">
              <Input
                ref={nameInputRef}
                placeholder="Название позиции"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="max-w-md"
              />
              <Button type="submit" className="gap-1">
                <Plus className="size-4" />
                Добавить
              </Button>
            </form>
          </CardContent>
        </Card>
      </FadeIn>

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Склад пуст"
          description="Добавьте первую позицию — укажите название и сохраните."
          primaryAction={{
            label: "Добавить первую позицию",
            onClick: () => nameInputRef.current?.focus(),
          }}
        />
      ) : (
        <div className="grid gap-3">
          {items.map((item, index) => (
            <FadeIn key={item.id} delay={Math.min(index, 10) * 45}>
              <Card className="autocore-metric-card overflow-hidden border-border/60">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {item.sku || "-"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.quantity} шт</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => inventoryRepository.patchQuantity(item.id, item.quantity + 1)}
                    >
                      +1
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      )}
    </section>
  );
}
