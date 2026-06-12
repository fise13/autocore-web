"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { lookupBarcodeUseCase } from "@/application/use-cases/warehouse/lookup-barcode";
import { BarcodeUnknownProductDialog } from "@/components/barcode/barcode-unknown-product-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useToast } from "@/components/ui/toast-provider";
import { InventoryItem } from "@/domain/inventory";
import { createBarcodeMappingRepository } from "@/infrastructure/firestore/barcode-mapping-repository";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { can } from "@/lib/auth/permissions";
import { createBarcodeScanListener } from "@/lib/barcode/barcode-scan-detector";
import { normalizeCompanyId } from "@/lib/company-id";
import { isNavAllowed } from "@/lib/auth/app-access";

const barcodeRepository = createBarcodeMappingRepository();
const itemRepository = createInventoryItemRepository();

type BarcodeScanProviderProps = {
  children: ReactNode;
};

export function BarcodeScanProvider({ children }: BarcodeScanProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const { toast } = useToast();
  const {
    setSearch,
    setWarehouseItemHighlightId,
    setWarehouseBarcodePrefill,
    setLastBarcodeScan,
    triggerWorkOrderBarcodeScan,
  } = useWorkspace();

  const companyId = normalizeCompanyId(profile?.companyId);
  const canViewWarehouse = isNavAllowed(profile, "warehouse");
  const canEditInventory = can(profile, "inventory_edit");
  const canViewWorkOrders = can(profile, "work_orders_view");

  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const busyRef = useRef(false);

  const focusWarehouseItem = useCallback(
    (item: InventoryItem) => {
      setSearch(item.sku);
      setWarehouseItemHighlightId(item.id);
      setLastBarcodeScan({ barcode: item.barcodes[0] ?? item.sku, itemId: item.id, itemName: item.name });
      toast({
        title: item.name,
        description: `Доступно ${item.totalAvailable} ${item.unit}`,
        variant: "success",
      });
    },
    [setLastBarcodeScan, setSearch, setWarehouseItemHighlightId, toast],
  );

  const handleResolvedItem = useCallback(
    (item: InventoryItem, barcode: string) => {
      const onWorkOrders = pathname.startsWith("/work-orders");

      if (onWorkOrders && canViewWorkOrders) {
        const handled = triggerWorkOrderBarcodeScan(item);
        if (handled) {
          setLastBarcodeScan({ barcode, itemId: item.id, itemName: item.name });
          return;
        }
      }

      if (pathname === "/warehouse" && canViewWarehouse) {
        focusWarehouseItem(item);
        return;
      }

      if (canViewWarehouse) {
        setLastBarcodeScan({ barcode, itemId: item.id, itemName: item.name });
        router.push(`/warehouse?highlight=${encodeURIComponent(item.id)}&search=${encodeURIComponent(item.sku)}`);
        return;
      }

      toast({
        title: item.name,
        description: "Товар найден, но нет доступа к складу",
        variant: "default",
      });
    },
    [
      canViewWarehouse,
      canViewWorkOrders,
      focusWarehouseItem,
      pathname,
      router,
      setLastBarcodeScan,
      toast,
      triggerWorkOrderBarcodeScan,
    ],
  );

  const handleUnknownBarcode = useCallback(
    (barcode: string) => {
      setLastBarcodeScan({ barcode });
      if (canEditInventory) {
        setUnknownBarcode(barcode);
        return;
      }
      toast({
        title: "Товар не найден",
        description: barcode,
        variant: "error",
      });
    },
    [canEditInventory, setLastBarcodeScan, toast],
  );

  const processBarcode = useCallback(
    async (raw: string) => {
      const barcode = raw.trim();
      if (!barcode || !companyId || busyRef.current) return;
      busyRef.current = true;
      try {
        const result = await lookupBarcodeUseCase(barcodeRepository, itemRepository, companyId, barcode);
        if (result.item) {
          handleResolvedItem(result.item, barcode);
        } else {
          handleUnknownBarcode(barcode);
        }
      } catch (error) {
        toast({
          title: "Ошибка сканирования",
          description: error instanceof Error ? error.message : "Не удалось найти товар",
          variant: "error",
        });
      } finally {
        busyRef.current = false;
      }
    },
    [companyId, handleResolvedItem, handleUnknownBarcode, toast],
  );

  useEffect(() => {
    if (!companyId) return;
    const listener = createBarcodeScanListener((code) => {
      void processBarcode(code);
    });
    window.addEventListener("keydown", listener.handleKeyDown, true);
    return () => window.removeEventListener("keydown", listener.handleKeyDown, true);
  }, [companyId, processBarcode]);

  function addUnknownToWarehouse() {
    if (!unknownBarcode) return;
    setWarehouseBarcodePrefill(unknownBarcode);
    setUnknownBarcode(null);
    router.push(`/warehouse?barcode=${encodeURIComponent(unknownBarcode)}`);
  }

  return (
    <>
      {children}
      <BarcodeUnknownProductDialog
        open={Boolean(unknownBarcode)}
        barcode={unknownBarcode ?? ""}
        onOpenChange={(open) => {
          if (!open) setUnknownBarcode(null);
        }}
        onAddToWarehouse={addUnknownToWarehouse}
        onDismiss={() => setUnknownBarcode(null)}
      />
    </>
  );
}
