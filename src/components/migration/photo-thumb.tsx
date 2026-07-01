"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { ImageAsset } from "@/lib/import";

/** Renders an in-memory ImageAsset, managing the object URL lifecycle. */
export function PhotoThumb({
  asset,
  className,
  alt,
}: {
  asset: ImageAsset;
  className?: string;
  alt?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(new Blob([asset.bytes], { type: asset.mimeType }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [asset]);

  if (!url) {
    return <span className={cn("block animate-pulse rounded-md bg-muted", className)} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt ?? asset.fileName} className={cn("rounded-md object-cover", className)} />;
}
