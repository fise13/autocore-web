"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { useDocumentImportJobsRealtime } from "@/hooks/use-document-import-jobs-realtime";
import { normalizeCompanyId } from "@/lib/company-id";

/**
 * Realtime toast when a document import job appears for the company.
 */
export function DocumentImportRealtimeToast() {
  const router = useRouter();
  const { profile, firebaseUser } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { jobs } = useDocumentImportJobsRealtime(companyId, Boolean(companyId));
  const seenIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    seenIdsRef.current = new Set();
    bootstrappedRef.current = false;
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    if (!bootstrappedRef.current) {
      for (const job of jobs) {
        seenIdsRef.current.add(job.id);
      }
      bootstrappedRef.current = true;
      return;
    }

    for (const job of jobs) {
      if (seenIdsRef.current.has(job.id)) continue;
      seenIdsRef.current.add(job.id);

      if (firebaseUser?.uid && job.createdBy === firebaseUser.uid) continue;
      if (job.status !== "ready" && job.status !== "pending") continue;

      const jobId = job.id;
      sonnerToast("Новый документ загружен", {
        description: job.fileName?.trim() || "Документ готов к просмотру",
        duration: 10_000,
        action: {
          label: "Открыть",
          onClick: () => router.push(`/imports/${jobId}`),
        },
      });
    }
  }, [companyId, firebaseUser?.uid, jobs, router]);

  return null;
}
