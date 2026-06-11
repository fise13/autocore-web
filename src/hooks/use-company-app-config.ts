"use client";

import { useEffect, useState } from "react";

import { CompanyAppConfig } from "@/domain/company-config";
import { createCompanyConfigRepository } from "@/infrastructure/firestore/company-config-repository";

const repository = createCompanyConfigRepository();

export function useCompanyAppConfig(companyId: string | null | undefined) {
  const [config, setConfig] = useState<CompanyAppConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!companyId) {
      setConfig(null);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    const unsubscribe = repository.subscribeAppConfig(
      companyId,
      (next) => {
        setConfig(next);
        setLoaded(true);
      },
      (nextError) => {
        setError(nextError);
        setLoaded(true);
      },
    );
    return () => unsubscribe();
  }, [companyId]);

  return { config, loaded, error };
}
