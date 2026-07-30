"use client";

import { userCopy } from "@/lib/user-copy";

import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryItem } from "@/domain/inventory";
import { InventoryMovement } from "@/domain/inventory-movement";

type WarehouseMovementDrawerProps = {
  item: InventoryItem | null;
  movements: InventoryMovement[];
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function movementTypeLabels(): Record<InventoryMovement["type"], string> {
  return { ...userCopy.warehouse.movementTypes };
}

function referenceLabels(): Record<NonNullable<InventoryMovement["referenceType"]>, string> {
  return { ...userCopy.warehouse.references };
}

function movementTypeBadgeVariant(
  type: InventoryMovement["type"],
): "success" | "destructive" | "info" | "warning" | "outline" {
  if (type === "receipt" || type === "return_in") return "success";
  if (type === "issue" || type === "consumption" || type === "transfer_out") return "destructive";
  if (type === "transfer_in" || type === "relocation") return "info";
  if (type === "adjustment" || type === "reversal") return "warning";
  return "outline";
}

export function WarehouseMovementDrawer({
  item,
  movements,
  loading,
  open,
  onOpenChange,
}: WarehouseMovementDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{userCopy.warehouse.movementsTitle}</DialogTitle>
          <DialogDescription>
            {item ? `${item.sku} · ${item.name}` : userCopy.warehouse.selectItem}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-lg border">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">{userCopy.warehouse.loading}</p>
          ) : null}
          {!loading && movements.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{userCopy.warehouse.movementsEmpty}</p>
          ) : null}
          {!loading && movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{userCopy.warehouse.movementColumns.type}</TableHead>
                  <TableHead className="text-right">{userCopy.warehouse.movementColumns.quantity}</TableHead>
                  <TableHead>{userCopy.warehouse.movementColumns.onHand}</TableHead>
                  <TableHead>{userCopy.warehouse.movementColumns.reference}</TableHead>
                  <TableHead>{userCopy.warehouse.movementColumns.date}</TableHead>
                  <TableHead>{userCopy.warehouse.movementColumns.reason}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <Badge variant={movementTypeBadgeVariant(movement.type)}>
                        {movementTypeLabels()[movement.type] ?? movement.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{movement.quantity}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {movement.beforeOnHand} → {movement.afterOnHand}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.referenceType ? (
                        <span>
                          {referenceLabels()[movement.referenceType] ?? movement.referenceType}
                          {movement.referenceId && movement.referenceType === "work_order" ? (
                            <>
                              {" · "}
                              <Link
                                href={`/work-orders/${movement.referenceId}`}
                                className="text-primary hover:underline"
                              >
                                {movement.referenceId}
                              </Link>
                            </>
                          ) : movement.referenceId ? (
                            ` · ${movement.referenceId}`
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {movement.createdAt.toLocaleString("en-US")}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {movement.reason ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
