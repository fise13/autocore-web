"use client";

import { LayoutGroup, motion } from "motion/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { workOrdersNavSpring } from "@/components/work-orders/work-orders-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type ThemeChoice = "light" | "dark" | "system";

function resolveActiveTheme(theme: string | undefined, resolvedTheme: string | undefined): ThemeChoice {
  if (theme === "system") return "system";
  if (theme === "dark" || resolvedTheme === "dark") return "dark";
  return "light";
}

export function ThemeSettingsCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const themeOptions = [
    { value: "system" as const, label: userCopy.settings.themeSystem, icon: Monitor },
    { value: "light" as const, label: userCopy.settings.themeLight, icon: Sun },
    { value: "dark" as const, label: userCopy.settings.themeDark, icon: Moon },
  ];

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
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const selected = activeTheme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    "relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setTheme(option.value)}
                >
                  {selected ? (
                    <motion.span
                      layoutId="settings-theme-pill"
                      className="absolute inset-0 rounded-md bg-background shadow-sm"
                      transition={workOrdersNavSpring}
                    />
                  ) : null}
                  <Icon className="relative size-3.5" />
                  <span className="relative">{option.label}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </CardContent>
    </Card>
  );
}
