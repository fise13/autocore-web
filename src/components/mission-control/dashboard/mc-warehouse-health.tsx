"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { countLowStockIssues } from "@/lib/mission-control/compute-dashboard-charts";
import { cn } from "@/lib/utils";
import { InventoryItem } from "@/domain/inventory";
import { Skeleton } from "@/components/ui/skeleton";

type McWarehouseHealthProps = {
  warehouseItems: InventoryItem[];
  motorLowStock: number;
  isLoading: boolean;
  canWarehouse: boolean;
  canMotors: boolean;
  className?: string;
};

export function McWarehouseHealth({
  warehouseItems,
  motorLowStock,
  isLoading,
  canWarehouse,
  canMotors,
  className,
}: McWarehouseHealthProps) {
  if (isLoading) {
    return (
      <McPanel className={className}>
        <McPanelHeader title="Состояние склада" />
        <McPanelBody className="flex items-center justify-center py-8">
          <Skeleton className="size-24 rounded-full" />
        </McPanelBody>
      </McPanel>
    );
  }

  if (!canWarehouse && !canMotors) {
    return null;
  }

  const issues = countLowStockIssues(warehouseItems, motorLowStock);
  const healthy = issues === 0;

  return (
    <McPanel className={className}>
      <McPanelHeader
        title="Состояние склада"
        description={
          healthy
            ? "Критичных дефицитов не обнаружено"
            : `${issues} позиц${issues === 1 ? "ия" : issues < 5 ? "ии" : "ий"} требуют внимания`
        }
      />
      <McPanelBody className="flex flex-col items-center justify-center gap-4 py-6 text-center">
        <div
          className={cn(
            "mc-icon-badge size-14 rounded-full",
            !healthy && "mc-icon-badge-amber",
          )}
        >
          {healthy ? (
            <CheckCircle2 aria-hidden />
          ) : (
            <AlertTriangle aria-hidden />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{healthy ? "Всё под контролем" : "Есть дефициты"}</p>
          <p className="text-xs text-muted-foreground">
            {healthy
              ? "Остатки моторов и склада в норме"
              : "Проверьте позиции с низким остатком"}
          </p>
        </div>
        <Button
          render={<Link href={canWarehouse ? "/warehouse" : "/motors"} />}
          variant="ghost"
          size="sm"
        >
          <Package className="size-4" data-icon="inline-start" aria-hidden />
          Открыть {canWarehouse ? "склад" : "моторы"}
        </Button>
      </McPanelBody>
    </McPanel>
  );
}
