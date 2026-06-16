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

    let settled = false;
    setLoaded(false);

    const settle = (nextConfig: CompanyAppConfig | null, nextError?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      setConfig(nextConfig);
      if (nextError) setError(nextError);
      setLoaded(true);
    };

    const timeoutId = window.setTimeout(() => {
      settle(null);
    }, 12_000);

    const unsubscribe = repository.subscribeAppConfig(
      companyId,
      (next) => settle(next),
      (nextError) => settle(null, nextError),
    );

    return () => {
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [companyId]);

  return { config, loaded, error };
}
