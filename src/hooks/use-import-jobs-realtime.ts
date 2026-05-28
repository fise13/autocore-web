import { useEffect, useState } from "react";

import { InventoryImportJob } from "@/domain/inventory-import";
import { InventoryImportRepository } from "@/infrastructure/firestore/inventory-import-repository";

export function useImportJobsRealtime(
  repository: InventoryImportRepository,
  companyId: string | undefined,
  enabled = true,
) {
  const [jobs, setJobs] = useState<InventoryImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !enabled) {
      setJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = repository.subscribe(
      companyId,
      (next) => {
        setJobs(next);
        setLoading(false);
        setErrorMessage(null);
      },
      (error) => {
        setErrorMessage(error.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [repository, companyId, enabled]);

  return { jobs, loading, errorMessage };
}
