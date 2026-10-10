"use client";

import { Smartphone } from "lucide-react";

import { DocumentImportsList } from "@/components/document-import/document-imports-list";
import { useAuth } from "@/components/providers/auth-provider";
import { useDocumentImportJobsRealtime } from "@/hooks/use-document-import-jobs-realtime";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";

export function DocumentImportsListWorkspace() {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { jobs, loading, errorMessage } = useDocumentImportJobsRealtime(companyId);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-6 overflow-y-auto p-4 md:p-8">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary-on-subtle">
          <Smartphone className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{userCopy.documentImport.listTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {userCopy.documentImport.listDescription}
          </p>
        </div>
      </div>

      <DocumentImportsList jobs={jobs} loading={loading} errorMessage={errorMessage} />
    </div>
  );
}
