import { useEffect, useState } from "react";

import { MotorImportJob } from "@/domain/motor-import";
import { MotorImportRepository } from "@/infrastructure/firestore/motor-import-repository";

export function useMotorImportJobsRealtime(
  repository: MotorImportRepository,
  companyId: string | undefined,
  enabled = true,
) {
  const [jobs, setJobs] = useState<MotorImportJob[]>([]);
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
