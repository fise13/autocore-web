"use client";

import { useState } from "react";
import { Check, Coins } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APP_DISPLAY_CURRENCY_OPTIONS,
  type AppDisplayCurrency,
} from "@/lib/money/display-currency";
import { APP_MONEY_BASE_CURRENCY } from "@/lib/money/exchange-rates";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type DisplayCurrencySettingsCardProps = {
  onStatus?: (message: string | null) => void;
};

export function DisplayCurrencySettingsCard({ onStatus }: DisplayCurrencySettingsCardProps) {
  const { profile } = useAuth();
  const {
    currency,
    formatMoney,
    formatExample,
    exchangeRateHint,
    rates,
    setCurrency,
    isLoading,
  } = useAppDisplayCurrency();
  const copy = userCopy.settings.displayCurrency;
  const canChange = profile?.isCompanyOwner === true;
  const [saving, setSaving] = useState<AppDisplayCurrency | null>(null);

  async function onSelect(next: AppDisplayCurrency) {
    if (!canChange || next === currency || saving) return;
    setSaving(next);
    onStatus?.(null);
    try {
      await setCurrency(next);
      onStatus?.(copy.saved);
    } catch {
      onStatus?.(copy.saveError);
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          <CardTitle>{copy.title}</CardTitle>
        </div>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2" role="radiogroup" aria-label={copy.title}>
          {APP_DISPLAY_CURRENCY_OPTIONS.map((option) => {
            const selected = currency === option.id;
            const label = option.id === "KZT" ? copy.kztLabel : copy.usdLabel;
            const description = option.id === "KZT" ? copy.kztDescription : copy.usdDescription;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!canChange || saving !== null || isLoading}
                onClick={() => void onSelect(option.id)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
                  selected
                    ? "border-primary/30 bg-primary/5"
                    : "border-border hover:bg-muted/40",
                  !canChange ? "cursor-not-allowed opacity-80" : "cursor-pointer",
                )}
              >
                <div>
                  <p className="text-sm font-medium">
                    {label} ({option.id})
                  </p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {formatExample(1_250, option.id)}
                  </p>
                </div>
                {selected ? <Check className="mt-0.5 size-4 text-primary" /> : null}
              </button>
            );
          })}
        </div>

        {exchangeRateHint ? (
          <p className="text-xs text-muted-foreground">
            {copy.ratePrefix} {exchangeRateHint}
            {rates.source === "fallback" ? ` · ${copy.fallbackRate}` : null}
          </p>
        ) : null}

        {!canChange ? <p className="text-xs text-muted-foreground">{copy.ownerOnly}</p> : null}

        <Alert>
          <AlertTitle>{copy.exampleTitle}</AlertTitle>
          <AlertDescription>
            <p className="tabular-nums">{formatMoney(1_250)}</p>
            <p className="text-xs text-muted-foreground">
              {copy.fromBase(`1,250 ${APP_MONEY_BASE_CURRENCY}`)}
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
