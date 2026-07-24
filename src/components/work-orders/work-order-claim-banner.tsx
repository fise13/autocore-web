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
  const claim = userCopy.workOrders.claim;

  if (!canClaim) return null;

  async function handleClaim() {
    setClaiming(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) throw new Error(claim.authRequired);

      const response = await fetch(`/api/work-orders/${order.id}/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? claim.claimFailed);
      }
      toast.success(claim.claimed(order.number));
      onClaimed?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : claim.claimFailed);
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
            {claim.whoTakes}
          </div>
          <p className="text-sm text-muted-foreground">
            {unassignedCount === 1 ? claim.freeWorkHint : claim.freeJobsCount(unassignedCount)}
          </p>
        </div>
        <Button onClick={() => void handleClaim()} disabled={claiming}>
          {claiming ? claim.claiming : claim.claim}
        </Button>
      </div>
    </div>
  );
}
