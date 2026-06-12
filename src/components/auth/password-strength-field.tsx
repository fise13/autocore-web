"use client";

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getPasswordStrengthState,
  PASSWORD_BAR_SEGMENT_CLASS,
  SIGNUP_PASSWORD_REQUIREMENTS,
} from "@/lib/auth/password-validation";
import { cn } from "@/lib/utils";

type PasswordStrengthFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PasswordStrengthField({
  id,
  value,
  onChange,
  disabled = false,
}: PasswordStrengthFieldProps) {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => getPasswordStrengthState(value), [value]);
  const segmentClass = PASSWORD_BAR_SEGMENT_CLASS[strength.barTone];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>Придумайте пароль</Label>
        <div className="relative">
          <Input
            id={id}
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            required
            minLength={8}
            disabled={disabled}
            className="h-10 pr-10"
            aria-describedby={`${id}-strength ${id}-requirements`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setVisible((current) => !current)}
            disabled={disabled}
            aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2" id={`${id}-strength`}>
        <div
          className="flex h-1.5 gap-1"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={SIGNUP_PASSWORD_REQUIREMENTS.length}
          aria-valuenow={strength.score}
          aria-label="Надёжность пароля"
        >
          {SIGNUP_PASSWORD_REQUIREMENTS.map((requirement, index) => (
            <div
              key={requirement.id}
              className={cn(
                "h-full flex-1 rounded-full transition-colors duration-300",
                index < strength.score ? segmentClass : "bg-border",
              )}
            />
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          <span
            className={cn(
              "font-medium",
              strength.barTone === "empty" && "text-muted-foreground",
              strength.barTone === "weak" && "text-red-500",
              strength.barTone === "fair" && "text-orange-500",
              strength.barTone === "good" && "text-amber-500",
              strength.barTone === "strong" && "text-emerald-500",
            )}
          >
            {strength.strengthText}
          </span>
          <span>. Должен содержать:</span>
        </p>

        <ul id={`${id}-requirements`} className="space-y-1.5">
          {strength.requirements.map((requirement) => (
            <li key={requirement.id} className="flex items-center gap-2 text-sm">
              {requirement.met ? (
                <Check className="size-4 shrink-0 text-emerald-500" aria-hidden />
              ) : (
                <X className="size-4 shrink-0 text-muted-foreground/80" aria-hidden />
              )}
              <span
                className={cn(
                  requirement.met ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {requirement.text}
              </span>
              <span className="sr-only">
                {requirement.met ? "Требование выполнено" : "Требование не выполнено"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
