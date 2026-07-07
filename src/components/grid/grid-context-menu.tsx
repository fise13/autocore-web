"use client";

import { PackagePlus, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function clampContextMenuPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(Math.max(margin, x), maxX),
    y: Math.min(Math.max(margin, y), maxY),
  };
}

type GridContextMenuProps = {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function GridContextMenu({ x, y, onClose, children, className }: GridContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setPosition(clampContextMenuPosition(x, y, rect.width, rect.height));
  }, [x, y, children]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    function onScroll() {
      onClose();
    }

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        "animate-tab-enter fixed z-40 min-w-[11.5rem] rounded-md border bg-popover p-0.5 shadow-md",
        className,
      )}
      style={{ left: position.x, top: position.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}

type GridContextMenuItemProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
  icon?: LucideIcon;
};

export function GridContextMenuItem({
  children,
  onClick,
  disabled,
  destructive,
  shortcut,
  icon: Icon,
}: GridContextMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-3 rounded px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40",
        destructive && "text-destructive hover:bg-destructive/10",
      )}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <Icon
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 opacity-70",
              destructive && "text-destructive",
            )}
          />
        ) : null}
        <span className="truncate">{children}</span>
      </span>
      {shortcut ? <span className="shrink-0 text-[11px] text-muted-foreground">{shortcut}</span> : null}
    </button>
  );
}

export function GridContextMenuSeparator() {
  return <Separator className="my-1" />;
}
