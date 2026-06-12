"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: "new-password" | "current-password";
  name?: string;
  disabled?: boolean;
  minLength?: number;
  className?: string;
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  name = "password",
  disabled = false,
  minLength = 6,
  className,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={minLength}
          disabled={disabled}
          className="h-10 pr-10"
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
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
