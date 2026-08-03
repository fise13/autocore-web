"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { filterSearchOptions, type SearchOption } from "@/lib/search/filter-options";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

export type { SearchOption };

type SearchComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Fires only when an option is chosen from the list — not on free typing. */
  onOptionSelect?: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  emptyOption?: SearchOption;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  maxResults?: number;
};

type ComboboxItem = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
};

function toComboboxItem(option: SearchOption): ComboboxItem | null {
  const value = option.value?.trim() ?? "";
  if (!value) return null;
  return {
    value,
    label: (option.label || option.value).trim() || value,
    description: option.description,
    keywords: option.keywords,
  };
}

export function SearchCombobox({
  value,
  onValueChange,
  onOptionSelect,
  options,
  placeholder = userCopy.searchCombobox.placeholder,
  emptyOption,
  emptyMessage = userCopy.searchCombobox.empty,
  disabled = false,
  className,
  maxResults = 50,
}: SearchComboboxProps) {
  const items = React.useMemo(() => {
    const mapped: ComboboxItem[] = [];
    const seen = new Set<string>();

    const push = (option: SearchOption | undefined) => {
      if (!option) return;
      const item = toComboboxItem(option);
      if (!item) return;
      const key = item.value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      mapped.push(item);
    };

    push(emptyOption);
    for (const option of options) push(option);

    // Pre-filter by the current input so Base UI never mounts thousands of rows
    // (opening an unscoped client/SKU list was crashing the tab).
    const filtered = filterSearchOptions(mapped, value, maxResults);

    const trimmed = value.trim();
    if (!trimmed) return filtered;

    const hasExact = filtered.some((item) => item.value.toLowerCase() === trimmed.toLowerCase());
    if (hasExact) return filtered;

    // Keep free-typed values in the item list so Base UI treats them as a real
    // selection and does not clear the input when the popup closes.
    return [
      {
        value: trimmed,
        label: trimmed,
        description: userCopy.searchCombobox.customOption,
        keywords: trimmed,
      },
      ...filtered,
    ].slice(0, maxResults);
  }, [emptyOption, maxResults, options, value]);

  const selectedItem = React.useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;
    return items.find((item) => item.value.toLowerCase() === trimmed) ?? null;
  }, [items, value]);

  return (
    <Combobox.Root
      items={items}
      value={selectedItem}
      inputValue={value}
      disabled={disabled}
      autoHighlight
      limit={maxResults}
      // Filtering is applied when building `items` so the DOM stays bounded.
      filter={null}
      itemToStringLabel={(item) => item?.label ?? ""}
      isItemEqualToValue={(a, b) =>
        Boolean(a && b && a.value.toLowerCase() === b.value.toLowerCase())
      }
      onInputValueChange={(next, details) => {
        // Base UI syncs input → selected label on popup close. When nothing is selected
        // yet (race before creatable item commits), that wipe uses `input-clear`.
        // The Clear button uses `clear-press` and must still empty the field.
        if (next === "" && value.trim() !== "" && details.reason === "input-clear") {
          details.cancel();
          return;
        }
        if (next === value) return;
        onValueChange(next);
      }}
      onValueChange={(next) => {
        // Free-typed values briefly deselect while the controlled value catches up.
        // Never wipe the input on null — parent state already holds the typed text.
        if (!next) return;
        if (next.value === value) {
          onOptionSelect?.(next.value);
          return;
        }
        onValueChange(next.value);
        onOptionSelect?.(next.value);
      }}
    >
      <Combobox.InputGroup
        className={cn(
          "relative flex h-9 w-full items-center rounded-md border border-input bg-background shadow-xs outline-none transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 [&>input]:pr-14",
          className,
        )}
      >
        <Combobox.Input
          placeholder={placeholder}
          className="h-full w-full border-0 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <div className="absolute right-1 flex items-center gap-0.5 text-muted-foreground">
          {value ? (
            <Combobox.Clear
              className="flex size-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
              aria-label={userCopy.searchCombobox.clearAria}
            >
              <XIcon className="size-3.5" />
            </Combobox.Clear>
          ) : null}
          <Combobox.Trigger
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
            aria-label={userCopy.searchCombobox.openAria}
          >
            <ChevronDownIcon className="size-4 opacity-60" />
          </Combobox.Trigger>
        </div>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50">
          <Combobox.Popup className="max-h-72 w-[var(--anchor-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <Combobox.Empty className="px-3 py-4 text-sm text-muted-foreground">{emptyMessage}</Combobox.Empty>
            <Combobox.List className="max-h-72 overflow-y-auto p-1 outline-none">
              {(item: ComboboxItem) =>
                item ? (
                  <Combobox.Item
                    key={item.value}
                    value={item}
                    className="group relative flex cursor-default select-none items-start gap-2 rounded-sm px-2 py-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <Combobox.ItemIndicator className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                      <CheckIcon className="size-3.5" />
                    </Combobox.ItemIndicator>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      {item.description ? (
                        <span className="block truncate text-xs text-muted-foreground group-data-highlighted:text-accent-foreground/80">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </Combobox.Item>
                ) : null
              }
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
