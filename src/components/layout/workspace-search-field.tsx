"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { useWorkspace, type WorkspaceSearchSuggestion } from "@/components/layout/workspace-context";
import { Input } from "@/components/ui/input";
import { filterSearchOptions, type SearchOption } from "@/lib/search/filter-options";
import { cn } from "@/lib/utils";

type WorkspaceSearchFieldProps = {
  placeholder: string;
  className?: string;
};

export function WorkspaceSearchField({ placeholder, className }: WorkspaceSearchFieldProps) {
  const { search, setSearch, searchSuggestions } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestionOptions = useMemo<SearchOption[]>(
    () =>
      searchSuggestions.map((item) => ({
        value: item.id,
        label: item.label,
        description: item.description,
        keywords: item.searchValue,
      })),
    [searchSuggestions],
  );

  const filtered = useMemo(
    () => filterSearchOptions(suggestionOptions, search, 12),
    [search, suggestionOptions],
  );

  const showDropdown = open && search.trim().length > 0 && filtered.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [search, filtered.length]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function applySuggestion(option: SearchOption) {
    const suggestion = searchSuggestions.find((item) => item.id === option.value);
    setSearch(suggestion?.searchValue ?? option.label);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filtered.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      applySuggestion(filtered[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-[360px]", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        data-no-grid-undo
        placeholder={placeholder}
        className="h-9 bg-muted/30 pl-9"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />

      {showDropdown ? (
        <div className="absolute top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          <ul className="max-h-72 overflow-y-auto p-1" role="listbox">
            {filtered.map((option, index) => (
              <li key={option.value} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                    index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/70",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applySuggestion(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="truncate font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="truncate text-xs text-muted-foreground">{option.description}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function buildWarehouseSearchSuggestions(
  items: Array<{ id: string; sku: string; name: string; brandName?: string; totalAvailable: number }>,
): WorkspaceSearchSuggestion[] {
  return items.map((item) => ({
    id: item.id,
    label: `${item.sku} · ${item.name}`,
    description: [item.brandName, `в наличии ${item.totalAvailable}`].filter(Boolean).join(" · "),
    searchValue: item.sku || item.name,
  }));
}

export function buildMotorSearchSuggestions(
  motors: Array<{
    id: string;
    serialCode: string;
    brandName?: string;
    engineCode?: string;
    configuration?: string;
  }>,
): WorkspaceSearchSuggestion[] {
  return motors.map((motor) => ({
    id: motor.id,
    label: [motor.serialCode, motor.brandName, motor.engineCode].filter(Boolean).join(" · "),
    description: motor.configuration || undefined,
    searchValue: motor.serialCode,
  }));
}
