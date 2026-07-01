"use client";

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Search } from "lucide-react";

import { DomainSuggestionList } from "@/components/domain/domain-suggestion-list";
import { useDomainAutocomplete } from "@/hooks/use-domain-autocomplete";
import {
  domainValueNeedsCompanyEntry,
  resolveDomainCommitValue,
} from "@/lib/domain/resolve-domain-commit";
import type { DomainCategory, DomainEntry } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export type DomainAutocompleteHandle = {
  focus: () => void;
};

export type DomainAutocompleteProps = {
  category: DomainCategory;
  value: string;
  onValueChange: (value: string) => void;
  onSelectEntry?: (entry: DomainEntry) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  limit?: number;
  autoFocus?: boolean;
  hideIcon?: boolean;
};

export const DomainAutocomplete = forwardRef<DomainAutocompleteHandle, DomainAutocompleteProps>(
  function DomainAutocomplete(
    {
      category,
      value,
      onValueChange,
      onSelectEntry,
      placeholder = "Начните вводить…",
      disabled = false,
      className,
      limit = 20,
      autoFocus = false,
      hideIcon = false,
    },
    ref,
  ) {
    const domain = useDomainAutocomplete(category);
    const inputRef = useRef<HTMLInputElement>(null);
    const userNavigatedRef = useRef(false);
    const listId = useId();

    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

    const results = useMemo(
      () => domain.search(value, { limit, includeEmpty: true }),
      [domain, value, limit],
    );

    const maxIndex = Math.max(results.length - 1, 0);

    function commitEntry(entry: DomainEntry) {
      onValueChange(entry.name);
      onSelectEntry?.(entry);
      setOpen(false);
    }

    async function commitResolvedValue() {
      const trimmed = value.trim();
      if (!trimmed) {
        setOpen(false);
        return;
      }

      const resolved = resolveDomainCommitValue(
        trimmed,
        results,
        activeIndex,
        userNavigatedRef.current,
      );

      if (domainValueNeedsCompanyEntry(resolved, results)) {
        const created = await domain.addToCompanyDictionary(resolved);
        onValueChange(created?.name ?? resolved);
        if (created) onSelectEntry?.(created);
        setOpen(false);
        return;
      }

      const match = results.find((result) => result.entry.name === resolved);
      if (match) {
        commitEntry(match.entry);
        return;
      }

      onValueChange(resolved);
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        userNavigatedRef.current = true;
        if (!open) {
          setOpen(true);
          setActiveIndex(0);
          return;
        }
        setActiveIndex((index) => Math.min(index + 1, maxIndex));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        userNavigatedRef.current = true;
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        if (!open && !value.trim()) return;
        event.preventDefault();
        if (userNavigatedRef.current && results[activeIndex]) {
          commitEntry(results[activeIndex].entry);
          return;
        }
        void commitResolvedValue();
        return;
      }
      if (event.key === "Escape") {
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
      }
    }

    return (
      <div className={cn("relative", className)}>
        <div
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {hideIcon ? null : <Search className="size-4 shrink-0 text-muted-foreground" />}
          <input
            ref={inputRef}
            value={value}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onChange={(event) => {
              onValueChange(event.target.value);
              userNavigatedRef.current = false;
              setOpen(true);
              setActiveIndex(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              void commitResolvedValue();
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        {open && results.length > 0 ? (
          <div
            id={listId}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-border/80 bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10"
          >
            <DomainSuggestionList
              category={category}
              results={results}
              activeIndex={activeIndex}
              onActiveIndexChange={(index) => {
                userNavigatedRef.current = true;
                setActiveIndex(index);
              }}
              onSelect={commitEntry}
            />
          </div>
        ) : null}
      </div>
    );
  },
);
