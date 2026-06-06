"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where, limit } from "firebase/firestore";

import { DocumentGenerationJob } from "@/domain/document-generation";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";

function mapJob(id: string, data: Record<string, unknown>): DocumentGenerationJob {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    aggregateType: (data.aggregateType as DocumentGenerationJob["aggregateType"]) ?? "work_order",
    aggregateId: String(data.aggregateId ?? ""),
    requestedSlugs: Array.isArray(data.requestedSlugs) ? (data.requestedSlugs as DocumentGenerationJob["requestedSlugs"]) : [],
    completedSlugs: Array.isArray(data.completedSlugs) ? (data.completedSlugs as DocumentGenerationJob["completedSlugs"]) : [],
    triggerEventId: typeof data.triggerEventId === "string" ? data.triggerEventId : undefined,
    status: (data.status as DocumentGenerationJob["status"]) ?? "pending",
    attempts: Number(data.attempts ?? 0),
    error: typeof data.error === "string" ? data.error : undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    completedAt: toDateFromFirestore(data.completedAt) ?? undefined,
  };
}

export function useDocumentGenerationJobsRealtime(
  companyId: string,
  aggregateId: string,
  enabled = true,
) {
  const [jobs, setJobs] = useState<DocumentGenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!companyId || !aggregateId || !enabled) {
      setJobs([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), "documentGenerationJobs"),
      where("aggregateId", "==", aggregateId),
      orderBy("createdAt", "desc"),
      limit(5),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        setJobs(snapshot.docs.map((doc) => mapJob(doc.id, doc.data() as Record<string, unknown>)));
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [companyId, aggregateId, enabled]);

  const latestJob = jobs[0];
  const isGenerating =
    latestJob?.status === "pending" || latestJob?.status === "processing";

  return { jobs, latestJob, isGenerating, isLoading };
}
