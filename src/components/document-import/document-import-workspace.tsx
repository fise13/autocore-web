"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

import { DocumentImportDataPanel } from "@/components/document-import/document-import-data-panel";
import { DocumentImportViewer } from "@/components/document-import/document-import-viewer";
import { useAuth } from "@/components/providers/auth-provider";
import { useDocumentImportJobRealtime } from "@/hooks/use-document-import-jobs-realtime";
import { normalizeCompanyId } from "@/lib/company-id";

type DocumentImportWorkspaceProps = {
  jobId: string;
};

export function DocumentImportWorkspace({ jobId }: DocumentImportWorkspaceProps) {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { job, loading, errorMessage } = useDocumentImportJobRealtime(companyId, jobId);

  const imageUrl = job?.previewDownloadUrl || job?.originalDownloadUrl || null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex items-center gap-3"
      >
        <Link
          href="/imports"
          className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Imports
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">
            {job?.fileName?.trim() || "Imported document"}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{jobId}</p>
        </div>
      </motion.div>

      {errorMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {!loading && !job ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border bg-muted/20">
          <p className="text-sm font-medium">Документ не найден</p>
          <p className="text-xs text-muted-foreground">Проверьте ссылку или права доступа</p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
          <DocumentImportViewer imageUrl={imageUrl} loading={loading && !job} />
          <DocumentImportDataPanel job={job} extractedData={job?.extractedData ?? null} />
        </div>
      )}
    </div>
  );
}
