"use client";

import { useAppLocale } from "@/components/providers/app-locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type AppLocale } from "@/lib/locale/preferred-locale";
import { getLocaleMetadata, SUPPORTED_LOCALES } from "@autocore/i18n/config";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

export function AccountLanguageSettingsCard() {
  const { locale, setLocale, isSaving } = useAppLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{userCopy.account.languageTitle}</CardTitle>
        <CardDescription>{userCopy.account.languageDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {SUPPORTED_LOCALES.map((item) => {
          const meta = getLocaleMetadata(item);
          const active = item === locale;
          return (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              disabled={isSaving}
              className={cn(active && "pointer-events-none")}
              onClick={() => {
                void setLocale(item as AppLocale);
              }}
            >
              {meta.nativeName}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
