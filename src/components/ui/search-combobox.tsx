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

/** Never scan more than this many raw options before filtering — large inventory/client
 *  lists were OOMing the tab when every composer field rebuilt its item list. */
const SOURCE_SCAN_CAP = 200;

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

function buildItems(
  options: SearchOption[],
  value: string,
  maxResults: number,
  emptyOption?: SearchOption,
): ComboboxItem[] {
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

  // Prefer matches for the current query when the source list is huge; otherwise
  // take a stable prefix so opening an empty field stays cheap.
  const query = value.trim();
  const source = query
    ? filterSearchOptions(options, query, SOURCE_SCAN_CAP)
    : options.length > SOURCE_SCAN_CAP
      ? options.slice(0, SOURCE_SCAN_CAP)
      : options;

  for (const option of source) push(option);

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
  maxResults = 40,
}: SearchComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // While closed, only keep the current value as an item so Base UI has a real
  // selection object — never mount a large list until the popup opens.
  const items = React.useMemo(() => {
    if (!open) {
      const trimmed = value.trim();
      if (!trimmed) return [] as ComboboxItem[];
      return [
        {
          value: trimmed,
          label: trimmed,
          keywords: trimmed,
        },
      ];
    }
    return buildItems(options, value, maxResults, emptyOption);
  }, [emptyOption, maxResults, open, options, value]);

  const selectedItem = React.useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;
    return items.find((item) => item.value.toLowerCase() === trimmed) ?? null;
  }, [items, value]);

  return (
    <Combobox.Root
      items={items}
      filteredItems={items}
      value={selectedItem}
      inputValue={value}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      autoHighlight
      limit={maxResults}
      // External filtering — Base UI must not re-filter or the DOM grows again.
      filter={null}
      // Scroll-lock + pointer-block fought the WO motion layout and made the
      // tab feel like a hard crash on low-memory machines.
      modal={false}
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

      {open ? (
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-50">
            <Combobox.Popup className="max-h-72 w-[var(--anchor-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
              <Combobox.Empty className="px-3 py-4 text-sm text-muted-foreground">
                {emptyMessage}
              </Combobox.Empty>
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
      ) : null}
    </Combobox.Root>
  );
}
