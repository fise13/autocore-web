import { Apple, Download, Monitor } from "lucide-react";

import { getDesktopDownloadLinks } from "@/lib/desktop/desktop-downloads";
import { cn } from "@/lib/utils";

type DesktopDownloadButtonsProps = {
  compact?: boolean;
  variant?: "default" | "marketing";
  className?: string;
};

export function DesktopDownloadButtons({
  compact = false,
  variant = "default",
  className = "",
}: DesktopDownloadButtonsProps) {
  const links = getDesktopDownloadLinks();
  const isMarketing = variant === "marketing";

  const buttonClass = cn(
    "inline-flex h-11 items-center justify-center gap-2.5 rounded-xl px-5 text-sm font-medium transition",
    isMarketing
      ? "border border-border/60 bg-background/80 shadow-sm hover:border-border hover:bg-background"
      : "border border-border/70 bg-background hover:border-border hover:bg-muted/40",
  );

  return (
    <div className={className}>
      {!compact ? (
        <p
          className={cn(
            "mb-4 max-w-xl text-sm leading-relaxed",
            isMarketing ? "text-muted-foreground" : "text-muted-foreground",
          )}
        >
          Скачайте AutoCore для macOS или Windows — приложение открывает ваше рабочее пространство на Vercel.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <a href={links.mac} download className={buttonClass}>
          <Apple className="size-4 shrink-0" aria-hidden />
          {compact ? "macOS" : "Скачать для macOS"}
        </a>
        <a href={links.windows} download className={buttonClass}>
          <Monitor className="size-4 shrink-0" aria-hidden />
          {compact ? "Windows" : "Скачать для Windows"}
        </a>
      </div>

      {!compact ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Download className="size-3.5 shrink-0" aria-hidden />
          Подключается к{" "}
          <span className="font-medium text-foreground/80">
            {links.appLoginUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
          </span>
        </p>
      ) : null}
    </div>
  );
}
