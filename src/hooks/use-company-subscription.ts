"use client";

import { useEffect, useState } from "react";

import { CompanySubscription } from "@/domain/billing";
import { subscribeCompanySubscription } from "@/infrastructure/firestore/billing-repository";

export function useCompanySubscription(companyId: string | null | undefined) {
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(companyId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setSubscription(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeCompanySubscription(
      companyId,
      (next) => {
        setSubscription(next);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [companyId]);

  return { subscription, isLoading, error };
}
