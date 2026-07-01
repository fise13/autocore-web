"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Activity, HelpCircle, X } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { sidebarFooterContent } from "@/lib/navigation/sidebar-footer-content";
import {
  dismissProductUpdate,
  isProductUpdateDismissed,
} from "@/lib/product/product-update-dismiss";
import { cn } from "@/lib/utils";

type SidebarFooterProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

function FooterLink({
  href,
  label,
  icon,
  external,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const linkProps = external
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={label}
        render={
          <Link href={href} onClick={() => onNavigate?.()} {...linkProps} />
        }
        className={cn(collapsed && "justify-center")}
      >
        {icon}
        <span data-sidebar-hide-collapsed>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SidebarFooter({ collapsed = false, onNavigate }: SidebarFooterProps) {
  const { announcement, help, status } = sidebarFooterContent;
  const [announcementVisible, setAnnouncementVisible] = useState(false);

  useEffect(() => {
    if (!announcement) {
      setAnnouncementVisible(false);
      return;
    }
    setAnnouncementVisible(!isProductUpdateDismissed(announcement.id));
  }, [announcement]);

  const handleDismissAnnouncement = () => {
    if (!announcement) return;
    dismissProductUpdate(announcement.id);
    setAnnouncementVisible(false);
  };

  return (
    <div
      className={cn(
        "mt-auto shrink-0 border-t border-sidebar-border/60",
        collapsed ? "px-1 py-2" : "px-2 py-3",
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
            title="Скрыть"
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

      <SidebarMenu className={cn(collapsed && "gap-1")}>
        <FooterLink
          href={help.href}
          label={help.label}
          icon={<HelpCircle className="size-4 shrink-0 opacity-80" />}
          external={help.external}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <FooterLink
          href={status.href}
          label={status.label}
          icon={<Activity className="size-4 shrink-0 opacity-80" />}
          external={status.external}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </SidebarMenu>
    </div>
  );
}
