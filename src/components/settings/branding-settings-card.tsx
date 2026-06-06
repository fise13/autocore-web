"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Palette, Upload } from "lucide-react";

import { DEFAULT_COMPANY_PRIMARY_COLOR, DEFAULT_COMPANY_SECONDARY_COLOR, DOCUMENT_THEMES, DocumentTheme } from "@/domain/company-branding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import { userCopy } from "@/lib/user-copy";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  brandingDraftFromProfile,
  saveCompanyBranding,
  uploadCompanyLogo,
} from "@/infrastructure/firestore/company-branding-service";
import { cn } from "@/lib/utils";

type BrandingSettingsCardProps = {
  companyId: string;
  onStatus?: (message: string | null) => void;
};

const sectionMotion = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 32 },
  },
};

const listMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

export function BrandingSettingsCard({ companyId, onStatus }: BrandingSettingsCardProps) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const { profile, isLoading } = useCompanyBranding(normalizedCompanyId);
  const [draft, setDraft] = useState(brandingDraftFromProfile(profile));
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    if (uploadingLogo || saving) return;
    setDraft(brandingDraftFromProfile(profile));
  }, [profile, uploadingLogo, saving]);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  function setLocalPreview(file: File) {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    const nextPreview = URL.createObjectURL(file);
    previewRef.current = nextPreview;
    setLogoPreview(nextPreview);
  }

  async function handleLogoChange(file: File | null) {
    if (!file) return;

    setLocalPreview(file);
    setUploadingLogo(true);
    onStatus?.("Загружаем логотип…");

    try {
      const logoUrl = await uploadCompanyLogo(normalizedCompanyId, file);
      setDraft((current) => ({ ...current, logoUrl }));
      setLogoPreview(null);
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
      onStatus?.("Логотип загружен и сохранён.");
    } catch (error) {
      onStatus?.(
        error instanceof Error ? error.message : "Не удалось загрузить логотип",
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    onStatus?.(null);
    try {
      await saveCompanyBranding(normalizedCompanyId, draft);
      onStatus?.("Брендинг сохранён. Новые PDF будут использовать эти настройки.");
    } catch (error) {
      onStatus?.(error instanceof Error ? error.message : "Не удалось сохранить брендинг");
    } finally {
      setSaving(false);
    }
  }

  const previewSrc = logoPreview ?? draft.logoUrl ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-primary" />
          <CardTitle>Брендинг</CardTitle>
        </div>
        <CardDescription>
          Логотип, контакты и цвета компании автоматически применяются ко всем PDF-документам для клиентов.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : null}

        <motion.div variants={listMotion} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={sectionMotion} className="flex flex-wrap items-start gap-5">
            <motion.div
              layout
              className="relative flex size-24 items-center justify-center overflow-hidden rounded-2xl border bg-muted/20"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            >
              <AnimatePresence mode="wait">
                {previewSrc ? (
                  <motion.img
                    key={previewSrc}
                    src={previewSrc}
                    alt=""
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.22 }}
                    className="max-h-full max-w-full object-contain p-2"
                  />
                ) : (
                  <motion.span
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground"
                  >
                    Логотип
                  </motion.span>
                )}
              </AnimatePresence>
              {uploadingLogo ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              ) : null}
            </motion.div>
            <div className="space-y-2">
              <Label htmlFor="company-logo">Логотип компании</Label>
              <Input
                id="company-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={uploadingLogo}
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  void handleLogoChange(nextFile);
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP или SVG · до 2 МБ · автоматически сжимается для быстрой загрузки
              </p>
            </div>
          </motion.div>

          <motion.div variants={sectionMotion} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="brand-name">Название компании</Label>
            <Input
              id="brand-name"
              value={draft.legalName ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, legalName: event.target.value }))}
              placeholder="Официальное название для документов"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="brand-slogan">Слоган</Label>
            <Input
              id="brand-slogan"
              value={draft.slogan ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, slogan: event.target.value }))}
              placeholder="Премиальный сервис · честная гарантия"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-phone">Телефон</Label>
            <Input
              id="brand-phone"
              value={draft.phone ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+7 (700) 000-00-00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-email">{userCopy.account.emailLabel}</Label>
            <Input
              id="brand-email"
              type="email"
              value={draft.email ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder="service@company.kz"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="brand-address">Адрес</Label>
            <Input
              id="brand-address"
              value={draft.address ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
              placeholder="г. Алматы, ул. Примерная, 10"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="brand-website">Сайт</Label>
            <Input
              id="brand-website"
              value={draft.website ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))}
              placeholder="https://company.kz"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="brand-social">Соцсеть / Instagram</Label>
            <Input
              id="brand-social"
              value={draft.socialHandle ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, socialHandle: event.target.value }))}
              placeholder="@company"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-primary">Основной цвет</Label>
            <div className="flex items-center gap-2">
              <input
                id="brand-primary"
                type="color"
                value={draft.primaryColor ?? DEFAULT_COMPANY_PRIMARY_COLOR}
                onChange={(event) => setDraft((current) => ({ ...current, primaryColor: event.target.value }))}
                className="size-10 cursor-pointer rounded-md border bg-transparent p-1"
              />
              <Input
                value={draft.primaryColor ?? DEFAULT_COMPANY_PRIMARY_COLOR}
                onChange={(event) => setDraft((current) => ({ ...current, primaryColor: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-secondary">Дополнительный цвет</Label>
            <div className="flex items-center gap-2">
              <input
                id="brand-secondary"
                type="color"
                value={draft.secondaryColor ?? DEFAULT_COMPANY_SECONDARY_COLOR}
                onChange={(event) => setDraft((current) => ({ ...current, secondaryColor: event.target.value }))}
                className="size-10 cursor-pointer rounded-md border bg-transparent p-1"
              />
              <Input
                value={draft.secondaryColor ?? DEFAULT_COMPANY_SECONDARY_COLOR}
                onChange={(event) => setDraft((current) => ({ ...current, secondaryColor: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="brand-document-theme">Тема PDF-документов</Label>
            <div className="relative flex flex-wrap gap-2">
              {DOCUMENT_THEMES.map((theme) => {
                const selected = (draft.documentTheme ?? "modern") === theme;
                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, documentTheme: theme as DocumentTheme }))}
                    className={cn(
                      "relative rounded-lg border px-3 py-2 text-sm transition-colors",
                      selected ? "text-primary" : "hover:bg-muted",
                    )}
                  >
                    {selected ? (
                      <motion.span
                        layoutId="brand-theme-pill"
                        className="absolute inset-0 rounded-lg border border-primary bg-primary/10"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <span className="relative z-10">
                      {theme === "classic" ? "Классика" : theme === "modern" ? "Современная" : "Премиум"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div variants={sectionMotion} className="space-y-4 rounded-2xl border bg-muted/10 p-4">
          <div>
            <p className="text-sm font-semibold">PDF для клиентов</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Гарантия, регламент ТО и юридический текст — появятся в сервисном отчёте.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="brand-warranty-label">Заголовок гарантии</Label>
              <Input
                id="brand-warranty-label"
                value={draft.warrantyLabel ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, warrantyLabel: event.target.value }))}
                placeholder="ГАРАНТИЯ 60 ДНЕЙ"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="brand-warranty-text">Условия гарантии</Label>
              <Textarea
                id="brand-warranty-text"
                value={draft.warrantyText ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, warrantyText: event.target.value }))}
                placeholder="Каждый абзац — с новой строки. Условия эксплуатации, ограничения, порядок обращения."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-interval-km">Интервал ТО, км</Label>
              <Input
                id="brand-interval-km"
                type="number"
                min={1}
                value={draft.serviceIntervalKm ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, serviceIntervalKm: event.target.value }))}
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-interval-months">Интервал ТО, мес</Label>
              <Input
                id="brand-interval-months"
                type="number"
                min={1}
                value={draft.serviceIntervalMonths ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, serviceIntervalMonths: event.target.value }))
                }
                placeholder="6"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={sectionMotion}
          className="rounded-2xl border bg-white p-4 dark:bg-card"
          layout
        >
          <div className="flex items-start gap-4">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="" className="max-h-10 max-w-[100px] object-contain" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{draft.legalName || profile.name || "Название компании"}</p>
              {draft.slogan ? <p className="mt-1 text-xs text-muted-foreground">{draft.slogan}</p> : null}
              {draft.warrantyLabel ? (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-red-600">{draft.warrantyLabel}</p>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Предпросмотр шапки PDF</p>
        </motion.div>

        <motion.div variants={sectionMotion}>
          <Button onClick={() => void handleSave()} disabled={saving || isLoading || uploadingLogo}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Сохраняем…
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Сохранить брендинг
              </>
            )}
          </Button>
        </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
