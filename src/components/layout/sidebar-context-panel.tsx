"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  Barcode,
  Download,
  LayoutGrid,
  CircleMinus,
  Plus,
  Receipt,
  RotateCcw,
  Upload,
  Wallet,
} from "lucide-react";

import { AnimatedSidebarSlot } from "@/components/layout/animated-sidebar-slot";
import { WorkOrdersSidebarContext } from "@/components/work-orders/work-orders-sidebar-context";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { deepActionRoutes } from "@/lib/navigation/deep-actions";
import { showSidebarContextInSidebar, type SidebarMode } from "@/lib/navigation/sidebar-mode";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type SidebarContextPanelProps = {
  mode: SidebarMode;
};

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-1 py-1">
      <p className="px-3 py-2 text-micro font-semibold text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={hint}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200",
        "text-sidebar-foreground hover:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      <Icon className="size-4 shrink-0 opacity-80" />
      <span>{label}</span>
    </button>
  );
}

function SidebarContextContent({ mode }: SidebarContextPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { requirePro, isPro } = useBillingGate();
  const {
    triggerMotorExport,
    triggerMotorImportPicker,
    triggerWarehouseExport,
    triggerWarehouseImportPicker,
    triggerWarehouseBarcode,
    motorExcelIo,
    warehouseExcelIo,
  } = useWorkspace();

  const canEditInventory = can(profile, "inventory_edit");
  const canImportWarehouse = can(profile, "inventory_import");
  const canExportWarehouse = can(profile, "inventory_export");
  const canEditAccounting = can(profile, "accounting_edit");

  const accountingTab = searchParams.get("tab") ?? "overview";
  const accountingTabs = [
    { value: "overview" as const, label: userCopy.accounting.tabs.overview },
    { value: "cashbox" as const, label: userCopy.accounting.tabs.cashbox },
    { value: "expenses" as const, label: userCopy.accounting.tabs.expenses },
    { value: "operations" as const, label: userCopy.accounting.tabs.operations },
    { value: "advances" as const, label: userCopy.accounting.tabs.advances },
  ];

  if (mode === "motors" || mode === "specific") {
    return (
      <PanelSection title={userCopy.layout.contextPanel.motors}>
        {mode === "specific" ? (
          <Link
            href="/motors"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent"
          >
            <LayoutGrid className="size-4 shrink-0 opacity-80" />
            {userCopy.layout.contextPanel.allMotors}
          </Link>
        ) : null}
        {mode === "motors" ? (
          <>
            <ActionButton
              icon={Download}
              label={userCopy.motors.importExcel}
              disabled={!canEditInventory || motorExcelIo.busy === "import"}
              onClick={() => {
                requirePro("import", () => {
                  if (!triggerMotorImportPicker()) {
                    router.push(deepActionRoutes.import());
                  }
                });
              }}
            />
            <ActionButton
              icon={Upload}
              label={userCopy.motors.exportExcel}
              disabled={!canEditInventory || !motorExcelIo.canExport || motorExcelIo.busy === "export"}
              onClick={() => {
                requirePro("export", () => void triggerMotorExport().catch(() => undefined));
              }}
            />
            {!isPro ? (
              <p className="px-3 text-micro text-muted-foreground">
                {userCopy.layout.contextPanel.proImportExport}
              </p>
            ) : null}
          </>
        ) : null}
        <ActionButton
          icon={Receipt}
          label={userCopy.layout.contextPanel.sellMotor}
          disabled={!canEditInventory}
          onClick={() => router.push(deepActionRoutes.sell())}
        />
        <ActionButton
          icon={Plus}
          label={userCopy.layout.contextPanel.addMotor}
          disabled={!canEditInventory}
          onClick={() => router.push(deepActionRoutes.add())}
        />
      </PanelSection>
    );
  }

  if (mode === "sold") {
    return (
      <PanelSection title={userCopy.layout.contextPanel.sold}>
        <Link
          href="/motors"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent"
        >
          <LayoutGrid className="size-4 shrink-0 opacity-80" />
          {userCopy.layout.contextPanel.allMotors}
        </Link>
        <p className="flex items-start gap-2 px-3 py-1 text-micro leading-relaxed text-muted-foreground">
          <RotateCcw className="mt-0.5 size-3.5 shrink-0 opacity-70" />
          {userCopy.layout.contextPanel.returnHint}
        </p>
        <ActionButton
          icon={Upload}
          label={userCopy.motors.exportExcel}
          disabled={!canEditInventory || !motorExcelIo.canExport || motorExcelIo.busy === "export"}
          onClick={() => {
            requirePro("export", () => void triggerMotorExport().catch(() => undefined));
          }}
        />
      </PanelSection>
    );
  }

  if (mode === "work_orders") {
    return <WorkOrdersSidebarContext />;
  }

  if (mode === "warehouse") {
    return (
      <PanelSection title={userCopy.layout.contextPanel.actions}>
        <ActionButton
          icon={Barcode}
          label={userCopy.layout.barcodeScanner}
          disabled={!canEditInventory}
          onClick={() => triggerWarehouseBarcode()}
        />
        <ActionButton
          icon={Download}
          label={userCopy.layout.contextPanel.importCsv}
          disabled={!canImportWarehouse || !warehouseExcelIo.canImport || warehouseExcelIo.busy === "import"}
          onClick={() => triggerWarehouseImportPicker()}
        />
        <ActionButton
          icon={Upload}
          label={userCopy.layout.contextPanel.exportCsv}
          disabled={!canExportWarehouse || !warehouseExcelIo.canExport || warehouseExcelIo.busy === "export"}
          onClick={() => void triggerWarehouseExport().catch(() => undefined)}
        />
        <ActionButton
          icon={CircleMinus}
          label={userCopy.layout.contextPanel.adjustStock}
          hint={userCopy.layout.contextPanel.adjustStockHint}
          disabled={!canEditInventory}
        />
        <p className="px-3 text-micro leading-relaxed text-muted-foreground">
          {userCopy.layout.contextPanel.rowContextHint}
        </p>
      </PanelSection>
    );
  }

  if (mode === "accounting") {
    return (
      <PanelSection title={userCopy.layout.contextPanel.finances}>
        {accountingTabs.map((tab) => {
          const href = `/accounting?tab=${tab.value}`;
          const active = pathname === "/accounting" && accountingTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                active
                  ? "bg-primary/12 text-primary shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
        <div className="pt-1">
          <Button
            type="button"
            size="sm"
            className="mx-2 w-[calc(100%-1rem)]"
            disabled={!canEditAccounting}
            onClick={() => router.push(deepActionRoutes.expense())}
          >
            <Wallet className="size-4" />
            {userCopy.layout.contextPanel.newOperation}
          </Button>
        </div>
      </PanelSection>
    );
  }

  return null;
}

export function SidebarContextPanel({ mode }: SidebarContextPanelProps) {
  const visible = showSidebarContextInSidebar(mode);

  return (
    <AnimatedSidebarSlot slotKey={visible ? mode : "context-empty"}>
      {visible ? <SidebarContextContent mode={mode} /> : null}
    </AnimatedSidebarSlot>
  );
}
