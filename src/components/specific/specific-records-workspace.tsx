"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";

import { sellSpecificWithFinancialOperationUseCase } from "@/application/use-cases/sell-specific-with-financial-operation";
import { unsellSpecificWithFinancialOperationUseCase } from "@/application/use-cases/unsell-specific-with-financial-operation";
import { SellFinancialDialog } from "@/components/accounting/sell-financial-dialog";
import { useWorkspace } from "@/components/layout/workspace-context";
import { SpecificExcelGrid } from "@/components/specific/specific-excel-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { useSpecificRecordsRealtime } from "@/hooks/use-specific-records-realtime";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { buildSpecificHeaderMapping } from "@/lib/specific/specific-header-mapping";
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
};

export function SpecificRecordsWorkspace({ category }: SpecificRecordsWorkspaceProps) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const companyId = normalizeCompanyId(profile?.companyId);
  const canEdit = can(profile, "inventory_edit");
  const [sellDialog, setSellDialog] = useState<SellDialogState | null>(null);

  const allCategories = useSpecificCategoriesRealtime(specificCategoryRepository, companyId);
  const { records, loading } = useSpecificRecordsRealtime(
    specificCategoryRepository,
    companyId,
    category,
    allCategories,
  );

  const headerMapping = useMemo(() => buildSpecificHeaderMapping(records), [records]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2.5 border-b bg-card/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight">{category.name}</h1>
          <p className="text-xs text-muted-foreground">
            {loading ? "Загрузка…" : `Показано ${filteredRecords.length} из ${records.length}`}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Загрузка записей…
          </div>
        ) : records.length === 0 && !canEdit ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium">Специфичных данных пока нет</p>
            <p className="text-sm text-muted-foreground">
              Импортируйте Excel на Mac или в разделе «Все моторы».
            </p>
          </div>
        ) : (
          <SpecificExcelGrid
            records={records}
            search={workspace.search}
            category={category}
            companyId={companyId}
            canEdit={canEdit}
            repository={specificCategoryRepository}
            availability={workspace.availability}
            onSell={(row) => openSellDialog(row, "sell")}
            onUnsell={(row) => openSellDialog(row, "unsell")}
          />
        )}
      </div>

      <SellFinancialDialog
        open={Boolean(sellDialog)}
        mode={sellDialog?.mode ?? "sell"}
        title={
          sellDialog?.mode === "unsell"
            ? "Возврат специфичной записи"
            : "Продажа специфичной записи"
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
