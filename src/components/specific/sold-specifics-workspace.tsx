"use client";

import { useEffect, useMemo } from "react";
import { FileText } from "lucide-react";

import { SpecificExcelGrid } from "@/components/specific/specific-excel-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useAllSpecificRecordsRealtime } from "@/hooks/use-all-specific-records-realtime";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  buildSpecificHeaderMapping,
  isSpecificRecordSold,
} from "@/lib/specific/specific-header-mapping";
import { filterSpecificRecords } from "@/lib/specific/specific-table";
import {
  createSpecificCategoryRepository,
  SpecificCategoryEntity,
  SpecificRecordEntity,
} from "@/infrastructure/firestore/specific-category-repository";

const specificCategoryRepository = createSpecificCategoryRepository();

function resolveCategory(
  record: SpecificRecordEntity,
  categories: SpecificCategoryEntity[],
): SpecificCategoryEntity | null {
  const direct = categories.find(
    (category) => category.id === record.categoryId || category.localId === record.categoryLocalId,
  );
  if (direct) return direct;

  return (
    categories.find((category) => category.localId === record.categoryLocalId) ??
    categories.find((category) => record.categoryId.includes(String(category.localId))) ??
    null
  );
}

export function SoldSpecificsWorkspace() {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const companyId = normalizeCompanyId(profile?.companyId);
  const canEdit = can(profile, "inventory_edit");

  const categories = useSpecificCategoriesRealtime(specificCategoryRepository, companyId);
  const { records, loading } = useAllSpecificRecordsRealtime(specificCategoryRepository, companyId);

  const soldGroups = useMemo(() => {
    const searched = filterSpecificRecords(records, workspace.search);
    const groups = new Map<string, { category: SpecificCategoryEntity; records: SpecificRecordEntity[] }>();

    for (const record of searched) {
      const category = resolveCategory(record, categories);
      if (!category) continue;
      const mapping = buildSpecificHeaderMapping([record]);
      if (!isSpecificRecordSold(record, mapping)) continue;

      const existing = groups.get(category.id);
      if (existing) {
        existing.records.push(record);
      } else {
        groups.set(category.id, { category, records: [record] });
      }
    }

    return [...groups.values()].sort((left, right) =>
      left.category.name.localeCompare(right.category.name, "ru"),
    );
  }, [categories, records, workspace.search]);

  const soldCount = useMemo(
    () => soldGroups.reduce((acc, group) => acc + group.records.length, 0),
    [soldGroups],
  );

  useEffect(() => {
    workspace.setCounts(soldCount, soldCount);
  }, [soldCount, workspace]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Загрузка проданных специфичных…
      </div>
    );
  }

  if (soldGroups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium">Проданных специфичных пока нет</p>
        <p className="text-sm text-muted-foreground">
          Отметьте продажу в разделе «Специфичные» — запись появится здесь автоматически.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {soldGroups.map(({ category, records: categoryRecords }) => (
        <section key={category.id} className="flex min-h-[320px] flex-col border-b last:border-b-0">
          <div className="flex items-center gap-2.5 border-b bg-card/80 px-4 py-3 backdrop-blur-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">{category.name}</h2>
              <p className="text-xs text-muted-foreground">Продано: {categoryRecords.length}</p>
            </div>
          </div>
          <div className="min-h-[280px] flex-1">
            <SpecificExcelGrid
              records={categoryRecords}
              search={workspace.search}
              category={category}
              companyId={companyId}
              canEdit={canEdit}
              repository={specificCategoryRepository}
              soldOnly
              compactEmptyRows
            />
          </div>
        </section>
      ))}
    </div>
  );
}
