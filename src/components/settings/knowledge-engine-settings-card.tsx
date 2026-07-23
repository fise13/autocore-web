"use client";

import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { backfillKnowledge } from "@/lib/knowledge/knowledge-api.client";
import { userCopy } from "@/lib/user-copy";

type KnowledgeEngineSettingsCardProps = {
  onStatus?: (message: string | null) => void;
};

type LearnState = "idle" | "learning" | "ready" | "error";

export function KnowledgeEngineSettingsCard({ onStatus }: KnowledgeEngineSettingsCardProps) {
  const { isPro, isLoading: billingLoading } = useBillingGate();
  const copy = userCopy.settings.knowledgeEngine;
  const [state, setState] = useState<LearnState>("idle");
  const [processed, setProcessed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  async function runSeed(force: boolean) {
    setState("learning");
    setError(null);
    onStatus?.(null);
    try {
      const result = await backfillKnowledge(200, { force });
      setProcessed(result.processed);
      setState("ready");
      if (!result.skipped) {
        onStatus?.(copy.statusReady(result.processed));
      }
    } catch (seedError) {
      const message = seedError instanceof Error ? seedError.message : copy.statusError;
      setError(message);
      setState("error");
    }
  }

  useEffect(() => {
    if (billingLoading || !isPro || autoStarted.current) return;
    autoStarted.current = true;
    void runSeed(false);
    // Intentionally once when Pro becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingLoading, isPro]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" />
          <CardTitle>{copy.title}</CardTitle>
        </div>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isPro && !billingLoading ? (
          <p className="text-sm text-muted-foreground">{copy.proRequired}</p>
        ) : null}

        {isPro ? (
          <div className="flex flex-wrap items-center gap-2">
            {state === "learning" || billingLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {copy.statusLearning}
              </p>
            ) : null}
            {state === "ready" && processed !== null ? (
              <p className="text-sm text-muted-foreground">{copy.statusReady(processed)}</p>
            ) : null}
            {state === "idle" && isPro ? (
              <p className="text-sm text-muted-foreground">{copy.statusLearning}</p>
            ) : null}
            {state === "ready" || state === "error" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={false}
                onClick={() => void runSeed(true)}
              >
                {copy.reseed}
              </Button>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
