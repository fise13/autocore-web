"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { DOCUMENT_THEMES, DocumentTheme } from "@/domain/company-branding";
import { defaultHeaderColorsForTheme } from "@/domain/document-header-config";
import { DOCUMENT_THEME_LABELS_RU } from "@/lib/documents/themes/tokens";
import { cn } from "@/lib/utils";

const THEME_DESCRIPTIONS: Record<DocumentTheme, string> = {
  modern: "Sans-serif, воздух и brand-акценты — SaaS-счёт",
  premium: "Serif, тёплая бумага и letterhead — премиальное письмо",
  classic: "Serif, строгие рамки — официальный бухгалтерский документ",
  racing: "Motorsport: тёмная шапка, белый текст, красный акцент",
};

type BrandingThemePickerProps = {
  value: DocumentTheme;
  brandColor: string;
  onChange: (theme: DocumentTheme) => void;
};

export function BrandingThemePicker({ value, brandColor, onChange }: BrandingThemePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DOCUMENT_THEMES.map((theme) => {
        const selected = value === theme;
        const colors = defaultHeaderColorsForTheme(theme);

        return (
          <button
            key={theme}
            type="button"
            onClick={() => onChange(theme)}
            className={cn(
              "group relative cursor-pointer rounded-xl border p-3 text-left transition-colors duration-200",
              selected
                ? "border-primary bg-primary/5"
                : "border-border/80 bg-card hover:border-primary/30 hover:bg-muted/30",
            )}
          >
            {selected ? (
              <motion.span
                layoutId="branding-theme-outline"
                className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary/25"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}

            <div
              className="mb-3 overflow-hidden rounded-lg border"
              style={{
                background: colors.headerBackgroundColor,
                borderColor: `color-mix(in srgb, ${colors.headerTextColor} 20%, transparent)`,
              }}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="size-5 rounded-md border"
                    style={{
                      background: `color-mix(in srgb, ${brandColor} 70%, ${colors.headerBackgroundColor})`,
                      borderColor: `color-mix(in srgb, ${colors.headerTextColor} 25%, transparent)`,
                    }}
                  />
                  <span
                    className="h-2 w-16 rounded-full"
                    style={{ background: colors.headerTextColor, opacity: 0.85 }}
                  />
                </div>
                <span
                  className="h-2 w-8 rounded-full"
                  style={{
                    background: theme === "racing" ? brandColor : colors.headerTextColor,
                    opacity: theme === "racing" ? 1 : 0.35,
                  }}
                />
              </div>
              {theme === "racing" ? (
                <div className="h-0.5 w-full" style={{ background: brandColor }} />
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{DOCUMENT_THEME_LABELS_RU[theme]}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {THEME_DESCRIPTIONS[theme]}
                </p>
              </div>
              {selected ? (
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
