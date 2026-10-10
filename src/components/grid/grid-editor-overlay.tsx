"use client";

import {
  KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { userCopy } from "@/lib/user-copy";

import { DomainSuggestionList } from "@/components/domain/domain-suggestion-list";
import { useDomainAutocomplete } from "@/hooks/use-domain-autocomplete";
import {
  domainValueNeedsCompanyEntry,
  resolveDomainCommitValue,
} from "@/lib/domain/resolve-domain-commit";
import { autocompleteSuffixForMatch } from "@/lib/grid/grid-column-autocomplete";
import type { DomainCategory, DomainEntry, DomainSearchResult } from "@/lib/domain/types";

type CommitDirection = "down" | "up" | "left" | "right";

type GridEditorOverlayProps = {
  value: string;
  editorKey: string;
  frame: { x: number; y: number; width: number; height: number };
  onChange: (value: string) => void;
  onCommit: (direction?: CommitDirection, value?: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  selectAll?: boolean;
  autocompleteMatch?: string | null;
  /** Company/catalog values for this column — merged with domain search. */
  columnSuggestions?: string[];
  domainCategory?: DomainCategory;
  /** When true, new dictionary terms are queued instead of written immediately. */
  deferDictionaryWrites?: boolean;
  onDeferredDictionaryEntry?: (category: DomainCategory, name: string) => void;
  onSuggestionsOpenChange?: (open: boolean) => void;
  showSuggestionFooter?: boolean;
};

const DOMAIN_LIMIT = 30;

function toColumnResults(suggestions: string[]): DomainSearchResult[] {
  return suggestions.map((name, index) => ({
    entry: {
      id: `column-${index}`,
      name,
      type: "brand",
    },
    score: 700,
    match: "prefix",
  }));
}

export function GridEditorOverlay({
  value,
  editorKey,
  frame,
  onChange,
  onCommit,
  onCancel,
  autoFocus = true,
  selectAll = true,
  autocompleteMatch = null,
  columnSuggestions = [],
  domainCategory,
  deferDictionaryWrites = false,
  onDeferredDictionaryEntry,
  onSuggestionsOpenChange,
  showSuggestionFooter = false,
}: GridEditorOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userNavigatedRef = useRef(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const domain = useDomainAutocomplete(domainCategory ?? "engines");

  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    setSuggestionsOpen(true);
    setActiveIndex(0);
    userNavigatedRef.current = false;
  }, [editorKey]);

  const results = useMemo(() => {
    const fromDomain = domainCategory
      ? domain.search(value, { limit: DOMAIN_LIMIT, includeEmpty: !value.trim() })
      : [];
    const fromColumn = columnSuggestions.length > 0 ? toColumnResults(columnSuggestions) : [];

    const seen = new Set<string>();
    const merged: DomainSearchResult[] = [];
    for (const result of [...fromColumn, ...fromDomain]) {
      const key = result.entry.name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(result);
      if (merged.length >= DOMAIN_LIMIT) break;
    }
    return merged;
  }, [columnSuggestions, domain, domainCategory, value]);

  const suggestionsVisible = suggestionsOpen && results.length > 0;
  const maxIndex = Math.max(results.length - 1, 0);

  useEffect(() => {
    onSuggestionsOpenChange?.(suggestionsVisible);
  }, [onSuggestionsOpenChange, suggestionsVisible]);

  const autocompleteSuffix = useMemo(() => {
    if (suggestionsVisible) return "";
    return autocompleteSuffixForMatch(value, autocompleteMatch);
  }, [autocompleteMatch, suggestionsVisible, value]);

  useLayoutEffect(() => {
    if (!autoFocus) return;
    const node = textareaRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    if (selectAll) {
      node.select();
      return;
    }
    const cursor = node.value.length;
    node.setSelectionRange(cursor, cursor);
  }, [autoFocus, editorKey, selectAll]);

  useLayoutEffect(() => {
    if (!suggestionsVisible) {
      setDropdownRect(null);
      return;
    }

    const updateRect = () => {
      const node = textareaRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 300),
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [editorKey, frame, suggestionsVisible, value]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      onSuggestionsOpenChange?.(false);
    };
  }, [onSuggestionsOpenChange]);

  function persistDictionaryEntry(resolved: string) {
    if (!domainCategory) return;
    if (deferDictionaryWrites) {
      onDeferredDictionaryEntry?.(domainCategory, resolved);
      return;
    }
    if (domainValueNeedsCompanyEntry(resolved, results)) {
      void domain.addToCompanyDictionary(resolved);
    }
  }

  function commitDomainValue(direction?: CommitDirection) {
    const trimmed = value.trim();
    if (!trimmed) {
      onCommit(direction);
      return;
    }

    if (domainCategory) {
      const resolved = resolveDomainCommitValue(
        trimmed,
        results,
        activeIndex,
        userNavigatedRef.current,
      );

      // Commit first so Enter/click never wait on dictionary I/O (value must land without Tab).
      onChange(resolved);
      onCommit(direction, resolved);
      persistDictionaryEntry(resolved);
      return;
    }

    if (results[activeIndex]) {
      const resolved = results[activeIndex].entry.name;
      onChange(resolved);
      onCommit(direction, resolved);
      return;
    }

    onCommit(direction, trimmed);
  }

  function selectEntry(entry: DomainEntry, direction?: CommitDirection) {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    onChange(entry.name);
    onCommit(direction, entry.name);
    persistDictionaryEntry(entry.name);
  }

  function handleSuggestionAccept(direction: CommitDirection): boolean {
    if (!suggestionsVisible) return false;
    // Highlighted row is always the selection target (Enter / Tab / click) —
    // do not require arrow navigation first.
    if (results[activeIndex]) {
      selectEntry(results[activeIndex].entry, direction);
      return true;
    }
    commitDomainValue(direction);
    return true;
  }

  function scheduleBlurCommit() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      if (domainCategory || columnSuggestions.length > 0) {
        commitDomainValue();
        return;
      }
      onCommit();
    }, 140);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (suggestionsVisible) {
        setSuggestionsOpen(false);
        return;
      }
      onCancel();
      return;
    }

    if (suggestionsVisible && event.key === "ArrowDown") {
      event.preventDefault();
      userNavigatedRef.current = true;
      setActiveIndex((index) => Math.min(index + 1, maxIndex));
      return;
    }

    if (suggestionsVisible && event.key === "ArrowUp") {
      event.preventDefault();
      userNavigatedRef.current = true;
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      if (
        event.currentTarget.value.length === 0 ||
        (event.currentTarget.selectionStart === 0 &&
          event.currentTarget.selectionEnd === event.currentTarget.value.length)
      ) {
        event.preventDefault();
        onChange("");
        onCommit();
        return;
      }
    }

    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      if (suggestionsVisible) {
        handleSuggestionAccept(event.shiftKey ? "left" : "right");
        return;
      }
      if (autocompleteSuffix) {
        onChange(value + autocompleteSuffix);
        return;
      }
      onCommit(event.shiftKey ? "left" : "right");
      return;
    }

    if (event.key === "Enter" && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      if (suggestionsVisible) {
        handleSuggestionAccept(event.shiftKey ? "up" : "down");
        return;
      }
      if (autocompleteSuffix) {
        onChange(value + autocompleteSuffix);
        return;
      }
      onCommit(event.shiftKey ? "up" : "down");
      return;
    }

    if (event.key === "ArrowRight" && autocompleteSuffix) {
      const target = event.currentTarget;
      if (target.selectionStart === value.length && target.selectionEnd === value.length) {
        event.preventDefault();
        onChange(value + autocompleteSuffix);
        return;
      }
    }

    // Excel "Enter" / type-to-edit mode: arrows commit and move to the next cell.
    // F2 / double-click (selectAll) keeps caret movement inside the text.
    if (!selectAll && (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      if (suggestionsVisible && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        return;
      }
      event.preventDefault();
      const direction =
        event.key === "ArrowUp"
          ? "up"
          : event.key === "ArrowDown"
            ? "down"
            : event.key === "ArrowLeft"
              ? "left"
              : "right";
      onCommit(direction);
    }
  }

  const suggestionsDropdown =
    suggestionsVisible && dropdownRect && typeof document !== "undefined"
      ? createPortal(
          <div
            data-grid-editor-suggestions
            className="overflow-hidden rounded-lg border border-border/80 bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10"
            style={{
              position: "fixed",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 100_000,
              maxHeight: 320,
            }}
            onMouseDown={(event) => event.preventDefault()}
          >
            {domainCategory ? (
              <DomainSuggestionList
                category={domainCategory}
                results={results}
                activeIndex={activeIndex}
                highlightQuery={value}
                compact
                onActiveIndexChange={(index) => {
                  userNavigatedRef.current = true;
                  setActiveIndex(index);
                }}
                onSelect={(entry) => selectEntry(entry, "right")}
              />
            ) : (
              <ul className="max-h-80 overflow-y-auto p-0.5">
                {results.map((result, index) => (
                  <li key={result.entry.id}>
                    <button
                      type="button"
                      className={`flex min-h-9 w-full rounded-md px-3 py-1.5 text-left text-grid leading-5 ${
                        index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                      }`}
                      onMouseEnter={() => {
                        userNavigatedRef.current = true;
                        setActiveIndex(index);
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectEntry(result.entry, "right");
                      }}
                    >
                      {result.entry.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showSuggestionFooter ? (
              <div className="border-t border-border/70 px-3 py-1.5 text-micro text-muted-foreground">
                {userCopy.grid.editorHint}
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="absolute z-30" style={{ left: frame.x, top: frame.y, width: frame.width + 1 }}>
        <div
          className="relative overflow-hidden rounded-[2px] border-2 bg-card opacity-100 shadow-sm"
          style={{ height: frame.height + 1, borderColor: "var(--grid-active-border)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden px-2 py-1 text-grid leading-5 whitespace-pre-wrap break-words"
          >
            <span className="invisible">{value}</span>
            {autocompleteSuffix ? (
              <span className="text-muted-foreground/45">{autocompleteSuffix}</span>
            ) : null}
          </div>
          <textarea
            ref={textareaRef}
            key={editorKey}
            autoFocus={autoFocus}
            value={value}
            onMouseDown={(event) => event.stopPropagation()}
            onFocus={() => {
              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
              setSuggestionsOpen(true);
            }}
            onChange={(event) => {
              onChange(event.target.value);
              setSuggestionsOpen(true);
              setActiveIndex(0);
              userNavigatedRef.current = false;
            }}
            onBlur={scheduleBlurCommit}
            onKeyDown={handleKeyDown}
            className="relative z-10 h-full w-full resize-none bg-card px-2 py-1 text-grid leading-5 text-foreground caret-foreground outline-none"
            style={{ minHeight: frame.height + 1 }}
          />
        </div>
      </div>
      {suggestionsDropdown}
    </>
  );
}
