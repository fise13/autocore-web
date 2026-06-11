"use client";

import {
  Calendar,
  EyeOff,
  Globe,
  Hash,
  Image,
  Mail,
  Phone,
  QrCode,
  Type,
} from "lucide-react";

import {
  DEFAULT_DOCUMENT_HEADER_VISIBILITY,
  DocumentHeaderVisibility,
} from "@/domain/document-header-config";
import { cn } from "@/lib/utils";

const HEADER_ELEMENT_FIELDS: Array<{
  key: Exclude<keyof DocumentHeaderVisibility, "showHeader">;
  label: string;
  icon: typeof Image;
}> = [
  { key: "showLogo", label: "Логотип", icon: Image },
  { key: "showCompanyName", label: "Название", icon: Type },
  { key: "showPhone", label: "Телефон", icon: Phone },
  { key: "showEmail", label: "Email", icon: Mail },
  { key: "showWebsite", label: "Сайт", icon: Globe },
  { key: "showQr", label: "QR-код", icon: QrCode },
  { key: "showDocumentNumber", label: "Номер", icon: Hash },
  { key: "showDate", label: "Дата", icon: Calendar },
];

type DocumentHeaderSettingsProps = {
  visibility: DocumentHeaderVisibility;
  onChange: (next: DocumentHeaderVisibility) => void;
};

export function DocumentHeaderSettings({ visibility, onChange }: DocumentHeaderSettingsProps) {
  const headerEnabled = visibility.showHeader;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() =>
          onChange({
            ...DEFAULT_DOCUMENT_HEADER_VISIBILITY,
            ...visibility,
            showHeader: !headerEnabled,
          })
        }
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-200",
          headerEnabled
            ? "border-primary/30 bg-primary/5"
            : "border-dashed bg-muted/20 hover:bg-muted/30",
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg",
              headerEnabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <EyeOff className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{headerEnabled ? "Шапка включена" : "Шапка скрыта"}</p>
            <p className="text-xs text-muted-foreground">
              {headerEnabled
                ? "Отключите, чтобы убрать шапку из всех PDF"
                : "Включите, чтобы вернуть фирменную шапку"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            headerEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {headerEnabled ? "Вкл" : "Выкл"}
        </span>
      </button>

      {headerEnabled ? (
        <>
          <p className="text-xs text-muted-foreground">Элементы внутри шапки</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {HEADER_ELEMENT_FIELDS.map((field) => {
              const active = visibility[field.key];
              const Icon = field.icon;
              return (
                <button
                  key={field.key}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...DEFAULT_DOCUMENT_HEADER_VISIBILITY,
                      ...visibility,
                      [field.key]: !active,
                    })
                  }
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors duration-200",
                    active
                      ? "border-primary/30 bg-primary/5 text-foreground"
                      : "border-border/70 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "opacity-60")} />
                  <span className="font-medium">{field.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Если логотип не загружен, в шапке автоматически показывается название компании.
          </p>
        </>
      ) : null}
    </div>
  );
}
