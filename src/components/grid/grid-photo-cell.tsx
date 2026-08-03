"use client";

import { Camera, ImagePlus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RowPhotoEntityKind } from "@/lib/grid/upload-row-photo-utils";
import { uploadGridRowPhoto } from "@/lib/grid/upload-grid-row-photo";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type GridPhotoCellProps = {
  urls: string[];
  companyId: string;
  entityKind: RowPhotoEntityKind;
  /** Stable id used for Storage path; draft rows may use rowId until saved. */
  entityId: string;
  disabled?: boolean;
  onChange: (urls: string[]) => void;
  className?: string;
};

export function GridPhotoCell({
  urls,
  companyId,
  entityKind,
  entityId,
  disabled,
  onChange,
  className,
}: GridPhotoCellProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = userCopy.gridPhotos;
  const primary = urls[0] ?? null;

  async function handleFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || disabled || !entityId.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadGridRowPhoto({
        companyId,
        entityKind,
        entityId,
        file,
      });
      onChange([...urls, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.uploadFailed);
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePrimary() {
    if (!primary || disabled) return;
    onChange(urls.slice(1));
  }

  return (
    <div
      className={cn("flex h-full w-full items-center justify-center", className)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              className={cn(
                "group relative flex size-7 items-center justify-center overflow-hidden rounded-md border border-border/80 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted",
                uploading && "opacity-60",
                disabled && "pointer-events-none opacity-40",
              )}
              aria-label={copy.attachAria}
              title={error ?? (primary ? copy.changePhoto : copy.addPhoto)}
            />
          }
        >
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primary} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {urls.length > 1 ? (
            <span className="absolute right-0 bottom-0 rounded-tl bg-background/90 px-0.5 text-[9px] leading-none text-foreground">
              {urls.length}
            </span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-40">
          {primary ? (
            <div className="mb-1 overflow-hidden rounded-md border border-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={primary} alt="" className="h-24 w-full object-cover" />
            </div>
          ) : null}
          <DropdownMenuItem
            disabled={uploading || disabled}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="size-4" />
            {copy.takePhoto}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={uploading || disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            {copy.chooseFile}
          </DropdownMenuItem>
          {primary ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={uploading || disabled}
                onClick={removePrimary}
              >
                <Trash2 className="size-4" />
                {copy.remove}
              </DropdownMenuItem>
            </>
          ) : null}
          {error ? (
            <p className="px-2 py-1.5 text-xs text-destructive">{error}</p>
          ) : null}
          {uploading ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{copy.uploading}</p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Compact empty-state control used when entity is not yet persistable. */
export function GridPhotoCellDisabledHint({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center", className)}>
      <span
        className="flex size-7 items-center justify-center rounded-md border border-dashed border-border/70 text-muted-foreground/70"
        title={userCopy.gridPhotos.saveRowFirst}
      >
        <X className="size-3 opacity-40" />
      </span>
    </div>
  );
}
