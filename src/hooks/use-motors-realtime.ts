"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { MotorEntity } from "@/domain/motor";
import { normalizeCompanyId } from "@/lib/company-id";
import { MotorFilters, MotorRepository } from "@/infrastructure/firestore/motor-repository";

export function useMotorsRealtime(
  repository: MotorRepository,
  filters: MotorFilters & { enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const companyId = normalizeCompanyId(filters.companyId);
  const { uid, soldOnly, availability, includeDeleted, search, brandName, engineCode, enabled = true } =
    filters;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snapshotKey, setSnapshotKey] = useState<string | null>(null);

  const queryKey = useMemo(
    () =>
      [
        "motors",
        uid,
        companyId,
        soldOnly ? "sold" : "all",
        availability ?? "all",
        includeDeleted ? "withDeleted" : "active",
        search ?? "",
        brandName ?? "",
        engineCode ?? "",
      ] as const,
    [uid, companyId, soldOnly, availability, includeDeleted, search, brandName, engineCode],
  );

  const activeKey = queryKey.join("|");

  const query = useQuery<MotorEntity[]>({
    queryKey,
    queryFn: async () => [],
    enabled: Boolean(uid && companyId && enabled),
    initialData: [],
  });

  useEffect(() => {
    if (!uid || !companyId || !enabled) return;

    const unsubscribe = repository.subscribe(
      { uid, companyId, soldOnly, availability, includeDeleted, search, brandName, engineCode },
      (motors) => {
        setErrorMessage(null);
        setSnapshotKey(activeKey);
        queryClient.setQueryData(queryKey, motors);
      },
      (error) => {
        if (error.code === "permission-denied" || error.code === "unauthenticated") {
          setSnapshotKey(activeKey);
          return;
        }
        setErrorMessage(error.message);
        setSnapshotKey(activeKey);
      },
    );

    return () => unsubscribe();
  }, [
    repository,
    uid,
    companyId,
    soldOnly,
    availability,
    includeDeleted,
    search,
    brandName,
    engineCode,
    queryClient,
    queryKey,
    activeKey,
    enabled,
  ]);

  const isBootstrapping = Boolean(uid && companyId && enabled && snapshotKey !== activeKey && !errorMessage);

  return {
    ...query,
    errorMessage,
    isError: Boolean(errorMessage),
    isBootstrapping,
  };
}
