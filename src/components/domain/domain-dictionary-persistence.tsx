"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { DomainDictionaryProvider } from "@/components/domain/domain-dictionary-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { createDomainCompanyDictionaryRepository } from "@/infrastructure/firestore/domain-company-dictionary-repository";
import { normalizeCompanyId } from "@/lib/company-id";
import type { CompanyDomainEntry, CompanyDomainMap } from "@/lib/domain/company-dictionary";

const repository = createDomainCompanyDictionaryRepository();

type DomainDictionaryPersistenceProps = {
  children: ReactNode;
};

export function DomainDictionaryPersistence({ children }: DomainDictionaryPersistenceProps) {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const [initialEntries, setInitialEntries] = useState<CompanyDomainMap | undefined>(undefined);
  const [ready, setReady] = useState(!companyId);

  useEffect(() => {
    if (!companyId) {
      setInitialEntries({});
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void repository
      .listAll(companyId)
      .then((entries) => {
        if (cancelled) return;
        setInitialEntries(entries);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setInitialEntries({});
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const onCreateEntry = useCallback(
    async (entry: CompanyDomainEntry) => {
      if (!companyId) return;
      await repository.upsert(companyId, entry, uid);
    },
    [companyId, uid],
  );

  if (!ready) {
    return <DomainDictionaryProvider>{children}</DomainDictionaryProvider>;
  }

  return (
    <DomainDictionaryProvider key={companyId || "none"} initialEntries={initialEntries} onCreateEntry={onCreateEntry}>
      {children}
    </DomainDictionaryProvider>
  );
}
