"use client";

import { motion } from "motion/react";
import { FileText, Shield } from "lucide-react";

import {
  DOCUMENT_SECTION_KEYS,
  DocumentSectionConfig,
  WARRANTY_TEMPLATE_IDS,
  type WarrantyTemplateId,
  type DocumentSectionKey,
} from "@/domain/document-config";
import { WARRANTY_TEMPLATE_PRESETS } from "@/lib/documents/warranty/warranty-templates";
import { formatWarrantyDurationLabel } from "@/lib/documents/warranty/custom-warranty";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

export type DocumentConfigDraft = {
  documentSections: DocumentSectionConfig;
  warrantyTemplateId: WarrantyTemplateId;
  customWarrantyDays: string;
  customWarrantyKm: string;
  qrLinkUrl: string;
  documentFooter: string;
  invoiceValidityDays: string;
};

export const DEFAULT_DOCUMENT_CONFIG_DRAFT: DocumentConfigDraft = {
  documentSections: {},
  warrantyTemplateId: "contract_engine",
  customWarrantyDays: "",
  customWarrantyKm: "",
  qrLinkUrl: "",
  documentFooter: "",
  invoiceValidityDays: "5",
};

type DocumentConfigSettingsProps = {
  draft: DocumentConfigDraft;
  onChange: (next: DocumentConfigDraft) => void;
};

const CONFIGURABLE_SECTIONS = DOCUMENT_SECTION_KEYS.filter((key) =>
  ["vehicle", "engine", "transmission", "labor", "parts", "warranty", "photos", "diagnostics", "vehicle_history", "aggregate_history", "recommendations", "qr", "signatures", "totals"].includes(key),
);

export function DocumentConfigSettings({ draft, onChange }: DocumentConfigSettingsProps) {
  function toggleSection(key: keyof DocumentSectionConfig, enabled: boolean) {
    onChange({
      ...draft,
      documentSections: { ...draft.documentSections, [key]: enabled },
    });
  }

  function isSectionOn(key: keyof DocumentSectionConfig): boolean {
    return draft.documentSections[key] !== false;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <Label className="text-sm font-medium">{userCopy.settings.documentConfig.sectionsTitle}</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          {userCopy.settings.documentConfig.sectionsHint}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONFIGURABLE_SECTIONS.map((key) => (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                isSectionOn(key) ? "border-primary/30 bg-primary/5" : "opacity-70",
              )}
            >
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={isSectionOn(key)}
                onChange={(event) => toggleSection(key, event.target.checked)}
              />
              <span>{userCopy.settings.documentConfig.sectionLabels[key as DocumentSectionKey]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          <Label className="text-sm font-medium">{userCopy.settings.documentConfig.warrantyTemplate}</Label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {WARRANTY_TEMPLATE_IDS.map((id) => {
            const preset = WARRANTY_TEMPLATE_PRESETS[id];
            const selected = draft.warrantyTemplateId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ ...draft, warrantyTemplateId: id })}
                className={cn(
                  "relative rounded-xl border p-3 text-left transition-colors",
                  selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId="warranty-template-pill"
                    className="absolute inset-0 rounded-xl border border-primary/40"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10 block text-sm font-medium">{preset.name}</span>
                <span className="relative z-10 mt-1 block text-xs text-muted-foreground">
                  {id === "custom"
                    ? draft.customWarrantyDays && draft.customWarrantyKm
                      ? formatWarrantyDurationLabel(
                          Number(draft.customWarrantyDays),
                          Number(draft.customWarrantyKm),
                        )
                      : userCopy.settings.documentConfig.specifyWarranty
                    : preset.days > 0
                      ? userCopy.settings.documentConfig.daysKm(preset.days, preset.km.toLocaleString())
                      : userCopy.settings.documentConfig.noWarranty}
                </span>
              </button>
            );
          })}
        </div>
        {draft.warrantyTemplateId === "custom" ? (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              {userCopy.settings.documentConfig.customWarrantyHint}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="custom-warranty-days">{userCopy.settings.documentConfig.customDays}</Label>
                <Input
                  id="custom-warranty-days"
                  type="number"
                  min={1}
                  value={draft.customWarrantyDays}
                  onChange={(event) =>
                    onChange({ ...draft, customWarrantyDays: event.target.value })
                  }
                  placeholder="180"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-warranty-km">{userCopy.settings.documentConfig.customKm}</Label>
                <Input
                  id="custom-warranty-km"
                  type="number"
                  min={1}
                  value={draft.customWarrantyKm}
                  onChange={(event) => onChange({ ...draft, customWarrantyKm: event.target.value })}
                  placeholder="10000"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {userCopy.settings.documentConfig.customTextHint}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="qr-link">{userCopy.settings.documentConfig.qrLink}</Label>
          <Input
            id="qr-link"
            value={draft.qrLinkUrl}
            onChange={(event) => onChange({ ...draft, qrLinkUrl: event.target.value })}
            placeholder={userCopy.settings.documentConfig.qrLinkPlaceholder}
          />
          <p className="text-xs text-muted-foreground">
            {userCopy.settings.documentConfig.qrLinkHint}
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="doc-footer">{userCopy.settings.documentConfig.footer}</Label>
          <Input
            id="doc-footer"
            value={draft.documentFooter}
            onChange={(event) => onChange({ ...draft, documentFooter: event.target.value })}
            placeholder={userCopy.settings.documentConfig.footerPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-days">{userCopy.settings.documentConfig.invoiceDays}</Label>
          <Input
            id="invoice-days"
            value={draft.invoiceValidityDays}
            onChange={(event) => onChange({ ...draft, invoiceValidityDays: event.target.value })}
            placeholder="5"
          />
        </div>
      </div>
    </div>
  );
}
