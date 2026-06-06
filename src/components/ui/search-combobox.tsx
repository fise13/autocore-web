"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { filterSearchOptions, type SearchOption } from "@/lib/search/filter-options";
import { cn } from "@/lib/utils";

export type { SearchOption };

type SearchComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  emptyOption?: SearchOption;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  maxResults?: number;
};

export function SearchCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Начните вводить…",
  emptyOption,
  emptyMessage = "Ничего не найдено",
  disabled = false,
  className,
  maxResults = 50,
}: SearchComboboxProps) {
  const items = React.useMemo(() => {
    const mapped = options.map((option) => ({
      value: option.value,
      label: option.label,
      description: option.description,
      keywords: option.keywords,
    }));
    return emptyOption ? [emptyOption, ...mapped] : mapped;
  }, [emptyOption, options]);

  const selectedItem = React.useMemo(
    () => items.find((item) => item.value.toLowerCase() === value.trim().toLowerCase()) ?? null,
    [items, value],
  );

  return (
    <Combobox.Root
      items={items}
      value={selectedItem}
      inputValue={value}
      disabled={disabled}
      autoHighlight
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
      filter={(item, query) => matchComboboxItem(item, query)}
      onInputValueChange={(next) => onValueChange(next)}
      onValueChange={(next) => onValueChange(next?.value ?? "")}
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
              aria-label="Очистить"
            >
              <XIcon className="size-3.5" />
            </Combobox.Clear>
          ) : null}
          <Combobox.Trigger
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
            aria-label="Открыть список"
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
              {(item: SearchOption) => (
                <Combobox.Item
                  key={item.value || "__empty__"}
                  value={item}
                  className="relative flex cursor-default select-none items-start gap-2 rounded-sm px-2 py-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <Combobox.ItemIndicator className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                    <CheckIcon className="size-3.5" />
                  </Combobox.ItemIndicator>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    {item.description ? (
                      <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                    ) : null}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function matchComboboxItem(item: SearchOption, query: string): boolean {
  return filterSearchOptions([item], query, 1).length > 0;
}
