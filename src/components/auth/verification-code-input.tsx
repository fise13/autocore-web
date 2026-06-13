"use client";

import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from "react";
import { motion } from "framer-motion";

import { authJourneyEase, authJourneyShake } from "@/lib/motion/auth-journey-motion";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;

type VerificationCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
};

function normalizeCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
  invalid = false,
  id = "email-verification-code",
}: VerificationCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const reducedMotion = prefersReducedMotion();
  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? "");

  useEffect(() => {
    if (value.length === 0) {
      inputRefs.current[0]?.focus();
    }
  }, [value]);

  function updateAt(index: number, nextDigit: string) {
    const chars = digits.slice();
    chars[index] = nextDigit;
    onChange(chars.join("").replace(/\s/g, ""));
  }

  function focusAt(index: number) {
    const clamped = Math.max(0, Math.min(CODE_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
    inputRefs.current[clamped]?.select();
  }

  function handleChange(index: number, raw: string) {
    const normalized = normalizeCode(raw);
    if (!normalized) {
      updateAt(index, "");
      return;
    }

    if (normalized.length === 1) {
      updateAt(index, normalized);
      if (index < CODE_LENGTH - 1) focusAt(index + 1);
      return;
    }

    const merged = normalizeCode(`${value.slice(0, index)}${normalized}`);
    onChange(merged);
    focusAt(Math.min(merged.length, CODE_LENGTH - 1));
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      updateAt(index - 1, "");
      focusAt(index - 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = normalizeCode(event.clipboardData.getData("text"));
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, CODE_LENGTH - 1));
  }

  return (
    <motion.div
      role="group"
      aria-labelledby={`${id}-label`}
      animate={invalid && !reducedMotion ? authJourneyShake : undefined}
      className="flex justify-center gap-2 sm:gap-2.5"
    >
      <span id={`${id}-label`} className="sr-only">
        Код подтверждения из 6 цифр
      </span>
      {digits.map((digit, index) => {
        const filled = digit.length > 0;

        return (
          <motion.div
            key={index}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.24, ease: authJourneyEase }}
            className="relative"
          >
            <input
              ref={(node) => {
                inputRefs.current[index] = node;
              }}
              id={index === 0 ? id : undefined}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              pattern="[0-9]*"
              maxLength={CODE_LENGTH}
              value={digit}
              disabled={disabled}
              aria-label={`Цифра ${index + 1}`}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              onFocus={(event) => event.target.select()}
              className={cn(
                "size-11 rounded-xl border bg-background text-center text-lg font-semibold tabular-nums transition-all duration-200 outline-none sm:size-12 sm:text-xl",
                "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
                filled && "border-primary/35 bg-primary/5",
                !filled && "border-border/70",
                invalid && "border-destructive/60 focus-visible:ring-destructive/20",
                disabled && "opacity-60",
              )}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
