"use client";

import { Sparkles } from "lucide-react";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { canAccessMotorsArea } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type MotorImportTriggerButtonProps = {
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "icon-sm" | "default";
  showLabel?: boolean;
  className?: string;
};

export function MotorImportTriggerButton({
  variant = "ghost",
  size = "sm",
  showLabel = true,
  className,
}: MotorImportTriggerButtonProps) {
  const { profile } = useAuth();
  const { requirePro, isPro } = useBillingGate();
  const { triggerMotorImportPicker, motorImportProgress, motorImportReviewPending } = useWorkspace();

  const canImport = canAccessMotorsArea(profile) && can(profile, "inventory_edit");
  if (!canImport) return null;

  const active = Boolean(motorImportProgress || motorImportReviewPending);

  function handleClick() {
    requirePro("import", () => {
      triggerMotorImportPicker();
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      title={isPro ? userCopy.motors.importExcel : userCopy.billing.paywall.import.title}
      className={cn("relative gap-1.5", !isPro && "text-primary/80", className)}
    >
      <Sparkles className={cn("size-3.5", active && "text-primary")} />
      {showLabel ? <span>{userCopy.motors.magicImport}</span> : null}
      {!isPro ? (
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" />
      ) : null}
    </Button>
  );
}

export function useMotorImportIslandAction() {
  const { triggerImportIslandClick } = useWorkspace();

  return () => {
    triggerImportIslandClick();
  };
}
