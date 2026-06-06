"use client";

import { useEffect, useState } from "react";

import { Quote } from "@/domain/quote";
import { createQuoteRepository } from "@/infrastructure/firestore/quote-repository";

export function useQuotesRealtime(companyId: string, enabled = true) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!companyId || !enabled) {
      setQuotes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const repository = createQuoteRepository();
    return repository.subscribe(
      companyId,
      (next) => {
        setQuotes(next);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [companyId, enabled]);

  return { quotes, isLoading };
}
