"use client";

import { LayoutGroup, motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { workOrdersNavSpring } from "@/components/work-orders/work-orders-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type ThemeChoice = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: userCopy.settings.themeSystem, icon: Monitor },
  { value: "light", label: userCopy.settings.themeLight, icon: Sun },
  { value: "dark", label: userCopy.settings.themeDark, icon: Moon },
];

function resolveActiveTheme(theme: string | undefined, resolvedTheme: string | undefined): ThemeChoice {
  if (theme === "system") return "system";
  if (theme === "dark" || resolvedTheme === "dark") return "dark";
  return "light";
}

export function ThemeSettingsCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeTheme: ThemeChoice = mounted
    ? resolveActiveTheme(theme, resolvedTheme)
    : "system";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sun className="size-4 text-primary" />
          <CardTitle className="text-base">{userCopy.settings.theme}</CardTitle>
        </div>
        <CardDescription>{userCopy.settings.subtitleTheme}</CardDescription>
      </CardHeader>
      <CardContent>
        <LayoutGroup id="settings-theme">
          <div
            className="inline-flex w-full max-w-sm rounded-lg border bg-muted/40 p-0.5 sm:w-auto"
            role="radiogroup"
            aria-label={userCopy.settings.theme}
          >
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = activeTheme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!mounted}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 sm:min-w-[7.5rem]",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    !mounted && "opacity-70",
                  )}
                >
                  {active && mounted ? (
                    <motion.span
                      layoutId="settings-theme-active"
                      className="absolute inset-0 rounded-md bg-background shadow-sm"
                      transition={workOrdersNavSpring}
                    />
                  ) : null}
                  <Icon className="relative z-10 size-4" />
                  <span className="relative z-10">{option.label}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </CardContent>
    </Card>
  );
}
