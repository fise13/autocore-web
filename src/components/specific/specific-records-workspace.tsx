"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";

import { ensureSpecificCategorySchemaUseCase } from "@/application/use-cases/specific/ensure-specific-category-schema";
import { sellSpecificWithFinancialOperationUseCase } from "@/application/use-cases/sell-specific-with-financial-operation";
import { unsellSpecificWithFinancialOperationUseCase } from "@/application/use-cases/unsell-specific-with-financial-operation";
import { SellFinancialDialog } from "@/components/accounting/sell-financial-dialog";
import { useWorkspace } from "@/components/layout/workspace-context";
import { SpecificColumnManagerDialog } from "@/components/specific/specific-column-manager-dialog";
import { SpecificExcelGrid } from "@/components/specific/specific-excel-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { useSpecificRecordsRealtime } from "@/hooks/use-specific-records-realtime";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { resolveCategoryColumnSchema, schemaToHeaderMapping } from "@/lib/specific/specific-category-schema";
import { specificRecordLabel } from "@/lib/specific/specific-record-label";
import { filterSpecificRecords, filterSpecificRecordsByAvailability } from "@/lib/specific/specific-table";
import { SpecificGridRow } from "@/lib/specific/specific-grid-data-store";
import {
  SpecificCategoryEntity,
  SpecificRecordEntity,
  createSpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";

const specificCategoryRepository = createSpecificCategoryRepository();
const financialRepository = createFinancialOperationRepository();

type SellDialogState = {
  record: SpecificRecordEntity;
  mode: "sell" | "unsell";
};

type SpecificRecordsWorkspaceProps = {
  category: SpecificCategoryEntity;
  embedded?: boolean;
};

export function SpecificRecordsWorkspace({
  category: initialCategory,
  embedded = false,
}: SpecificRecordsWorkspaceProps) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const companyId = normalizeCompanyId(profile?.companyId);
  const canEdit = can(profile, "inventory_edit");
  const [category, setCategory] = useState(initialCategory);
  const [sellDialog, setSellDialog] = useState<SellDialogState | null>(null);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const allCategories = useSpecificCategoriesRealtime(specificCategoryRepository, companyId);
  const { records, loading } = useSpecificRecordsRealtime(
    specificCategoryRepository,
    companyId,
    category,
    allCategories,
  );

  useEffect(() => {
    if (!canEdit || !companyId || !profile?.id) return;
    let cancelled = false;
    void ensureSpecificCategorySchemaUseCase(specificCategoryRepository, {
      companyId,
      category,
      records,
      actorUid: profile.id,
    }).then((migrated) => {
      if (!cancelled && migrated.columnSchema.length > 0) {
        setCategory(migrated);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [canEdit, category.id, category.columnSchema.length, companyId, profile?.id, records]);

  const columnSchema = useMemo(
    () => resolveCategoryColumnSchema(category, records),
    [category, records],
  );
  const headerMapping = useMemo(() => schemaToHeaderMapping(columnSchema), [columnSchema]);

  const filteredRecords = useMemo(() => {
    const searched = filterSpecificRecords(records, workspace.search);
    return filterSpecificRecordsByAvailability(searched, workspace.availability, headerMapping);
  }, [headerMapping, records, workspace.availability, workspace.search]);

  useEffect(() => {
    workspace.setCounts(filteredRecords.length, records.length);
  }, [filteredRecords.length, records.length, workspace]);

  function openSellDialog(row: SpecificGridRow, mode: "sell" | "unsell") {
    if (row.rowKind !== "saved") return;
    setSellDialog({ record: row, mode });
  }

  async function confirmSellOperation(payload: {
    amount: number;
    account: "cashbox" | "kaspi";
    paymentMethod: "cash" | "transfer" | "mixed";
    comment: string;
  }) {
    if (!sellDialog || !profile || !companyId) return;
    const { record, mode } = sellDialog;

    if (mode === "sell") {
      await sellSpecificWithFinancialOperationUseCase(
        specificCategoryRepository,
        financialRepository,
        {
          companyId,
          category,
          record,
          headerMapping,
          createdByUserId: profile.id,
          amount: payload.amount,
          account: payload.account,
          paymentMethod: payload.paymentMethod,
          comment: payload.comment,
        },
      );
      return;
    }

    await unsellSpecificWithFinancialOperationUseCase(
      specificCategoryRepository,
      financialRepository,
      {
        companyId,
        category,
        record,
        headerMapping,
        createdByUserId: profile.id,
        amount: payload.amount,
        account: payload.account,
        paymentMethod: payload.paymentMethod,
        comment: payload.comment,
      },
    );
  }

  const dialogRecord = sellDialog?.record ?? null;
  const dialogLabel = dialogRecord ? specificRecordLabel(dialogRecord, headerMapping) : "";
  const columnsOpen = workspace.specificColumnsDialogOpen;
  const setColumnsOpen = workspace.setSpecificColumnsDialogOpen;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {!embedded && canEdit ? (
        <div className="absolute right-3 top-3 z-20">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setColumnsOpen(true)}
            aria-label="Колонки"
            title="Колонки"
          >
            <Settings2 className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Загрузка…
          </div>
        ) : (
          <SpecificExcelGrid
            records={records}
            search={workspace.search}
            category={category}
            columnSchema={columnSchema}
            companyId={companyId}
            canEdit={canEdit}
            repository={specificCategoryRepository}
            availability={workspace.availability}
            onSell={(row) => openSellDialog(row, "sell")}
            onUnsell={(row) => openSellDialog(row, "unsell")}
          />
        )}
      </div>

      {canEdit && profile?.id ? (
        <SpecificColumnManagerDialog
          open={columnsOpen}
          onOpenChange={setColumnsOpen}
          category={category}
          companyId={companyId}
          actorUid={profile.id}
          repository={specificCategoryRepository}
          onSaved={setCategory}
        />
      ) : null}

      <SellFinancialDialog
        open={Boolean(sellDialog)}
        mode={sellDialog?.mode ?? "sell"}
        title={
          sellDialog?.mode === "unsell"
            ? "Возврат записи каталога"
            : "Продажа записи каталога"
        }
        description={
          dialogRecord
            ? `${category.name}: ${dialogLabel}. Будет создана финансовая операция.`
            : "Выберите запись для операции."
        }
        defaultComment={
          sellDialog?.mode === "unsell"
            ? `Возврат: ${category.name} — ${dialogLabel}`
            : `Продажа: ${category.name} — ${dialogLabel}`
        }
        onOpenChange={(open) => {
          if (!open) setSellDialog(null);
        }}
        onConfirm={confirmSellOperation}
      />
    </div>
  );
}
