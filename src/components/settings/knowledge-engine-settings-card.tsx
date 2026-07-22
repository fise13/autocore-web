"use client";

import { useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { backfillKnowledge } from "@/lib/knowledge/knowledge-api.client";

type KnowledgeEngineSettingsCardProps = {
  onStatus?: (message: string | null) => void;
};

export function KnowledgeEngineSettingsCard({ onStatus }: KnowledgeEngineSettingsCardProps) {
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runBackfill() {
    setRunning(true);
    setError(null);
    onStatus?.(null);
    try {
      const result = await backfillKnowledge(200);
      setProcessed(result.processed);
      onStatus?.(`Обучение завершено: обработано ${result.processed} заказ-нарядов`);
    } catch (backfillError) {
      const message =
        backfillError instanceof Error ? backfillError.message : "Не удалось обучить систему";
      setError(message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" />
          <CardTitle>Подсказки и обучение</CardTitle>
        </div>
        <CardDescription>
          Система учится на завершённых заказ-нарядах и предлагает комплекты, часто покупаемые вместе
          позиции и автозаполнение. Запустите обучение на истории, чтобы получить подсказки сразу,
          не дожидаясь новой активности.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={running} onClick={() => void runBackfill()}>
            {running ? <Loader2 className="size-4 animate-spin" /> : null}
            Обучить на истории
          </Button>
          {processed !== null ? (
            <span className="text-sm text-muted-foreground">Обработано: {processed}</span>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
