import { Apple, Download, Monitor } from "lucide-react";

import { getDesktopDownloadLinks } from "@/lib/desktop/desktop-downloads";

type DesktopDownloadButtonsProps = {
  compact?: boolean;
  className?: string;
};

export function DesktopDownloadButtons({
  compact = false,
  className = "",
}: DesktopDownloadButtonsProps) {
  const links = getDesktopDownloadLinks();

  return (
    <div className={className}>
      {!compact ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Нативное приложение для macOS и Windows — тот же интерфейс, что на Vercel.
        </p>
      ) : null}

      <div className={`flex flex-wrap gap-2.5 ${compact ? "" : "sm:gap-3"}`}>
        <a
          href={links.mac}
          download
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-background px-4 text-sm font-medium transition hover:border-border hover:bg-muted/40"
        >
          <Apple className="size-4 shrink-0" aria-hidden />
          {compact ? "macOS" : "Скачать для macOS"}
        </a>
        <a
          href={links.windows}
          download
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-background px-4 text-sm font-medium transition hover:border-border hover:bg-muted/40"
        >
          <Monitor className="size-4 shrink-0" aria-hidden />
          {compact ? "Windows" : "Скачать для Windows"}
        </a>
      </div>

      {!compact ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Download className="size-3.5 shrink-0" aria-hidden />
          Приложение открывает{" "}
          <span className="font-medium text-foreground/80">
            {links.appLoginUrl.replace(/^https?:\/\//, "")}
          </span>
        </p>
      ) : null}
    </div>
  );
}
