"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, UserCircle } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { UserAvatar } from "@/components/account/user-avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
import { formatRole, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
  compact?: boolean;
};

const MENU_WIDTH = 288;

export function AccountMenu({ compact = false }: AccountMenuProps) {
  const { firebaseUser, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const accountInfo = getAccountProviderInfo(firebaseUser);
  const displayName = profile?.displayName ?? accountInfo?.displayName ?? null;
  const photoURL = profile?.photoURL ?? accountInfo?.photoURL ?? null;
  const email = profile?.email ?? accountInfo?.email ?? "";

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const padding = 8;
      let left = rect.right - MENU_WIDTH;
      left = Math.max(padding, Math.min(left, window.innerWidth - MENU_WIDTH - padding));

      setMenuPosition({
        top: rect.bottom + padding,
        left,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!firebaseUser) return null;

  const menu = open && menuPosition ? (
    <div
      ref={menuRef}
      role="menu"
      style={{ top: menuPosition.top, left: menuPosition.left, width: MENU_WIDTH }}
      className="fixed z-[220] origin-top-right animate-autocore-auth-form-enter rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl motion-reduce:animate-none"
    >
      <div className="flex items-center gap-3 rounded-lg bg-muted/35 px-3 py-3">
        <UserAvatar
          photoURL={photoURL}
          displayName={displayName}
          email={email}
          provider={accountInfo?.kind}
          showProviderBadge
          size="lg"
        />
        <div className="min-w-0 flex-1">
          {displayName ? <p className="truncate text-sm font-semibold">{displayName}</p> : null}
          <p className="truncate text-xs text-muted-foreground">{email || "—"}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {accountInfo?.label ?? "—"} · {formatRole(profile?.role)}
          </p>
        </div>
      </div>

      <div className="my-1 h-px bg-border/70" />

      <Link
        href="/settings?section=account"
        role="menuitem"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
        onClick={() => setOpen(false)}
      >
        <UserCircle className="size-4 text-muted-foreground" />
        {userCopy.account.menuSettings}
      </Link>
      <Link
        href="/settings"
        role="menuitem"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
        onClick={() => setOpen(false)}
      >
        <Settings className="size-4 text-muted-foreground" />
        {userCopy.settings.title}
      </Link>

      <div className="my-1 h-px bg-border/70" />

      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
        onClick={() => {
          setOpen(false);
          void logout();
        }}
      >
        <LogOut className="size-4" />
        {userCopy.account.signOut}
      </button>
    </div>
  ) : null;

  return (
    <>
      <div ref={anchorRef} className="relative">
        <Button
          type="button"
          variant="ghost"
          size={compact ? "icon-sm" : "sm"}
          className={cn("gap-2 rounded-full px-1.5", !compact && "h-9 pr-2 pl-1")}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((current) => !current)}
          title={email || userCopy.account.menuTitle}
        >
          <UserAvatar
            photoURL={photoURL}
            displayName={displayName}
            email={email}
            provider={accountInfo?.kind}
            showProviderBadge
            size="sm"
          />
          {!compact ? (
            <>
              <span className="hidden max-w-[120px] truncate text-xs font-medium lg:inline">
                {displayName || email.split("@")[0]}
              </span>
              <ChevronDown
                className={cn(
                  "hidden size-3.5 text-muted-foreground transition-transform duration-200 lg:block",
                  open && "rotate-180",
                )}
              />
            </>
          ) : null}
        </Button>
      </div>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
