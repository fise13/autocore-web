"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  formatGroupedInput,
  formatGroupedNumber,
  formatGroupedNumberOrEmpty,
  GroupedNumberFormatOptions,
  parseGroupedNumber,
} from "@/lib/money/format-number";
import { cn } from "@/lib/utils";

type GroupedNumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: number;
  onValueChange: (value: number) => void;
  allowDecimals?: boolean;
  maximumFractionDigits?: number;
  emptyAsZero?: boolean;
};

export function GroupedNumberInput({
  value,
  onValueChange,
  allowDecimals = false,
  maximumFractionDigits,
  emptyAsZero = true,
  className,
  onFocus,
  onBlur,
  ...props
}: GroupedNumberInputProps) {
  const formatOptions: GroupedNumberFormatOptions = {
    allowDecimals,
    maximumFractionDigits,
  };
  const isFocusedRef = useRef(false);
  const [display, setDisplay] = useState(() =>
    emptyAsZero ? formatGroupedNumber(value, formatOptions) : formatGroupedNumberOrEmpty(value, formatOptions),
  );

  useEffect(() => {
    if (isFocusedRef.current) return;
    setDisplay(
      emptyAsZero
        ? formatGroupedNumber(value, formatOptions)
        : formatGroupedNumberOrEmpty(value, formatOptions),
    );
  }, [emptyAsZero, value, allowDecimals, maximumFractionDigits]);

  function commitDisplay(nextDisplay: string) {
    setDisplay(nextDisplay);
    const parsed = parseGroupedNumber(nextDisplay);
    if (Number.isFinite(parsed)) {
      onValueChange(parsed);
      return;
    }
    if (!nextDisplay.trim()) {
      onValueChange(emptyAsZero ? 0 : 0);
    }
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={display}
      className={cn("tabular-nums", className)}
      onFocus={(event) => {
        isFocusedRef.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        isFocusedRef.current = false;
        const parsed = parseGroupedNumber(display);
        const resolved = Number.isFinite(parsed) ? parsed : emptyAsZero ? 0 : 0;
        const formatted = emptyAsZero
          ? formatGroupedNumber(resolved, formatOptions)
          : formatGroupedNumberOrEmpty(resolved, formatOptions);
        setDisplay(formatted);
        onValueChange(resolved);
        onBlur?.(event);
      }}
      onChange={(event) => {
        commitDisplay(formatGroupedInput(event.target.value, formatOptions));
      }}
    />
  );
}

type AmountInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: string;
  onChange: (value: string) => void;
};

/** String-controlled amount field for legacy forms. Value is a grouped display string. */
export function AmountInput({ value, onChange, className, onBlur, ...props }: AmountInputProps) {
  function formatCommitted(nextValue: string) {
    if (!nextValue.trim()) return "";
    const parsed = parseGroupedNumber(nextValue);
    return Number.isFinite(parsed) ? formatGroupedNumber(parsed) : nextValue;
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={value}
      className={cn("tabular-nums", className)}
      onChange={(event) => onChange(formatGroupedInput(event.target.value))}
      onBlur={(event) => {
        onChange(formatCommitted(event.target.value));
        onBlur?.(event);
      }}
    />
  );
}

export { parseGroupedNumber, formatGroupedNumber, formatGroupedInput };
