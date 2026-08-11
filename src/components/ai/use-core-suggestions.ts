"use client";

import { useEffect, useState } from "react";

import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import type { CoreSuggestion } from "@/domain/ai/suggestions";
import type { AssistantRequestContext } from "@/lib/ai/assistant-context-request";

/**
 * Live empty-state chips.
 *
 * Falls back to the caller's static suggestions whenever the fetch is
 * unavailable, still loading, or returns nothing — the empty state must render
 * instantly and must never show an error.
 */
export function useCoreSuggestions(
  context: AssistantRequestContext,
  fallback: string[],
  enabled: boolean,
): { suggestions: CoreSuggestion[]; live: boolean } {
  const [live, setLive] = useState<CoreSuggestion[]>([]);
  const { pathname, collection } = context;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    async function load() {
      try {
        const token = await getFirebaseAuth().currentUser?.getIdToken();
        if (!token) return;

        const params = new URLSearchParams({ pathname });
        if (collection) params.set("collection", collection);

        const response = await fetch(`/api/assistant/suggestions?${params}`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { suggestions?: CoreSuggestion[] };
        if (!controller.signal.aborted && Array.isArray(payload.suggestions)) {
          setLive(payload.suggestions);
        }
      } catch {
        // Static fallback already covers this.
      }
    }

    void load();
    return () => controller.abort();
  }, [collection, enabled, pathname]);

  if (live.length > 0) return { suggestions: live, live: true };
  return {
    suggestions: fallback.map((prompt) => ({ prompt, label: prompt })),
    live: false,
  };
}
