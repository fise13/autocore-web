"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Activity, CircleQuestionMark, X } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { getSidebarFooterContent } from "@/lib/navigation/sidebar-footer-content";
import {
  dismissProductUpdate,
  isProductUpdateDismissed,
} from "@/lib/product/product-update-dismiss";
import type { SystemStatusLevel } from "@/lib/product/product-status";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type SidebarFooterProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

const statusDotClass: Record<SystemStatusLevel, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  outage: "bg-destructive",
};

function FooterLink({
  href,
  label,
  icon,
  external,
  collapsed,
  onNavigate,
  trailing,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  trailing?: ReactNode;
}) {
  const linkProps = external
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <SidebarMenuItem className={cn(collapsed && "flex w-auto justify-center")}>
      <SidebarMenuButton
        tooltip={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        render={
          <Link href={href} onClick={() => onNavigate?.()} {...linkProps} />
        }
        className={cn(
          collapsed &&
            "size-9! w-9! max-w-9 justify-center rounded-lg p-0! text-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
        )}
      >
        <span className="relative inline-flex shrink-0 items-center justify-center">
          {icon}
          {trailing}
        </span>
        {!collapsed ? <span data-sidebar-hide-collapsed>{label}</span> : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SidebarFooter({ collapsed = false, onNavigate }: SidebarFooterProps) {
  const { announcement, help, status } = getSidebarFooterContent();
  const [announcementVisible, setAnnouncementVisible] = useState(false);
  const [statusLevel, setStatusLevel] = useState<SystemStatusLevel>("operational");

  useEffect(() => {
    if (!announcement) {
      setAnnouncementVisible(false);
      return;
    }
    setAnnouncementVisible(!isProductUpdateDismissed(announcement.id));
  }, [announcement]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("status failed");
        const data = (await response.json()) as { overall?: SystemStatusLevel };
        if (!cancelled && data.overall) setStatusLevel(data.overall);
      })
      .catch(() => {
        if (!cancelled) setStatusLevel("degraded");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismissAnnouncement = () => {
    if (!announcement) return;
    dismissProductUpdate(announcement.id);
    setAnnouncementVisible(false);
  };

  return (
    <div
      className={cn(
        "mt-auto shrink-0 border-t border-sidebar-border/60",
        collapsed ? "px-1.5 py-2.5" : "px-2 py-3",
      )}
    >
      {!collapsed && announcement && announcementVisible ? (
        <div className="relative mb-3 rounded-xl border border-sidebar-border/80 bg-sidebar-accent/35 p-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1.5 right-1.5 size-6 text-muted-foreground hover:text-foreground"
            onClick={handleDismissAnnouncement}
            title={userCopy.layout.hide}
          >
            <X className="size-3.5" />
          </Button>
          <p className="pr-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {announcement.badge}
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-sidebar-foreground">
            {announcement.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {announcement.description}
          </p>
          <Link
            href={announcement.href}
            onClick={() => onNavigate?.()}
            className="mt-2.5 inline-block text-sm font-medium text-sidebar-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {announcement.linkLabel}
          </Link>
        </div>
      ) : null}

      <SidebarMenu className={cn(collapsed ? "w-auto items-center gap-1" : "gap-0.5")}>
        <FooterLink
          href={help.href}
          label={help.label}
          icon={<CircleQuestionMark className="size-4 shrink-0 opacity-90" />}
          external={help.external}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <FooterLink
          href={status.href}
          label={status.label}
          icon={<Activity className="size-4 shrink-0 opacity-90" />}
          external={status.external}
          collapsed={collapsed}
          onNavigate={onNavigate}
          trailing={
            <span
              aria-hidden
              title={status.label}
              className={cn(
                "absolute size-1.5 rounded-full ring-2 ring-sidebar",
                collapsed ? "-top-0.5 -right-0.5" : "top-0 right-0",
                statusDotClass[statusLevel],
              )}
            />
          }
        />
      </SidebarMenu>
    </div>
  );
}
