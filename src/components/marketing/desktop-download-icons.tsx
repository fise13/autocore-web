import { Apple } from "lucide-react";

import { getDesktopDownloadLinks } from "@/lib/desktop/desktop-downloads";
import { cn } from "@/lib/utils";

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M3 5.5 10.5 4.5V11H3V5.5Zm0 7.5h7.5v6.5L3 18.5V13Zm9-8.5L21 3.5V11H12V4.5Zm0 7.5H21v7.5l-9-1.5V12Z" />
    </svg>
  );
}

type DesktopDownloadIconsProps = {
  className?: string;
};

/** macOS / Windows download links — icon-only, for footer. */
export function DesktopDownloadIcons({ className }: DesktopDownloadIconsProps) {
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
