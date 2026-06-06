"use client";

import { useEffect, useState } from "react";

import { RenderDocument } from "@/components/documents/registry/render-document";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { DocumentContext } from "@/lib/documents/document-context";
import { DocumentSlug } from "@/lib/documents/document-types";
import { reviveDocumentContext } from "@/lib/documents/revive-document-context";

import { DocumentPreviewActions } from "./document-preview-actions";
import { DocumentPreviewFrame } from "./document-preview-frame";

type DocumentPreviewClientProps = {
  orderId: string;
  slug: DocumentSlug;
};

export function DocumentPreviewClient({ orderId, slug }: DocumentPreviewClientProps) {
  const [context, setContext] = useState<DocumentContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) {
          throw new Error("Требуется авторизация");
        }
        const token = await user.getIdToken();
        const response = await fetch(`/api/documents/context/${slug}/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Не удалось загрузить документ");
        }
        const payload = (await response.json()) as { context: DocumentContext };
        if (!cancelled) {
          setContext(reviveDocumentContext(payload.context));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId, slug]);

  return (
    <DocumentPreviewFrame toolbar={<DocumentPreviewActions slug={slug} orderId={orderId} />}>
      {loading ? (
        <div className="rounded-xl border bg-white px-8 py-16 text-sm text-neutral-500">Загрузка документа…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-white px-8 py-16 text-sm text-red-600">{error}</div>
      ) : context ? (
        <RenderDocument slug={slug} context={context} />
      ) : null}
    </DocumentPreviewFrame>
  );
}
