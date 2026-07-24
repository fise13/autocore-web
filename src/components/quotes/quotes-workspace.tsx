"use client";

import Link from "next/link";
import { ArrowRight, FileText, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useQuotesRealtime } from "@/hooks/use-quotes-realtime";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { userCopy } from "@/lib/user-copy";

function formatQuoteTotal(value: number): string {
  return new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(value);
}

async function convertQuote(quoteId: string): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error(userCopy.quotes.authRequired);
  const token = await user.getIdToken();
  const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}/convert`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? userCopy.quotes.convertFailed);
  }
  const payload = (await response.json()) as { workOrderId: string };
  return payload.workOrderId;
}

export function QuotesWorkspace() {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? "";
  const { quotes, isLoading } = useQuotesRealtime(companyId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConvert(quoteId: string) {
    setBusyId(quoteId);
    setError(null);
    try {
      const workOrderId = await convertQuote(quoteId);
      window.location.href = `/work-orders/${workOrderId}`;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userCopy.quotes.convertError);
    } finally {
      setBusyId(null);
    }
  }

  if (!companyId) {
    return <EmptyState icon={FileText} title={userCopy.quotes.title} description={userCopy.quotes.selectCompany} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{userCopy.quotes.title}</h1>
          <p className="text-sm text-muted-foreground">{userCopy.quotes.subtitle}</p>
        </div>
        <Button type="button" variant="outline" disabled>
          <Plus className="size-4" />
          {userCopy.quotes.create}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {userCopy.quotes.loading}
        </p>
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={userCopy.quotes.emptyTitle}
          description={userCopy.quotes.emptyDescription}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {quote.clientName ?? userCopy.quotes.clientFallback} · {formatQuoteTotal(quote.pricing.grandTotal)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {quote.vehicleLabel ?? userCopy.quotes.noVehicle} · {userCopy.quotes.statusPrefix(quote.status)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/documents/${quote.id}/commercial-proposal`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                  >
                    {userCopy.quotes.preview}
                  </Link>
                  {quote.status !== "converted" ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === quote.id}
                      onClick={() => void handleConvert(quote.id)}
                    >
                      {busyId === quote.id ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                      {userCopy.quotes.toOrder}
                    </Button>
                  ) : quote.convertedWorkOrderId ? (
                    <Link
                      href={`/work-orders/${quote.convertedWorkOrderId}`}
                      className="inline-flex h-8 items-center rounded-md bg-secondary px-3 text-sm hover:bg-secondary/80"
                    >
                      {userCopy.quotes.openOrder}
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
