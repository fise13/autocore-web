"use client";

import { Coins } from "lucide-react";

import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_MONEY_BASE_CURRENCY } from "@/lib/money/exchange-rates";
import { userCopy } from "@/lib/user-copy";

type DisplayCurrencySettingsCardProps = {
  onStatus?: (message: string | null) => void;
};

/** Display currency is locked to USD. */
export function DisplayCurrencySettingsCard(_props: DisplayCurrencySettingsCardProps) {
  const { formatMoney } = useAppDisplayCurrency();
  const copy = userCopy.settings.displayCurrency;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          <CardTitle>{copy.title}</CardTitle>
        </div>
        <CardDescription>
          All amounts in finances, dashboard, and documents use {APP_MONEY_BASE_CURRENCY}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-medium">{copy.usdLabel}</p>
          <p className="text-xs text-muted-foreground">{copy.usdDescription}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{formatMoney(1_250)}</p>
        </div>

        <Alert>
          <AlertTitle>{copy.exampleTitle}</AlertTitle>
          <AlertDescription>
            <p className="tabular-nums">{formatMoney(1_250)}</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
