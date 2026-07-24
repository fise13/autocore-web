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
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const EXAMPLE_BASE_AMOUNT = 100_000;

type DisplayCurrencySettingsCardProps = {
  onStatus?: (message: string | null) => void;
};

function currencyOptionCopy(id: AppDisplayCurrency): { label: string; description: string } {
  const copy = userCopy.settings.displayCurrency;
  switch (id) {
    case "KZT":
      return { label: copy.kztLabel, description: copy.kztDescription };
    case "RUB":
      return { label: copy.rubLabel, description: copy.rubDescription };
    case "USD":
      return { label: copy.usdLabel, description: copy.usdDescription };
  }
}

export function DisplayCurrencySettingsCard({ onStatus }: DisplayCurrencySettingsCardProps) {
  const { currency, formatMoney, setCurrency, exchangeRateHint, rates, isLoading } =
    useAppDisplayCurrency();
  const [saving, setSaving] = useState(false);
  const locale = getActiveUserCopyLocale() === "en" ? "en-US" : "ru-RU";

  async function onSelect(next: AppDisplayCurrency) {
    if (next === currency || saving) return;
    setSaving(true);
    onStatus?.(null);
    try {
      await setCurrency(next);
      onStatus?.(userCopy.settings.displayCurrency.saved);
    } catch (error) {
      onStatus?.(
        error instanceof Error ? error.message : userCopy.settings.displayCurrency.saveError,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          <CardTitle>{userCopy.settings.displayCurrency.title}</CardTitle>
        </div>
        <CardDescription>{userCopy.settings.displayCurrency.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <Badge variant="secondary">{userCopy.settings.displayCurrency.loadingRates}</Badge>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          {APP_DISPLAY_CURRENCY_OPTIONS.map((option) => {
            const active = currency === option.id;
            const labels = currencyOptionCopy(option.id);
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
                <span className="text-sm font-medium">{labels.label}</span>
                <span className="text-xs text-muted-foreground">{labels.description}</span>
                <span className="mt-1 text-sm font-semibold tabular-nums">{example}</span>
                {option.id !== "KZT" ? (
                  <span className="text-[11px] text-muted-foreground">
                    {userCopy.settings.displayCurrency.fromBase(
                      EXAMPLE_BASE_AMOUNT.toLocaleString(locale),
                    )}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <Alert>
          <AlertTitle>{userCopy.settings.displayCurrency.exampleTitle}</AlertTitle>
          <AlertDescription className="space-y-1">
            <p className="tabular-nums">{formatMoney(1_250_000)}</p>
            {exchangeRateHint ? (
              <p className="text-xs text-muted-foreground">
                {userCopy.settings.displayCurrency.ratePrefix} {exchangeRateHint}
              </p>
            ) : null}
            {rates.source === "fallback" ? (
              <p className="text-xs text-muted-foreground">
                {userCopy.settings.displayCurrency.fallbackRate}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
