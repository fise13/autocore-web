"use client";

import { useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DatalistOption = {
  value: string;
  label?: string;
};

type DatalistInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "list"> & {
  value: string;
  onValueChange: (value: string) => void;
  options: DatalistOption[];
  onOptionCommit?: (value: string) => void;
  listId?: string;
  /** prefix (default) or flexible — Tab also commits substring match */
  matchMode?: "prefix" | "flexible";
};

type InlineSuggestion = {
  commitValue: string;
  suffix: string;
};

const mirrorClass =
  "pointer-events-none absolute inset-0 z-[2] flex h-8 items-center overflow-hidden rounded-lg px-2.5 py-1 text-base leading-normal md:text-sm";

function findInlineSuggestion(query: string, options: DatalistOption[]): InlineSuggestion | null {
  if (!query.trim()) return null;

  const normalized = query.toLowerCase();

  for (const option of options) {
    const candidates = [option.value, option.label].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const candidateLower = candidate.toLowerCase();
      if (candidateLower.startsWith(normalized) && candidate.length > query.length) {
        return {
          commitValue: option.value,
          suffix: candidate.slice(query.length),
        };
      }
    }
  }

  return null;
}

function findFlexibleInlineSuggestion(query: string, options: DatalistOption[]): InlineSuggestion | null {
  const prefixMatch = findInlineSuggestion(query, options);
  if (prefixMatch) return prefixMatch;

  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  for (const option of options) {
    const candidates = [option.value, option.label].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const index = candidate.toLowerCase().indexOf(normalized);
      if (index >= 0 && candidate.length > query.length) {
        const remainder = candidate.slice(index + query.length);
        if (remainder) {
          return { commitValue: option.value, suffix: remainder };
        }
      }
    }
  }

  return null;
}

function findBestFlexibleMatch(query: string, options: DatalistOption[]): string | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  for (const option of options) {
    if (option.value.toLowerCase().includes(normalized)) return option.value;
    if (option.label?.toLowerCase().includes(normalized)) return option.value;
  }

  return null;
}

export function DatalistInput({
  value,
  onValueChange,
  options,
  onOptionCommit,
  listId: _listId,
  matchMode = "prefix",
  className,
  onBlur,
  onKeyDown,
  onFocus,
  ...props
}: DatalistInputProps) {
  const fieldName = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [caretAtEnd, setCaretAtEnd] = useState(true);

  const suggestion = useMemo(
    () =>
      matchMode === "flexible"
        ? findFlexibleInlineSuggestion(value, options)
        : findInlineSuggestion(value, options),
    [matchMode, options, value],
  );
  const showGhost = focused && caretAtEnd && Boolean(suggestion?.suffix);

  function syncCaret() {
    const input = inputRef.current;
    if (!input) return;
    setCaretAtEnd(
      input.selectionStart === value.length &&
        input.selectionEnd === value.length &&
        input.selectionStart === input.selectionEnd,
    );
  }

  function acceptSuggestion() {
    if (suggestion) {
      onValueChange(suggestion.commitValue);
      onOptionCommit?.(suggestion.commitValue);
      return;
    }

    if (matchMode === "flexible") {
      const best = findBestFlexibleMatch(value, options);
      if (best) {
        onValueChange(best);
        onOptionCommit?.(best);
      }
    }
  }

  return (
    <div className="relative">
      {showGhost ? (
        <div aria-hidden className={mirrorClass}>
          <span className="whitespace-pre text-foreground">{value}</span>
          <span className="whitespace-pre text-muted-foreground">{suggestion?.suffix}</span>
        </div>
      ) : null}

      <Input
        {...props}
        ref={inputRef}
        name={fieldName}
        value={value}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        aria-autocomplete="inline"
        className={cn(
          "relative z-[1] bg-transparent dark:bg-transparent",
          showGhost && "text-transparent caret-foreground selection:bg-primary/20",
          className,
        )}
        onFocus={(event) => {
          setFocused(true);
          syncCaret();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          setCaretAtEnd(true);
          const exact = options.find(
            (option) => option.value === value || (option.label && option.label === value),
          );
          if (exact && exact.value !== value) {
            onValueChange(exact.value);
            onOptionCommit?.(exact.value);
          } else if (exact) {
            onOptionCommit?.(exact.value);
          } else if (matchMode === "flexible") {
            const best = findBestFlexibleMatch(value, options);
            if (best && best !== value) {
              onValueChange(best);
              onOptionCommit?.(best);
            }
          }
          onBlur?.(event);
        }}
        onChange={(event) => {
          onValueChange(event.target.value);
          requestAnimationFrame(syncCaret);
        }}
        onKeyDown={(event) => {
          const input = inputRef.current;
          const atEnd =
            input &&
            input.selectionStart === value.length &&
            input.selectionEnd === value.length &&
            input.selectionStart === input.selectionEnd;

          if (atEnd && event.key === "Tab" && !event.shiftKey && (suggestion || matchMode === "flexible")) {
            event.preventDefault();
            acceptSuggestion();
            return;
          }

          if (suggestion && atEnd && event.key === "ArrowRight") {
            event.preventDefault();
            acceptSuggestion();
            return;
          }

          requestAnimationFrame(syncCaret);
          onKeyDown?.(event);
        }}
        onKeyUp={syncCaret}
        onSelect={syncCaret}
        onClick={syncCaret}
      />
    </div>
  );
}
