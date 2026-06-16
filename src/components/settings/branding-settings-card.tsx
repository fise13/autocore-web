"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  FileStack,
  ImageUp,
  LayoutTemplate,
  ScanLine,
  Loader2,
  Palette,
  PanelTop,
  Save,
  Shield,
} from "lucide-react";

import { BrandingColorField } from "@/components/settings/branding/branding-color-field";
import { BrandingLivePreview } from "@/components/settings/branding/branding-live-preview";
import { BrandingSection } from "@/components/settings/branding/branding-section";
import { BrandingThemePicker } from "@/components/settings/branding/branding-theme-picker";
import { DocumentHeaderSettings } from "@/components/settings/document-header-settings";
import { DocumentWatermarkSettings } from "@/components/settings/document-watermark-settings";
import {
  DEFAULT_COMPANY_PRIMARY_COLOR,
  DEFAULT_COMPANY_SECONDARY_COLOR,
  DocumentTheme,
} from "@/domain/company-branding";
import {
  clampLogoMaxHeightMm,
  DEFAULT_DOCUMENT_HEADER_VISIBILITY,
  defaultHeaderColorsForTheme,
  defaultLogoMaxHeightForTheme,
  LOGO_MAX_HEIGHT_MAX_MM,
  LOGO_MAX_HEIGHT_MIN_MM,
} from "@/domain/document-header-config";
import {
  defaultWatermarkForTheme,
  ensureDocumentWatermarkConfig,
} from "@/domain/document-watermark-config";
import {
  DEFAULT_DOCUMENT_CONFIG_DRAFT,
  DocumentConfigSettings,
  type DocumentConfigDraft,
} from "@/components/settings/document-config-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type BrandingTab = "identity" | "appearance" | "header" | "documents";

const listMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.03 },
  },
};

const tabMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export function BrandingSettingsCard({ companyId, onStatus }: BrandingSettingsCardProps) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const { profile, isLoading } = useCompanyBranding(normalizedCompanyId);
  const [draft, setDraft] = useState(brandingDraftFromProfile(profile));
  const [docConfig, setDocConfig] = useState<DocumentConfigDraft>(() => ({
    ...DEFAULT_DOCUMENT_CONFIG_DRAFT,
    warrantyTemplateId: profile.warrantyTemplateId ?? "contract_engine",
    documentSections: profile.documentSections ?? {},
    qrLinkUrl: profile.qrLinkUrl ?? "",
    documentFooter: profile.documentFooter ?? "",
    invoiceValidityDays: profile.invoiceValidityDays ? String(profile.invoiceValidityDays) : "5",
  }));
  const [activeTab, setActiveTab] = useState<BrandingTab>("identity");
  const [tabEpoch, setTabEpoch] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    if (uploadingLogo || saving) return;
    setDraft(brandingDraftFromProfile(profile));
    setDocConfig({
      ...DEFAULT_DOCUMENT_CONFIG_DRAFT,
      warrantyTemplateId: profile.warrantyTemplateId ?? "contract_engine",
      documentSections: profile.documentSections ?? {},
      qrLinkUrl: profile.qrLinkUrl ?? "",
      documentFooter: profile.documentFooter ?? "",
      invoiceValidityDays: profile.invoiceValidityDays ? String(profile.invoiceValidityDays) : "5",
      customWarrantyMonths: profile.customWarrantyMonths ? String(profile.customWarrantyMonths) : "",
      customWarrantyKm: profile.customWarrantyKm ? String(profile.customWarrantyKm) : "",
    });
  }, [profile, uploadingLogo, saving]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function setLocalPreview(file: File) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
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
      onStatus?.(error instanceof Error ? error.message : "Не удалось загрузить логотип");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    onStatus?.(null);
    try {
      await saveCompanyBranding(normalizedCompanyId, { ...draft, ...docConfig });
      onStatus?.("Брендинг сохранён. Новые PDF будут использовать эти настройки.");
    } catch (error) {
      onStatus?.(error instanceof Error ? error.message : "Не удалось сохранить брендинг");
    } finally {
      setSaving(false);
    }
  }

  function handleTabChange(value: string) {
    setActiveTab(value as BrandingTab);
    setTabEpoch((current) => current + 1);
  }

  function handleThemeChange(theme: DocumentTheme) {
    const nextDefaults = defaultHeaderColorsForTheme(theme);
    const nextWatermarkDefaults = defaultWatermarkForTheme(theme);
    setDraft((current) => {
      const currentTheme = current.documentTheme ?? "modern";
      const currentWatermark = ensureDocumentWatermarkConfig(current.documentWatermark, currentTheme);
      const shouldApplyThemeWatermark =
        theme === "racing" && currentWatermark.type === "none";

      return {
        ...current,
        documentTheme: theme,
        headerBackgroundColor: nextDefaults.headerBackgroundColor,
        headerTextColor: nextDefaults.headerTextColor,
        documentWatermark: shouldApplyThemeWatermark
          ? nextWatermarkDefaults
          : current.documentWatermark ?? nextWatermarkDefaults,
      };
    });
  }

  const previewSrc = logoPreview ?? draft.logoUrl ?? null;
  const activeTheme = draft.documentTheme ?? "modern";
  const themeHeaderDefaults = defaultHeaderColorsForTheme(activeTheme);
  const headerVisibility = draft.documentHeaderVisibility ?? DEFAULT_DOCUMENT_HEADER_VISIBILITY;
  const logoMaxHeightMm = clampLogoMaxHeightMm(
    draft.headerLogoMaxHeightMm
      ? Number(draft.headerLogoMaxHeightMm)
      : defaultLogoMaxHeightForTheme(activeTheme),
    activeTheme,
  );
  const watermarkConfig = ensureDocumentWatermarkConfig(draft.documentWatermark, activeTheme);

  const previewInput = useMemo(
    () => ({
      companyName: draft.legalName || profile.name || "Название компании",
      shortName: draft.shortName,
      slogan: draft.slogan,
      address: draft.address,
      phone: draft.phone,
      email: draft.email,
      website: draft.website,
      logoUrl: previewSrc,
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      headerBackgroundColor: draft.headerBackgroundColor ?? themeHeaderDefaults.headerBackgroundColor,
      headerTextColor: draft.headerTextColor ?? themeHeaderDefaults.headerTextColor,
      headerLogoMaxHeightMm: logoMaxHeightMm,
      documentWatermark: watermarkConfig,
      documentTheme: activeTheme,
      visibility: headerVisibility,
      showServiceLogbook: draft.showServiceLogbook !== false,
      warrantyTemplateId: docConfig.warrantyTemplateId,
      warrantyLabel: draft.warrantyLabel,
      warrantyText: draft.warrantyText,
    }),
    [draft, docConfig.warrantyTemplateId, profile.name, previewSrc, themeHeaderDefaults, activeTheme, headerVisibility, logoMaxHeightMm, watermarkConfig],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border bg-card/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Загружаем брендинг…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl space-y-1">
            <div className="flex items-center gap-2">
              <Palette className="size-5 text-primary" />
              <h3 className="text-lg font-semibold tracking-tight">Брендинг PDF</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Настройте фирменный стиль один раз — все заказ-наряды, акты и гарантии для клиентов будут
              собираться автоматически с вашим логотипом и цветами.
            </p>
          </div>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || uploadingLogo}
            className="shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Сохраняем…
              </>
            ) : (
              <>
                <Save className="size-4" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_min(400px,36%)] xl:items-start">
        <div className="order-2 min-w-0 xl:order-1">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList variant="line" className="h-auto w-max min-w-full justify-start gap-1 bg-transparent p-0">
                <TabsTrigger value="identity" className="cursor-pointer gap-1.5 px-3 py-2 text-xs sm:text-sm">
                  <Building2 className="size-3.5" />
                  Компания
                </TabsTrigger>
                <TabsTrigger value="appearance" className="cursor-pointer gap-1.5 px-3 py-2 text-xs sm:text-sm">
                  <LayoutTemplate className="size-3.5" />
                  Оформление
                </TabsTrigger>
                <TabsTrigger value="header" className="cursor-pointer gap-1.5 px-3 py-2 text-xs sm:text-sm">
                  <PanelTop className="size-3.5" />
                  Шапка
                </TabsTrigger>
                <TabsTrigger value="documents" className="cursor-pointer gap-1.5 px-3 py-2 text-xs sm:text-sm">
                  <FileStack className="size-3.5" />
                  Документы
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="identity" className="mt-0 outline-none">
              <motion.div
                key={`identity-${tabEpoch}`}
                variants={tabMotion}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="motion-reduce:transform-none"
              >
                <motion.div variants={listMotion} initial="hidden" animate="show" className="space-y-4">
                    <BrandingSection
                      icon={ImageUp}
                      title="Логотип"
                      description="Загрузите логотип — он появится в шапке PDF. Без логотипа показывается название компании."
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="relative mx-auto flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted/20 sm:mx-0">
                          {previewSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewSrc} alt="" className="max-h-full max-w-full object-contain p-3" />
                          ) : (
                            <span className="text-xs text-muted-foreground">Нет логотипа</span>
                          )}
                          {uploadingLogo ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/75">
                              <Loader2 className="size-5 animate-spin text-primary" />
                            </div>
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <Label htmlFor="company-logo">Файл логотипа</Label>
                          <Input
                            id="company-logo"
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            disabled={uploadingLogo}
                            className="cursor-pointer"
                            onChange={(event) => {
                              const nextFile = event.target.files?.[0] ?? null;
                              void handleLogoChange(nextFile);
                              event.target.value = "";
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, WebP или SVG · до 2 МБ · сжимается автоматически
                          </p>
                          {previewSrc ? (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="logo-size">Размер в шапке PDF</Label>
                                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                  {logoMaxHeightMm} мм
                                </span>
                              </div>
                              <input
                                id="logo-size"
                                type="range"
                                min={LOGO_MAX_HEIGHT_MIN_MM}
                                max={LOGO_MAX_HEIGHT_MAX_MM}
                                step={1}
                                value={logoMaxHeightMm}
                                className="h-2 w-full cursor-pointer accent-primary"
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...current,
                                    headerLogoMaxHeightMm: event.target.value,
                                  }))
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Высота логотипа в шапке документов. Ширина подстраивается автоматически.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </BrandingSection>

                    <BrandingSection
                      icon={Building2}
                      title="Данные компании"
                      description="Эти поля попадают в шапку и контактный блок PDF-документов."
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="brand-name">Название компании</Label>
                          <Input
                            id="brand-name"
                            value={draft.legalName ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, legalName: event.target.value }))
                            }
                            placeholder="Официальное название для документов"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="brand-short-name">Короткое название</Label>
                          <Input
                            id="brand-short-name"
                            value={draft.shortName ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, shortName: event.target.value }))
                            }
                            placeholder="Краткое имя в шапке"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="brand-slogan">Слоган</Label>
                          <Input
                            id="brand-slogan"
                            value={draft.slogan ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, slogan: event.target.value }))
                            }
                            placeholder="Премиальный сервис · честная гарантия"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="brand-phone">Телефон</Label>
                          <Input
                            id="brand-phone"
                            value={draft.phone ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, phone: event.target.value }))
                            }
                            placeholder="+7 (700) 000-00-00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="brand-email">{userCopy.account.emailLabel}</Label>
                          <Input
                            id="brand-email"
                            type="email"
                            value={draft.email ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, email: event.target.value }))
                            }
                            placeholder="service@company.kz"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="brand-address">Адрес</Label>
                          <Input
                            id="brand-address"
                            value={draft.address ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, address: event.target.value }))
                            }
                            placeholder="г. Алматы, ул. Примерная, 10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="brand-website">Сайт</Label>
                          <Input
                            id="brand-website"
                            value={draft.website ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, website: event.target.value }))
                            }
                            placeholder="https://company.kz"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="brand-social">Соцсеть</Label>
                          <Input
                            id="brand-social"
                            value={draft.socialHandle ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, socialHandle: event.target.value }))
                            }
                            placeholder="@company"
                          />
                        </div>
                      </div>
                    </BrandingSection>
                </motion.div>
              </motion.div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0 outline-none">
              <motion.div
                key={`appearance-${tabEpoch}`}
                variants={tabMotion}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="motion-reduce:transform-none"
              >
                <motion.div variants={listMotion} initial="hidden" animate="show" className="space-y-4">
                    <BrandingSection
                      icon={LayoutTemplate}
                      title="Тема документов"
                      description="Выберите визуальный стиль PDF. Цвета шапки подстроятся под тему, их можно изменить ниже."
                    >
                      <BrandingThemePicker
                        value={activeTheme}
                        brandColor={draft.primaryColor ?? DEFAULT_COMPANY_PRIMARY_COLOR}
                        onChange={handleThemeChange}
                      />
                    </BrandingSection>

                    <BrandingSection
                      icon={ScanLine}
                      title="Фон документа"
                      description="Корпоративный водяной знак на всю страницу PDF — как у заводских motorsport и инженерных компаний."
                    >
                      <DocumentWatermarkSettings
                        value={watermarkConfig}
                        hasLogo={Boolean(previewSrc)}
                        onChange={(next) =>
                          setDraft((current) => ({ ...current, documentWatermark: next }))
                        }
                      />
                    </BrandingSection>

                    <BrandingSection
                      icon={Palette}
                      title="Цвета бренда"
                      description="Основной цвет — акцент в шапке и элементах документа."
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <BrandingColorField
                          id="brand-primary"
                          label="Цвет бренда"
                          value={draft.primaryColor ?? DEFAULT_COMPANY_PRIMARY_COLOR}
                          onChange={(value) => setDraft((current) => ({ ...current, primaryColor: value }))}
                        />
                        <BrandingColorField
                          id="brand-secondary"
                          label="Дополнительный"
                          hint="Акценты в таблицах и блоках"
                          value={draft.secondaryColor ?? DEFAULT_COMPANY_SECONDARY_COLOR}
                          onChange={(value) => setDraft((current) => ({ ...current, secondaryColor: value }))}
                        />
                        <BrandingColorField
                          id="brand-header-bg"
                          label="Фон шапки"
                          value={draft.headerBackgroundColor ?? themeHeaderDefaults.headerBackgroundColor}
                          onChange={(value) =>
                            setDraft((current) => ({ ...current, headerBackgroundColor: value }))
                          }
                        />
                        <BrandingColorField
                          id="brand-header-text"
                          label="Текст шапки"
                          value={draft.headerTextColor ?? themeHeaderDefaults.headerTextColor}
                          onChange={(value) =>
                            setDraft((current) => ({ ...current, headerTextColor: value }))
                          }
                        />
                      </div>
                    </BrandingSection>
                </motion.div>
              </motion.div>
            </TabsContent>

            <TabsContent value="header" className="mt-0 outline-none">
              <motion.div
                key={`header-${tabEpoch}`}
                variants={tabMotion}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="motion-reduce:transform-none"
              >
                <BrandingSection
                    icon={PanelTop}
                    title="Шапка PDF"
                    description="Управляйте видимостью шапки и отдельных элементов. Изменения видны в превью справа."
                  >
                    <DocumentHeaderSettings
                      visibility={headerVisibility}
                      onChange={(next) =>
                        setDraft((current) => ({ ...current, documentHeaderVisibility: next }))
                      }
                    />
                </BrandingSection>
              </motion.div>
            </TabsContent>

            <TabsContent value="documents" className="mt-0 outline-none">
              <motion.div
                key={`documents-${tabEpoch}`}
                variants={tabMotion}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="motion-reduce:transform-none"
              >
                <motion.div variants={listMotion} initial="hidden" animate="show" className="space-y-4">
                    <BrandingSection
                      icon={FileStack}
                      title="Секции и шаблоны"
                      description="Какие блоки включать в PDF и куда ведёт QR-код."
                    >
                      <DocumentConfigSettings draft={docConfig} onChange={setDocConfig} />
                    </BrandingSection>

                    <BrandingSection
                      icon={Shield}
                      title="Гарантия и регламент"
                      description="Текст появится в сервисном отчёте и гарантийных документах."
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 sm:col-span-2">
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 rounded border-input"
                            checked={draft.showServiceLogbook !== false}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                showServiceLogbook: event.target.checked,
                              }))
                            }
                          />
                          <span className="space-y-1">
                            <span className="block text-sm font-medium">Бортжурнал в заказ-наряде</span>
                            <span className="block text-xs text-muted-foreground">
                              Показывать историю обслуживания в racing-теме. Если выключено — блок работ и данные
                              двигателя занимают всю страницу.
                            </span>
                          </span>
                        </label>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="brand-warranty-label">Заголовок гарантии</Label>
                          <Input
                            id="brand-warranty-label"
                            value={draft.warrantyLabel ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, warrantyLabel: event.target.value }))
                            }
                            placeholder="ГАРАНТИЯ 60 ДНЕЙ"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="brand-warranty-text">Условия гарантии</Label>
                          <Textarea
                            id="brand-warranty-text"
                            value={draft.warrantyText ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, warrantyText: event.target.value }))
                            }
                            placeholder="Каждый абзац — с новой строки"
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
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, serviceIntervalKm: event.target.value }))
                            }
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
                              setDraft((current) => ({
                                ...current,
                                serviceIntervalMonths: event.target.value,
                              }))
                            }
                            placeholder="6"
                          />
                        </div>
                      </div>
                    </BrandingSection>
                </motion.div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="order-1 xl:sticky xl:top-4 xl:order-2 xl:self-start">
          <BrandingLivePreview input={previewInput} />
        </aside>
      </div>

      <div
        className={cn(
          "sticky bottom-3 z-10 flex justify-end rounded-xl border bg-background/90 p-3 shadow-lg backdrop-blur-sm",
          "xl:static xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-none",
        )}
      >
        <Button
          onClick={() => void handleSave()}
          disabled={saving || uploadingLogo}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Сохраняем брендинг…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Сохранить брендинг
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
