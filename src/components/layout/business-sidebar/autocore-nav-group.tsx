"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { AutocoreNavGroup, AutocoreNavItem } from "@/components/layout/business-sidebar/autocore-nav-types";
import type { SidebarBlockId, SidebarNavItemId } from "@/lib/navigation/sidebar-customization";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";

type AutocoreNavGroupProps = AutocoreNavGroup & {
  collapsed?: boolean;
  onNavigate?: () => void;
  isEditing?: boolean;
  onHideNav?: (navId: SidebarNavItemId) => void;
  onHideBlock?: (blockId: SidebarBlockId) => void;
};

type NavCollapsibleItemProps = {
  item: AutocoreNavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
  isEditing?: boolean;
  onHideNav?: (navId: SidebarNavItemId) => void;
  jiggleDelay?: number;
};

function NavItemCountBadge({ count }: { count: number }) {
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-muted-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function EditRemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick();
      }}
      className="absolute left-0 top-1/2 z-10 flex size-4 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      title="Скрыть"
    >
      <Minus className="size-2.5" strokeWidth={2.5} />
    </button>
  );
}

function NavCollapsibleItem({
  item,
  collapsed = false,
  onNavigate,
  isEditing = false,
  onHideNav,
  jiggleDelay = 0,
}: NavCollapsibleItemProps) {
  const routeOpen = Boolean(item.isActive || item.subItems?.some((sub) => sub.isActive));
  const [open, setOpen] = useState(routeOpen);

  useEffect(() => {
    if (routeOpen) {
      setOpen(true);
    }
  }, [routeOpen]);

  const collapsedHref =
    item.subItems?.find((sub) => sub.isActive)?.path ?? item.subItems?.[0]?.path ?? item.path;

  const editShellClass = cn(
    isEditing && "relative animate-sidebar-jiggle pl-4",
    isEditing && "pointer-events-auto",
  );
  const editStyle = isEditing ? { animationDelay: `${jiggleDelay}s` } : undefined;

  const handleHide = () => {
    if (item.navId) onHideNav?.(item.navId);
  };

  if (!item.subItems?.length || collapsed) {
    return (
      <SidebarMenuItem className={editShellClass} style={editStyle}>
        {isEditing && item.navId ? <EditRemoveButton onClick={handleHide} /> : null}
        <SidebarMenuButton
          isActive={item.isActive}
          tooltip={item.title}
          size={collapsed ? "default" : "default"}
          className={cn(collapsed && "size-8! justify-center p-2!")}
          render={
            isEditing ? undefined : (collapsed ? collapsedHref : item.path) ? (
              <Link
                href={(collapsed ? collapsedHref : item.path) ?? "/"}
                onClick={() => onNavigate?.()}
              />
            ) : undefined
          }
        >
          {item.icon}
          {!collapsed ? (
            <>
              <span data-sidebar-hide-collapsed className="min-w-0 flex-1 truncate">
                {item.title}
              </span>
              {item.badge != null && item.badge > 0 ? (
                <NavItemCountBadge count={item.badge} />
              ) : null}
            </>
          ) : null}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("group/collapsible", editShellClass)}
      style={editStyle}
      render={<SidebarMenuItem />}
    >
      {isEditing && item.navId ? <EditRemoveButton onClick={handleHide} /> : null}
      <CollapsibleTrigger
        className="group w-full"
        render={<SidebarMenuButton isActive={item.isActive} tooltip={item.title} />}
      >
        {item.icon}
        <span data-sidebar-hide-collapsed className="min-w-0 flex-1 truncate">
          {item.title}
        </span>
        <span
          data-sidebar-hide-collapsed
          className="ml-auto flex shrink-0 items-center gap-0.5"
        >
          {item.badge != null && item.badge > 0 ? (
            <NavItemCountBadge count={item.badge} />
          ) : null}
          <ChevronRightIcon className="size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[panel-open]:rotate-90 motion-reduce:transition-none" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.subItems.map((subItem, index) => (
            <SidebarMenuSubItem
              key={subItem.title}
              className={cn(isEditing && "relative animate-sidebar-jiggle pl-3")}
              style={isEditing ? { animationDelay: `${(jiggleDelay + index) * 0.04}s` } : undefined}
            >
              {isEditing && subItem.navId ? (
                <EditRemoveButton onClick={() => subItem.navId && onHideNav?.(subItem.navId)} />
              ) : null}
              <SidebarMenuSubButton
                isActive={subItem.isActive}
                render={
                  isEditing ? undefined : subItem.path ? (
                    <Link href={subItem.path} onClick={() => onNavigate?.()} />
                  ) : undefined
                }
              >
                {subItem.icon}
                <span>{subItem.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AutocoreNavGroup({
  label,
  items,
  blockId,
  collapsed = false,
  onNavigate,
  isEditing = false,
  onHideNav,
  onHideBlock,
}: AutocoreNavGroupProps) {
  return (
    <SidebarGroup className={cn(collapsed && "p-1", isEditing && blockId && "relative")}>
      {label && !collapsed ? (
        <div className="relative flex items-center">
          {isEditing && blockId ? (
            <EditRemoveButton onClick={() => onHideBlock?.(blockId)} />
          ) : null}
          <SidebarGroupLabel className={cn(isEditing && blockId && "pl-4")}>{label}</SidebarGroupLabel>
        </div>
      ) : null}
      <SidebarMenu className={cn(collapsed && "gap-1")}>
        {items.map((item, index) => (
          <NavCollapsibleItem
            key={item.title}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
            isEditing={isEditing}
            onHideNav={onHideNav}
            jiggleDelay={index * 0.04}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
