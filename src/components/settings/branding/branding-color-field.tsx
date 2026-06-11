"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BrandingColorFieldProps = {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function BrandingColorField({
  id,
  label,
  hint,
  value,
  onChange,
  className,
}: BrandingColorFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1 transition-opacity hover:opacity-90"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-xs"
        />
      </div>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
