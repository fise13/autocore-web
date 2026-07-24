"use client";

import { userCopy } from "@/lib/user-copy";

import { useState } from "react";
import { Wrench } from "lucide-react";

import { WorkOrder } from "@/domain/work-order";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { canMechanicClaimWorkOrder } from "@autocore/rbac";
import { toast } from "sonner";

type WorkOrderClaimBannerProps = {
  order: WorkOrder;
  onClaimed?: () => void;
};

export function WorkOrderClaimBanner({ order, onClaimed }: WorkOrderClaimBannerProps) {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid;
  const [claiming, setClaiming] = useState(false);
  const canClaim = Boolean(uid) && canMechanicClaimWorkOrder(order, uid!);
  const unassignedCount = order.laborLines.filter((line) => !line.assigneeIds.length).length;

  if (!canClaim) return null;

  async function handleClaim() {
    setClaiming(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) throw new Error(userCopy.workOrders.claim.authRequired);

      const response = await fetch(`/api/work-orders/${order.id}/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? userCopy.workOrders.claim.claimFailed);
      }
      toast.success(`Наряд №${order.number} взят в работу`);
      onClaimed?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : userCopy.workOrders.claim.claimFailed);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="size-4 text-primary" />
            Кто возьмёт?
          </div>
          <p className="text-sm text-muted-foreground">
            {unassignedCount === 1
              ? userCopy.workOrders.claim.freeWorkHint
              : `Свободных работ: ${unassignedCount}.`}
          </p>
        </div>
        <Button onClick={() => void handleClaim()} disabled={claiming}>
          {claiming ? userCopy.workOrders.claim.claiming : userCopy.workOrders.claim.claim}
        </Button>
      </div>
    </div>
  );
}
