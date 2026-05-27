"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { getFirestoreDb } from "@/infrastructure/firebase/client";

export function useCompanyProfile(companyId: string | null | undefined) {
  const [name, setName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(companyId));

  useEffect(() => {
    if (!companyId) {
      setName(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const ref = doc(getFirestoreDb(), "companies", companyId);
    return onSnapshot(
      ref,
      (snap) => {
        setName(snap.exists() ? (snap.data()?.name as string | undefined) ?? null : null);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [companyId]);

  return { name, isLoading };
}
