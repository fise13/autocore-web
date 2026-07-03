"use client";

import { useEffect, useState } from "react";

import { CompanyAppConfig } from "@/domain/company-config";
import { createCompanyConfigRepository } from "@/infrastructure/firestore/company-config-repository";
import {
  readCachedCompanyAppConfig,
  writeCachedCompanyAppConfig,
} from "@/lib/performance/company-config-cache";

const repository = createCompanyConfigRepository();
const CONFIG_BOOT_TIMEOUT_MS = 4_000;

export function useCompanyAppConfig(companyId: string | null | undefined) {
  const [config, setConfig] = useState<CompanyAppConfig | null>(() =>
    companyId ? readCachedCompanyAppConfig(companyId) : null,
  );
  const [loaded, setLoaded] = useState(() => !companyId || Boolean(readCachedCompanyAppConfig(companyId ?? "")));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!companyId) {
      setConfig(null);
      setLoaded(true);
      return;
    }

    let settled = false;
    const cached = readCachedCompanyAppConfig(companyId);
    setConfig(cached);
    setLoaded(Boolean(cached));
    setError(null);

    const settle = (nextConfig: CompanyAppConfig | null, nextError?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      setConfig(nextConfig);
      if (nextConfig) {
        writeCachedCompanyAppConfig(companyId, nextConfig);
      }
      if (nextError) setError(nextError);
      setLoaded(true);
    };

    const timeoutId = window.setTimeout(() => {
      settle(cached);
    }, CONFIG_BOOT_TIMEOUT_MS);

    const unsubscribe = repository.subscribeAppConfig(
      companyId,
      (next) => settle(next),
      (nextError) => settle(cached, nextError),
    );

    return () => {
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [companyId]);

  return { config, loaded, error };
}
