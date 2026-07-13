"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

import { getFirebaseApp } from "@/infrastructure/firebase/client";

/**
 * Resolve a viewable image URL for a document import.
 * Prefers authenticated API proxy (reliable), falls back to Storage download URL.
 */
export function useDocumentImportImageUrl(
  jobId: string | undefined,
  fallbackUrl: string | null,
  enabled = true,
): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(fallbackUrl);
  const [loading, setLoading] = useState(Boolean(enabled && jobId));

  useEffect(() => {
    if (!enabled || !jobId) {
      setUrl(fallbackUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setLoading(true);
      try {
        const token = await getAuth(getFirebaseApp()).currentUser?.getIdToken();
        if (!token) {
          if (!cancelled) setUrl(fallbackUrl);
          return;
        }
        const response = await fetch(`/api/imports/${jobId}/image?preview=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!cancelled) setUrl(fallbackUrl);
          return;
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch {
        if (!cancelled) setUrl(fallbackUrl);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, fallbackUrl, jobId]);

  return { url, loading };
}
