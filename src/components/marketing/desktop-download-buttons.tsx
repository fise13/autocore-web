"use client";

import "@/styles/desktop-download-badges.css";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { useToast } from "@/components/ui/toast-provider";
import { getDesktopDownloadLinks } from "@/lib/desktop/desktop-downloads";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type DesktopOs = "mac" | "windows" | "other";

type DownloadAvailability = {
  mac: boolean;
  windows: boolean;
};

function detectDesktopOs(): DesktopOs {
  if (typeof navigator === "undefined") return "other";
  const platform = navigator.platform?.toLowerCase() ?? "";
  const ua = navigator.userAgent.toLowerCase();
  if (platform.includes("mac") || ua.includes("mac")) return "mac";
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  return "other";
}

function useDesktopDownloadAvailability() {
  const links = getDesktopDownloadLinks();
  const { toast } = useToast();
  const [preferredOs, setPreferredOs] = useState<DesktopOs>("other");
  const [availability, setAvailability] = useState<DownloadAvailability>({
    mac: true,
    windows: true,
  });

  useEffect(() => {
    setPreferredOs(detectDesktopOs());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/desktop/downloads", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { platforms?: Record<string, { available?: boolean }> } | null) => {
        if (cancelled || !payload?.platforms) return;
        setAvailability({
          mac: payload.platforms.mac?.available ?? true,
          windows: payload.platforms.windows?.available ?? true,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  function notifyUnavailable(platform: DesktopOs) {
    toast({
      title: userCopy.desktop.downloadUnavailableTitle,
      description:
        platform === "windows"
          ? userCopy.desktop.windowsUnavailable
          : userCopy.desktop.macUnavailable,
    });
  }

  function handleDownload(platform: DesktopOs, url: string, available: boolean) {
    if (!available) {
      notifyUnavailable(platform);
      return;
    }
    window.location.assign(url);
  }

  return { links, preferredOs, availability, handleDownload };
}

function AppleBadgeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.87 4.03 2.91 4.04-.03.07-.47 1.61-1.43 3.22M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsBadgeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 5.5 10.5 4.5V11H3V5.5Zm0 7.5h7.5v6.5L3 18.5V13Zm9-8.5L21 3.5V11H12V4.5Zm0 7.5H21v7.5l-9-1.5V12Z" />
    </svg>
  );
}

type DesktopDownloadBadgeProps = {
  platform: "mac" | "windows";
  url: string;
  available: boolean;
  emphasized?: boolean;
  compact?: boolean;
  mini?: boolean;
  onUnavailable: () => void;
};

function DesktopDownloadBadge({
  platform,
  url,
  available,
  emphasized = false,
  compact = false,
  mini = false,
  onUnavailable,
}: DesktopDownloadBadgeProps) {
  const isMac = platform === "mac";
  const label = isMac ? "Mac OS" : "Windows";
  const className = cn(
    "desktop-download-badge",
    mini && "is-mini",
    compact && !mini && "is-compact",
    emphasized && "is-emphasis",
    !available && "is-unavailable",
  );

  const content = (
    <>
      <span className="desktop-download-badge-icon">
        {isMac ? <AppleBadgeIcon className="size-full" /> : <WindowsBadgeIcon className="size-full" />}
      </span>
      <span className="desktop-download-badge-copy">
        <span className="desktop-download-badge-eyebrow">Download for</span>
        <span className="desktop-download-badge-platform">{label}</span>
      </span>
    </>
  );

  if (available) {
    return (
      <a
        href={url}
        download
        className={className}
        aria-label={`Download AutoCore for ${label}`}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={`Download AutoCore for ${label}`}
      onClick={onUnavailable}
    >
      {content}
    </button>
  );
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
  const { links, preferredOs, availability, handleDownload } = useDesktopDownloadAvailability();
  const compact = size === "default" && layout !== "stack";

  return (
    <div
      className={cn(
        "desktop-download-badges",
        layout === "stack" && "is-stack",
        className,
      )}
    >
      <DesktopDownloadBadge
        platform="mac"
        url={links.mac}
        available={availability.mac}
        emphasized={preferredOs === "mac"}
        compact={compact}
        onUnavailable={() => handleDownload("mac", links.mac, false)}
      />
      <DesktopDownloadBadge
        platform="windows"
        url={links.windows}
        available={availability.windows}
        emphasized={preferredOs === "windows"}
        compact={compact}
        onUnavailable={() => handleDownload("windows", links.windows, false)}
      />
    </div>
  );
}

/** Compact store-style badges for footer and tight layouts. */
export function DesktopDownloadIcons({
  className,
  size = "mini",
}: {
  className?: string;
  size?: "compact" | "mini";
}) {
  const { links, availability, handleDownload } = useDesktopDownloadAvailability();
  const mini = size === "mini";

  return (
    <div className={cn("desktop-download-badges", mini && "is-mini", className)}>
      <DesktopDownloadBadge
        platform="mac"
        url={links.mac}
        available={availability.mac}
        compact={!mini}
        mini={mini}
        onUnavailable={() => handleDownload("mac", links.mac, false)}
      />
      <DesktopDownloadBadge
        platform="windows"
        url={links.windows}
        available={availability.windows}
        compact={!mini}
        mini={mini}
        onUnavailable={() => handleDownload("windows", links.windows, false)}
      />
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
