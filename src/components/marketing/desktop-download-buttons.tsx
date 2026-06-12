"use client";

import { useEffect, useState } from "react";
import { Apple, Download } from "lucide-react";

import { getDesktopDownloadLinks } from "@/lib/desktop/desktop-downloads";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 5.5 10.5 4.5V11H3V5.5Zm0 7.5h7.5v6.5L3 18.5V13Zm9-8.5L21 3.5V11H12V4.5Zm0 7.5H21v7.5l-9-1.5V12Z" />
    </svg>
  );
}

type DesktopOs = "mac" | "windows" | "other";

function detectDesktopOs(): DesktopOs {
  if (typeof navigator === "undefined") return "other";
  const platform = navigator.platform?.toLowerCase() ?? "";
  const ua = navigator.userAgent.toLowerCase();
  if (platform.includes("mac") || ua.includes("mac")) return "mac";
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  return "other";
}

type DesktopDownloadButtonsProps = {
  className?: string;
  layout?: "row" | "stack";
  size?: "default" | "lg";
};

export function DesktopDownloadButtons({
  className,
  layout = "row",
  size = "default",
}: DesktopDownloadButtonsProps) {
  const links = getDesktopDownloadLinks();
  const [preferredOs, setPreferredOs] = useState<DesktopOs>("other");

  useEffect(() => {
    setPreferredOs(detectDesktopOs());
  }, []);

  const buttonSize = size === "lg" ? "lg" : "default";

  return (
    <div
      className={cn(
        "flex gap-3",
        layout === "stack" ? "flex-col sm:flex-row sm:flex-wrap" : "flex-wrap items-center",
        className,
      )}
    >
      <Button
        size={buttonSize}
        variant={preferredOs === "mac" ? "default" : "outline"}
        nativeButton={false}
        render={
          <a href={links.mac} download aria-label="Скачать AutoCore для macOS">
            <Apple className="size-4" data-icon="inline-start" />
            Скачать для macOS
          </a>
        }
      />
      <Button
        size={buttonSize}
        variant={preferredOs === "windows" ? "default" : "outline"}
        nativeButton={false}
        render={
          <a href={links.windows} download aria-label="Скачать AutoCore для Windows">
            <WindowsIcon className="size-4" data-icon="inline-start" />
            Скачать для Windows
          </a>
        }
      />
    </div>
  );
}

/** Compact icon-only links for footer. */
export function DesktopDownloadIcons({ className }: { className?: string }) {
  const links = getDesktopDownloadLinks();
  const iconLinkClass = cn(
    "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition",
    "hover:bg-muted/80 hover:text-foreground",
  );

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <a
        href={links.mac}
        download
        className={iconLinkClass}
        aria-label="Скачать AutoCore для macOS"
        title="Скачать для macOS"
      >
        <Apple className="size-[18px]" strokeWidth={2} />
      </a>
      <a
        href={links.windows}
        download
        className={iconLinkClass}
        aria-label="Скачать AutoCore для Windows"
        title="Скачать для Windows"
      >
        <WindowsIcon className="size-[18px]" />
      </a>
    </div>
  );
}

export function DesktopDownloadHint({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      <Download className="me-1.5 inline size-3.5 opacity-70" aria-hidden />
      Установщики для macOS (.dmg) и Windows (.exe). После установки войдите через браузер или Apple ID.
    </p>
  );
}
