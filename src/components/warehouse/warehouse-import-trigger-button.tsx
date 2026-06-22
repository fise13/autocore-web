"use client";

import { Sparkles } from "lucide-react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type WarehouseImportTriggerButtonProps = {
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "icon-sm" | "default";
  showLabel?: boolean;
  className?: string;
  disabled?: boolean;
};

export function WarehouseImportTriggerButton({
  variant = "ghost",
  size = "sm",
  showLabel = true,
  className,
  disabled = false,
}: WarehouseImportTriggerButtonProps) {
  const { profile } = useAuth();
  const { triggerWarehouseImportPicker, warehouseImportProgress, warehouseExcelIo } = useWorkspace();

  const canImport = can(profile, "inventory_import");
  if (!canImport) return null;

  const active = Boolean(warehouseImportProgress);
  const importBusy = warehouseExcelIo.busy === "import";

  function handleClick() {
    triggerWarehouseImportPicker();
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || !warehouseExcelIo.canImport || importBusy}
      title={userCopy.motors.magicImport}
      className={cn("relative gap-1.5", className)}
    >
      <Sparkles className={cn("size-3.5", active && "text-primary")} />
      {showLabel ? <span>{userCopy.motors.magicImport}</span> : null}
    </Button>
  );
}
