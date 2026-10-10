"use client";

import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { coreCommandGroupLabel, groupCoreCommands, type CoreCommandItem } from "@/components/ai/core-commands";

type CoreCommandListProps = {
  items: CoreCommandItem[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: CoreCommandItem) => void;
  className?: string;
};

export function CoreCommandList({
  items,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  className,
}: CoreCommandListProps) {
  if (items.length === 0) return null;

  const grouped = groupCoreCommands(items);
  const indexById = new Map(items.map((item, index) => [item.id, index]));

  return (
    <div className={cn("core-command-list", className)} role="listbox" aria-label={userCopy.ai.suggestionsLabel}>
      {grouped.map((section) => (
        <section key={section.group} className="core-command-list__section">
          <h3 className="core-kicker">{coreCommandGroupLabel(section.group)}</h3>
          <ul className="core-command-list__rows">
            {section.items.map((item) => {
              const index = indexById.get(item.id) ?? 0;
              const active = index === activeIndex;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "core-command-row flex w-full min-w-0 flex-nowrap items-center gap-2",
                      active && "is-active",
                    )}
                    onMouseEnter={() => onActiveIndexChange(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelect(item);
                    }}
                  >
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-left text-grid leading-tight">
                      {item.title}
                    </span>
                    {item.shortcut ? (
                      <kbd className="core-kbd">{item.shortcut}</kbd>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
