"use client";

import { DocumentImportsList } from "@/components/document-import/document-imports-list";
import { useAuth } from "@/components/providers/auth-provider";
import { useDocumentImportJobsRealtime } from "@/hooks/use-document-import-jobs-realtime";
import { normalizeCompanyId } from "@/lib/company-id";

export function DocumentImportsListWorkspace() {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { jobs, loading, errorMessage } = useDocumentImportJobsRealtime(companyId);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-6 overflow-y-auto p-4 md:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mobile Import</h1>
        <p className="text-sm text-muted-foreground">
          Документы, загруженные с мобильного. Просмотр и — позже — автоматическое извлечение данных.
        </p>
      </div>

      <DocumentImportsList jobs={jobs} loading={loading} errorMessage={errorMessage} />
    </div>
  );
}
