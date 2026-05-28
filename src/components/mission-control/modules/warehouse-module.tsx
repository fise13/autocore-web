"use client";

import { memo, type ReactNode } from "react";
import { Boxes } from "lucide-react";

import { InventoryItem } from "@/domain/inventory";
import { InventoryMovement } from "@/domain/inventory-movement";
import { McModuleHeader } from "@/components/mission-control/mc-module-header";

type WarehouseModuleProps = {
  recentItems: InventoryItem[];
  lowStockItems: InventoryItem[];
  recentMovements: InventoryMovement[];
  stockValue: number;
  isLoading: boolean;
};

export const WarehouseModule = memo(function WarehouseModule({
  recentItems,
  lowStockItems,
  recentMovements,
  stockValue,
  isLoading,
}: WarehouseModuleProps) {
  return (
    <article className="mc-module-card">
      <McModuleHeader
        icon={Boxes}
        title="Склад запчастей"
        description={`Стоимость остатков: ${Math.round(stockValue).toLocaleString("ru-RU")} ₸`}
        href="/warehouse"
        accent="blue"
      />
      <div className="mc-module-body grid gap-4 md:grid-cols-2">
        <Section title="Низкий остаток" empty="Всё в норме" isLoading={isLoading}>
          {lowStockItems.map((item) => (
            <Row
              key={item.id}
              primary={item.sku}
              secondary={`${item.name} · ${item.totalAvailable} ${item.unit}`}
            />
          ))}
        </Section>
        <Section title="Последние движения" empty="Движений пока нет" isLoading={isLoading}>
          {recentMovements.map((movement) => (
            <Row
              key={movement.id}
              primary={movement.type}
              secondary={`${movement.quantity} · ${movement.createdAt.toLocaleString("ru-RU")}`}
            />
          ))}
        </Section>
        <Section title="Недавно обновлены" empty="Изменений пока нет" isLoading={isLoading}>
          {recentItems.map((item) => (
            <Row
              key={`recent-${item.id}`}
              primary={item.sku}
              secondary={item.updatedAt?.toLocaleString("ru-RU") ?? item.name}
            />
          ))}
        </Section>
      </div>
    </article>
  );
});

function Section({
  title,
  empty,
  isLoading,
  children,
}: {
  title: string;
  empty: string;
  isLoading: boolean;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean) && items.length > 0 && !isLoading;

  return (
    <div className="space-y-2.5">
      <p className="mc-section-label">{title}</p>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : hasItems ? (
        <div className="space-y-2">{children}</div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function Row({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="mc-list-row">
      <p className="truncate text-sm font-medium">{primary}</p>
      <p className="truncate text-xs text-muted-foreground">{secondary}</p>
    </div>
  );
}
