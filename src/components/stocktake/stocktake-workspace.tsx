"use client";

import { ClipboardCheck, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { commitStocktakeUseCase } from "@/application/use-cases/warehouse/commit-stocktake";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { StocktakeLine } from "@/domain/stocktake";
import { stocktakeDifference } from "@/domain/stocktake";
import { useInventoryRealtime } from "@/hooks/use-inventory-realtime";
import { useStocktakeRealtime } from "@/hooks/use-stocktake-realtime";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { createInventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { createInventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { createStocktakeRepository } from "@/infrastructure/firestore/stocktake-repository";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { userCopy } from "@/lib/user-copy";

const itemRepository = createInventoryItemRepository();
const stockLevelRepository = createInventoryStockLevelRepository();
const movementRepository = createInventoryMovementRepository();
const warehouseRepository = createWarehouseRepository();
const stocktakeRepository = createStocktakeRepository();

export function StocktakeWorkspace() {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? "";
  const { data: items, isBootstrapping } = useInventoryRealtime(itemRepository, companyId, Boolean(companyId));
  const { sessions, isLoading } = useStocktakeRealtime(companyId);
  const copy = userCopy.stocktake;
  const [lines, setLines] = useState<StocktakeLine[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSession = sessions.find((session) => session.status === "open");

  const workingLines = useMemo(() => {
    if (lines) return lines;
    if (openSession) return openSession.lines;
    return [];
  }, [lines, openSession]);

  async function startCount() {
    if (!profile?.id || !companyId) return;
    const nextLines: StocktakeLine[] = (items ?? []).map((item) => ({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      expectedQty: item.totalOnHand ?? 0,
      countedQty: item.totalOnHand ?? 0,
    }));
    setBusy(true);
    setError(null);
    try {
      const session = await stocktakeRepository.create({
        companyId,
        lines: nextLines,
        createdByUserId: profile.id,
      });
      setSessionId(session.id);
      setLines(nextLines);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.commitFailed);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!profile?.id || !companyId) return;
    const id = sessionId ?? openSession?.id;
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await commitStocktakeUseCase(
        stocktakeRepository,
        itemRepository,
        stockLevelRepository,
        movementRepository,
        warehouseRepository,
        {
          companyId,
          sessionId: id,
          lines: workingLines,
          actorUserId: profile.id,
        },
      );
      setLines(null);
      setSessionId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.commitFailed);
    } finally {
      setBusy(false);
    }
  }

  if (!companyId) {
    return <EmptyState icon={ClipboardCheck} title={copy.title} description={copy.selectCompany} />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        {workingLines.length === 0 ? (
          <Button type="button" disabled={busy || isBootstrapping} onClick={() => void startCount()}>
            {copy.start}
          </Button>
        ) : (
          <Button type="button" disabled={busy} onClick={() => void commit()}>
            {busy ? copy.committing : copy.commit}
          </Button>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {isLoading || isBootstrapping ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {copy.loading}
        </p>
      ) : workingLines.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={copy.empty} description={copy.emptyHint} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">{copy.sku}</th>
                <th className="py-2 pr-3 font-medium">{copy.name}</th>
                <th className="py-2 pr-3 font-medium">{copy.expected}</th>
                <th className="py-2 pr-3 font-medium">{copy.counted}</th>
                <th className="py-2 font-medium">{copy.difference}</th>
              </tr>
            </thead>
            <tbody>
              {workingLines.map((line, index) => (
                <tr key={line.itemId} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs">{line.sku}</td>
                  <td className="py-2 pr-3">{line.name}</td>
                  <td className="py-2 pr-3 tabular-nums">{line.expectedQty}</td>
                  <td className="py-2 pr-3">
                    <Input
                      className="h-8 w-24"
                      value={String(line.countedQty)}
                      onChange={(event) => {
                        const countedQty = Number(event.target.value);
                        setLines((current) => {
                          const base = current ?? workingLines;
                          return base.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, countedQty: Number.isFinite(countedQty) ? countedQty : 0 }
                              : row,
                          );
                        });
                      }}
                    />
                  </td>
                  <td className="py-2 tabular-nums">{stocktakeDifference(line)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
