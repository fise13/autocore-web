"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { KnowledgeSuggestion } from "@/domain/knowledge/types";
import {
  fetchKnowledgeSuggestions,
  postKnowledgeFeedback,
} from "@/lib/knowledge/knowledge-api.client";

type UseKnowledgeSuggestionsArgs = {
  enabled?: boolean;
  companyId?: string | null;
  engineCode?: string;
  brandName?: string;
  clientId?: string;
  mechanicId?: string;
  fieldKey?: string;
  query?: string;
  limit?: number;
};

export function useKnowledgeSuggestions(args: UseKnowledgeSuggestionsArgs) {
  const {
    enabled = true,
    companyId,
    engineCode,
    brandName,
    clientId,
    mechanicId,
    fieldKey,
    query,
    limit = 8,
  } = args;

  const [suggestions, setSuggestions] = useState<KnowledgeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !companyId) {
      setSuggestions([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetchKnowledgeSuggestions({
        companyId,
        engineCode,
        brandName,
        clientId,
        mechanicId,
        fieldKey,
        query,
        limit,
      })
        .then((next) => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions(next);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    brandName,
    clientId,
    companyId,
    enabled,
    engineCode,
    fieldKey,
    limit,
    mechanicId,
    query,
  ]);

  const dismiss = useCallback(async (suggestion: KnowledgeSuggestion) => {
    setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    try {
      await postKnowledgeFeedback({
        suggestionId: suggestion.id,
        patternId: suggestion.patternId,
        kind: suggestion.kind,
        action: "dismissed",
      });
    } catch {
      // ignore
    }
  }, []);

  const accept = useCallback(async (suggestion: KnowledgeSuggestion) => {
    setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    try {
      await postKnowledgeFeedback({
        suggestionId: suggestion.id,
        patternId: suggestion.patternId,
        kind: suggestion.kind,
        action: "accepted",
      });
    } catch {
      // ignore
    }
  }, []);

  return { suggestions, loading, dismiss, accept };
}
