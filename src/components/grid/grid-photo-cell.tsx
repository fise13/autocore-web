"use client";

import { Camera, Eye, Film, ImagePlus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

import { GridMediaGallery, GridMediaThumb } from "@/components/grid/grid-media-gallery";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  assertRowMediaCount,
  MAX_ROW_MEDIA_ITEMS,
  type RowPhotoEntityKind,
} from "@/lib/grid/upload-row-photo-utils";
import { uploadGridRowPhotos } from "@/lib/grid/upload-grid-row-photo";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const copy = userCopy.gridPhotos;
  const primary = urls[0] ?? null;

  /** Open the native picker while still inside the user gesture.
   *  Base UI closes the menu first by default, which cancels input.click(). */
  function openPicker(input: HTMLInputElement | null) {
    if (!input || disabled || uploading) return;
    input.click();
    setMenuOpen(false);
  }

  async function handleFiles(fileList: FileList | null) {
    const files = fileList ? [...fileList] : [];
    if (files.length === 0 || disabled || !entityId.trim()) return;

    setUploading(true);
    setError(null);
    setProgress(null);
    try {
      assertRowMediaCount(urls.length, files.length);
      const uploaded = await uploadGridRowPhotos({
        companyId,
        entityKind,
        entityId,
        files,
        onProgress: (done, total) => {
          setProgress(copy.uploadProgress(done, total));
        },
      });
      onChange([...urls, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.uploadFailed);
    } finally {
      setUploading(false);
      setProgress(null);
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
      className={cn("flex h-full w-full items-center justify-center gap-1", className)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
            <GridMediaThumb url={primary} />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {urls.length > 1 ? (
            <span className="absolute right-0 bottom-0 rounded-tl bg-background/90 px-0.5 text-[9px] leading-none text-foreground">
              {urls.length}
            </span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          {primary ? (
            <div className="mb-1 overflow-hidden rounded-md border border-border/60">
              <div className="relative h-24 w-full">
                <GridMediaThumb url={primary} />
              </div>
            </div>
          ) : null}
          {urls.length > 0 ? (
            <DropdownMenuItem
              disabled={uploading}
              onClick={() => {
                setMenuOpen(false);
                setGalleryOpen(true);
              }}
            >
              <Eye className="size-4" />
              {copy.viewAll}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            closeOnClick={false}
            disabled={uploading || disabled || urls.length >= MAX_ROW_MEDIA_ITEMS}
            onClick={() => openPicker(cameraInputRef.current)}
          >
            <Camera className="size-4" />
            {copy.takePhoto}
          </DropdownMenuItem>
          <DropdownMenuItem
            closeOnClick={false}
            disabled={uploading || disabled || urls.length >= MAX_ROW_MEDIA_ITEMS}
            onClick={() => openPicker(fileInputRef.current)}
          >
            <ImagePlus className="size-4" />
            {copy.chooseFiles}
          </DropdownMenuItem>
          <DropdownMenuItem
            closeOnClick={false}
            disabled={uploading || disabled || urls.length >= MAX_ROW_MEDIA_ITEMS}
            onClick={() => openPicker(fileInputRef.current)}
          >
            <Film className="size-4" />
            {copy.chooseVideo}
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
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {progress ?? copy.uploading}
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {urls.length > 0 ? (
        <button
          type="button"
          className="rounded border border-border/70 bg-background/80 px-1 py-0.5 text-[10px] font-medium text-foreground/80 hover:bg-muted"
          onClick={() => setGalleryOpen(true)}
          title={copy.viewAll}
        >
          {copy.view}
        </button>
      ) : null}

      {galleryOpen ? (
        <GridMediaGallery
          open
          onOpenChange={setGalleryOpen}
          urls={urls}
          canEdit={!disabled}
          onChange={onChange}
        />
      ) : null}
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
