"use client";

import { useEffect, useState } from "react";

import { RenderDocument } from "@/components/documents/registry/render-document";
import { waitForFirebaseUser } from "@/lib/auth/wait-for-firebase-user";
import { DocumentContext } from "@/lib/documents/document-context";
import { DocumentSlug } from "@/lib/documents/document-types";
import { mapDocumentError } from "@/lib/documents/map-document-error";
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
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const user = await waitForFirebaseUser();
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
          setError(mapDocumentError(nextError, "Ошибка загрузки"));
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

  const activeError = pdfError ?? error;

  return (
    <DocumentPreviewFrame
      toolbar={
        <DocumentPreviewActions
          slug={slug}
          orderId={orderId}
          previewReady={Boolean(context)}
          onError={setPdfError}
          onNotice={setPdfNotice}
        />
      }
    >
      {activeError ? (
        <div className="w-full max-w-3xl rounded-xl border border-red-500/30 bg-[#141414] px-6 py-5 text-sm text-red-300">
          {activeError}
        </div>
      ) : null}

      {pdfNotice ? (
        <div className="w-full max-w-3xl rounded-xl border border-sky-500/30 bg-[#141414] px-6 py-5 text-sm text-sky-200">
          {pdfNotice}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-[#141414] px-8 py-16 text-sm text-neutral-400">
          Загрузка документа…
        </div>
      ) : error ? null : context ? (
        <div
          id="doc-preview-print-root"
          className="doc-preview-paper overflow-hidden rounded-lg shadow-[0_24px_80px_rgb(0_0_0/0.55)]"
        >
          <RenderDocument slug={slug} context={context} />
        </div>
      ) : null}
    </DocumentPreviewFrame>
  );
}
