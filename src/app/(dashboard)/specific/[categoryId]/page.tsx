"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";

import { SpecificRecordsWorkspace } from "@/components/specific/specific-records-workspace";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { normalizeCompanyId } from "@/lib/company-id";
import { scopedCategoryDocumentId } from "@/lib/specific/specific-sync-ids";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";

const specificCategoryRepository = createSpecificCategoryRepository();

export default function SpecificCategoryPage() {
  const params = useParams<{ categoryId: string }>();
  const { profile, isLoading } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const categories = useSpecificCategoriesRealtime(specificCategoryRepository, companyId);

  const category = useMemo(() => {
    const direct = categories.find((item) => item.id === params.categoryId);
    if (direct) return direct;

    const scopedLocalId = Number(params.categoryId.split("_").pop());
    if (Number.isFinite(scopedLocalId)) {
      const byLocalId = categories.find((item) => item.localId === scopedLocalId);
      if (byLocalId) return byLocalId;
      if (companyId) {
        return categories.find((item) => item.id === scopedCategoryDocumentId(companyId, scopedLocalId)) ?? null;
      }
    }
    return null;
  }, [categories, companyId, params.categoryId]);

  if (isLoading) {
    return <AppLoadingScreen message="Загрузка…" />;
  }

  if (!category) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-2 py-16 text-center">
        <h1 className="text-lg font-semibold">Категория не найдена</h1>
        <p className="text-sm text-muted-foreground">
          Возможно, категория ещё не загружена или была удалена.
        </p>
      </div>
    );
  }

  return <SpecificRecordsWorkspace category={category} />;
}
