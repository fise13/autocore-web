"use client";

import {
  clampWatermarkConfig,
  DocumentWatermarkBlend,
  DocumentWatermarkConfig,
  DocumentWatermarkPosition,
  DocumentWatermarkType,
  DOCUMENT_WATERMARK_BLENDS,
  DOCUMENT_WATERMARK_POSITIONS,
  DOCUMENT_WATERMARK_TYPES,
  WATERMARK_POSITION_LABELS_RU,
  WATERMARK_TYPE_LABELS_RU,
} from "@/domain/document-watermark-config";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type DocumentWatermarkSettingsProps = {
  value: DocumentWatermarkConfig;
  hasLogo: boolean;
  onChange: (next: DocumentWatermarkConfig) => void;
};

const TYPE_HINTS: Record<DocumentWatermarkType, string> = {
  none: "Чистый лист без фонового брендинга",
  logo: "Диагональный корпоративный водяной знак по центру страницы",
  brand_mark: "Массивный бренд-марк с названием компании",
  pattern: "Тонкий повторяющийся узор как на премиальных сертификатах",
};

function WatermarkSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="h-2 w-full cursor-pointer accent-primary"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted/40",
      )}
    >
      {label}
    </button>
  );
}

export function DocumentWatermarkSettings({ value, hasLogo, onChange }: DocumentWatermarkSettingsProps) {
  const active = value.type !== "none";

  function update(patch: Partial<DocumentWatermarkConfig>) {
    const nextType = patch.type ?? value.type;
    onChange(clampWatermarkConfig({ ...value, ...patch }, nextType));
  }

  function setType(type: DocumentWatermarkType) {
    onChange(clampWatermarkConfig({ ...value, type }, type));
  }

  const needsLogo = value.type === "logo";
  const logoMissing = needsLogo && !hasLogo;

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2">
        {DOCUMENT_WATERMARK_TYPES.map((type) => {
          const selected = value.type === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setType(type)}
              className={cn(
                "cursor-pointer rounded-xl border p-3 text-left transition-colors duration-200",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border/80 bg-card hover:border-primary/25 hover:bg-muted/20",
              )}
            >
              <p className="text-sm font-semibold">{WATERMARK_TYPE_LABELS_RU[type]}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{TYPE_HINTS[type]}</p>
            </button>
          );
        })}
      </div>

      {logoMissing ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          Загрузите логотип в разделе «Компания», чтобы использовать режим водяного знака.
        </p>
      ) : null}

      {active ? (
        <div className="space-y-4 rounded-xl border bg-muted/15 p-4">
          <WatermarkSlider
            id="wm-opacity"
            label="Прозрачность"
            value={value.opacity}
            min={value.type === "brand_mark" ? 1 : value.type === "pattern" ? 1 : 3}
            max={value.type === "brand_mark" ? 3 : value.type === "pattern" ? 2 : 6}
            step={value.type === "pattern" ? 0.5 : 1}
            suffix="%"
            onChange={(opacity) => update({ opacity })}
          />

          <WatermarkSlider
            id="wm-scale"
            label="Масштаб"
            value={value.scale}
            min={value.type === "brand_mark" ? 70 : 35}
            max={value.type === "brand_mark" ? 120 : value.type === "pattern" ? 70 : 70}
            step={1}
            suffix="%"
            onChange={(scale) => update({ scale })}
          />

          {value.type === "logo" ? (
            <WatermarkSlider
              id="wm-rotation"
              label="Поворот"
              value={value.rotation}
              min={25}
              max={35}
              step={1}
              suffix="°"
              onChange={(rotation) => update({ rotation })}
            />
          ) : null}

          {value.type === "pattern" ? (
            <WatermarkSlider
              id="wm-spacing"
              label="Интервал узора"
              value={value.repeatSpacing}
              min={80}
              max={220}
              step={10}
              suffix=" px"
              onChange={(repeatSpacing) => update({ repeatSpacing })}
            />
          ) : null}

          {value.type !== "pattern" ? (
            <div className="space-y-2">
              <Label>Позиция</Label>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_WATERMARK_POSITIONS.map((position) => (
                  <ToggleChip
                    key={position}
                    active={value.position === position}
                    label={WATERMARK_POSITION_LABELS_RU[position]}
                    onClick={() => update({ position: position as DocumentWatermarkPosition })}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Оттенки серого</Label>
              <div className="flex gap-2">
                <ToggleChip
                  active={value.grayscale}
                  label="Вкл"
                  onClick={() => update({ grayscale: true })}
                />
                <ToggleChip
                  active={!value.grayscale}
                  label="Выкл"
                  onClick={() => update({ grayscale: false })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Смешивание</Label>
              <div className="flex gap-2">
                {DOCUMENT_WATERMARK_BLENDS.map((blend) => (
                  <ToggleChip
                    key={blend}
                    active={value.blend === blend}
                    label={blend === "multiply" ? "Multiply" : "Normal"}
                    onClick={() => update({ blend: blend as DocumentWatermarkBlend })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
