"use client";

import { memo, type ReactNode } from "react";
import { Boxes } from "lucide-react";

import { InventoryItem } from "@/domain/inventory";
import { InventoryMovement } from "@/domain/inventory-movement";
import { McModuleHeader } from "@/components/mission-control/mc-module-header";
import { movementTypeLabel } from "@/lib/inventory/movement-labels";

type WarehouseModuleProps = {
  recentItems: InventoryItem[];
  lowStockItems: InventoryItem[];
  recentMovements: InventoryMovement[];
  stockValue: number;
  isLoading: boolean;
};

export const WarehouseModule = memo(function WarehouseModule({
  lowStockItems,
  recentMovements,
  stockValue,
  isLoading,
}: WarehouseModuleProps) {
  return (
    <article className="mc-module-card">
      <McModuleHeader
        icon={Boxes}
        title="Запчасти"
        description={`${Math.round(stockValue).toLocaleString("ru-RU")} ₸`}
        href="/warehouse"
        accent="blue"
      />
      <div className="mc-module-body grid gap-3 md:grid-cols-2">
        <Section title="Дефицит" empty="В норме" isLoading={isLoading}>
          {lowStockItems.map((item) => (
            <Row
              key={item.id}
              primary={item.sku}
              secondary={`${item.name} · ${item.totalAvailable} ${item.unit}`}
            />
          ))}
        </Section>
        <Section title="Движения" empty="Нет движений" isLoading={isLoading}>
          {recentMovements.map((movement) => (
            <Row
              key={movement.id}
              primary={movementTypeLabel(movement.type)}
              secondary={`${movement.quantity} · ${movement.createdAt.toLocaleString("ru-RU")}`}
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
