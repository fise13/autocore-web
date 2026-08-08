"use client";

import { Check, CircleHelp, CircleX, Clock3 } from "lucide-react";
import type {
  DocumentationChecklistGroup,
  DocumentationChecklistItem,
  DocumentationChecklistItemState,
} from "@autocore/engine-intake";

import {
  checklistStateMark,
} from "@/components/engine-intake/engine-intake-format";
import { cn } from "@/lib/utils";

function StateIcon({ state }: { state: DocumentationChecklistItemState }) {
  if (state === "completed") return <Check className="size-3.5 text-success" />;
  if (state === "uncertain") return <CircleHelp className="size-3.5 text-warning" />;
  if (state === "not_applicable") return <CircleX className="size-3.5 text-muted-foreground" />;
  return <Clock3 className="size-3.5 text-destructive" />;
}

export function EngineIntakeChecklistPane({
  activeGroups,
  naItems,
  selectedItemId,
  onSelect,
}: {
  activeGroups: Array<{
    group: DocumentationChecklistGroup;
    label: string;
    items: DocumentationChecklistItem[];
  }>;
  naItems: DocumentationChecklistItem[];
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
      <div className="flex flex-col gap-4 pb-4">
        {activeGroups.map(({ group, label, items }) => (
          <section key={group} className="flex flex-col gap-1">
            <h4 className="px-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {label}
            </h4>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => {
                const selected = item.id === selectedItemId;
                const showHint =
                  item.state === "uncertain" ||
                  item.source === "manager_override" ||
                  (item.saleGate && item.state === "missing");
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors",
                      selected
                        ? "bg-primary-subtle text-primary-on-subtle"
                        : "hover:bg-muted/60",
                    )}
                  >
                    <StateIcon state={item.state} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.label}
                        <span
                          className={cn(
                            "ml-1.5 font-normal",
                            selected ? "text-primary-on-subtle/55" : "text-muted-foreground",
                          )}
                        >
                          {checklistStateMark(item.state)}
                        </span>
                      </p>
                      {showHint ? (
                        <p
                          className={cn(
                            "truncate text-[11px]",
                            selected
                              ? "text-primary-on-subtle/65"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.state === "uncertain"
                            ? "Needs a glance"
                            : item.source === "manager_override"
                              ? "Manager override"
                              : "Sale gate"}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {naItems.length > 0 ? (
          <details className="rounded-md border border-dashed px-2.5 py-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Not applicable ({naItems.length})
            </summary>
            <div className="mt-2 flex flex-col gap-0.5">
              {naItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    item.id === selectedItemId ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {item.rationale || "Doesn’t apply"}
                  </span>
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
