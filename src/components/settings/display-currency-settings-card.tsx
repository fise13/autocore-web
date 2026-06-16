"use client";

import { useState } from "react";
import { Coins } from "lucide-react";

import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APP_DISPLAY_CURRENCY_OPTIONS,
  AppDisplayCurrency,
  formatAppMoneyExample,
} from "@/lib/money/display-currency";
import { convertFromBaseCurrency } from "@/lib/money/exchange-rates";
import { cn } from "@/lib/utils";

const EXAMPLE_BASE_AMOUNT = 100_000;

type DisplayCurrencySettingsCardProps = {
  onStatus?: (message: string | null) => void;
};

export function DisplayCurrencySettingsCard({ onStatus }: DisplayCurrencySettingsCardProps) {
  const { currency, formatMoney, setCurrency, exchangeRateHint, rates, isLoading } =
    useAppDisplayCurrency();
  const [saving, setSaving] = useState(false);

  async function onSelect(next: AppDisplayCurrency) {
    if (next === currency || saving) return;
    setSaving(true);
    onStatus?.(null);
    try {
      await setCurrency(next);
      onStatus?.("Валюта отображения сохранена");
    } catch (error) {
      onStatus?.(error instanceof Error ? error.message : "Не удалось сохранить валюту");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          <CardTitle>Валюта отображения</CardTitle>
        </div>
        <CardDescription>
          Суммы в бухгалтерии и на дашборде хранятся в тенге и пересчитываются по актуальному курсу
          при показе в рублях или долларах.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? <Badge variant="secondary">Загрузка курсов…</Badge> : null}

        <div className="grid gap-2 sm:grid-cols-3">
          {APP_DISPLAY_CURRENCY_OPTIONS.map((option) => {
            const active = currency === option.id;
            const example = formatAppMoneyExample(EXAMPLE_BASE_AMOUNT, option.id, (value) =>
              convertFromBaseCurrency(value, option.id, rates),
            );

            return (
              <button
                key={option.id}
                type="button"
                disabled={saving || isLoading}
                onClick={() => void onSelect(option.id)}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card/80 hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
                <span className="mt-1 text-sm font-semibold tabular-nums">{example}</span>
                {option.id !== "KZT" ? (
                  <span className="text-[11px] text-muted-foreground">
                    из {EXAMPLE_BASE_AMOUNT.toLocaleString("ru-RU")} ₸
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <Alert>
          <AlertTitle>Пример с текущей настройкой</AlertTitle>
          <AlertDescription className="space-y-1">
            <p className="tabular-nums">{formatMoney(1_250_000)}</p>
            {exchangeRateHint ? (
              <p className="text-xs text-muted-foreground">Курс: {exchangeRateHint}</p>
            ) : null}
            {rates.source === "fallback" ? (
              <p className="text-xs text-muted-foreground">
                Используется резервный курс — обновление с сервера недоступно.
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
