"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOBILE_UNIVERSAL_LINKS_HOST } from "@/lib/mobile/universal-links";

type ImportPhoneQrSheetProps = {
  batchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function buildImportBatchUniversalUrl(batchId: string): string {
  return `https://${MOBILE_UNIVERSAL_LINKS_HOST}/import?batchId=${encodeURIComponent(batchId)}`;
}

export function ImportPhoneQrSheet({ batchId, open, onOpenChange }: ImportPhoneQrSheetProps) {
  const url = batchId ? buildImportBatchUniversalUrl(batchId) : "";
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(url, { width: 220, margin: 1, errorCorrectionLevel: "M" }).then(
      (value) => {
        if (!cancelled) setDataUrl(value);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5" />
            Продолжить на телефоне
          </DialogTitle>
          <DialogDescription>
            Отсканируйте QR в приложении AutoCore — фото сразу попадут в эту сессию на компьютере.
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- generated QR data URL
                <img src={dataUrl} alt="QR для импорта" width={200} height={200} />
              ) : (
                <div className="size-[200px] animate-pulse rounded-lg bg-muted" />
              )}
            </div>
            <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
            <p className="text-center text-sm text-muted-foreground">
              Нужен вход в тот же аккаунт. Гостевая загрузка без приложения не используется.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
