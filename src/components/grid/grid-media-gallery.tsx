"use client";

import { Film } from "lucide-react";

import { isVideoMediaUrl } from "@/lib/grid/upload-row-photo-utils";
import { cn } from "@/lib/utils";

export function GridMediaThumb({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  if (isVideoMediaUrl(url)) {
    return (
      <span className={cn("relative flex size-full items-center justify-center bg-zinc-900 text-white", className)}>
        <video src={url} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover opacity-70" />
        <Film className="relative size-3.5 drop-shadow" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={cn("size-full object-cover", className)} />;
}
