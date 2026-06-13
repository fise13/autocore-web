"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query as firestoreQuery, where } from "firebase/firestore";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const active = Boolean(companyId && aggregateId && enabled);
  const queryKey = useMemo(
    () => ["document-generation-jobs", companyId, aggregateId] as const,
    [companyId, aggregateId],
  );
  const activeKey = queryKey.join("|");
  const [snapshotKey, setSnapshotKey] = useState<string | null>(null);

  const jobsQuery = useQuery<DocumentGenerationJob[]>({
    queryKey,
    queryFn: async () => [],
    enabled: active,
    initialData: [],
  });

  useEffect(() => {
    if (!active) return;

    const q = firestoreQuery(
      collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), "documentGenerationJobs"),
      where("aggregateId", "==", aggregateId),
      orderBy("createdAt", "desc"),
      limit(5),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const jobs = snapshot.docs.map((doc) => mapJob(doc.id, doc.data() as Record<string, unknown>));
        setSnapshotKey(activeKey);
        queryClient.setQueryData(queryKey, jobs);
      },
      () => setSnapshotKey(activeKey),
    );
  }, [active, activeKey, aggregateId, companyId, queryClient, queryKey]);

  const jobs = active ? (jobsQuery.data ?? []) : [];
  const latestJob = jobs[0];
  const isGenerating = latestJob?.status === "pending" || latestJob?.status === "processing";

  return {
    jobs,
    latestJob,
    isGenerating,
    isLoading: active ? snapshotKey !== activeKey : false,
  };
}
