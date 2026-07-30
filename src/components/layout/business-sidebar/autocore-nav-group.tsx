"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRightIcon, Minus } from "lucide-react";

import type {
  AutocoreNavGroup,
  AutocoreNavItem,
} from "@/components/layout/business-sidebar/autocore-nav-types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { SidebarBlockId, SidebarNavItemId } from "@/lib/navigation/sidebar-customization";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

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
    <span
      title={count.toLocaleString("en-US")}
      className="shrink-0 text-xs tabular-nums tracking-tight text-muted-foreground"
    >
      {count.toLocaleString("en-US")}
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
      title={userCopy.layout.hide}
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
  const router = useRouter();
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

  // Collapsed rail: open collection picker instead of jumping to one child.
  if (collapsed && item.subItems?.length) {
    return (
      <SidebarMenuItem className={editShellClass} style={editStyle}>
        <DropdownMenu>
          <DropdownMenuTrigger
            title={item.title}
            aria-label={item.title}
            render={
              <SidebarMenuButton
                isActive={item.isActive}
                className="size-8! justify-center p-2! data-popup-open:bg-sidebar-accent data-open:bg-sidebar-accent"
              />
            }
          >
            {item.icon}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={10}
            className="w-52 p-1.5"
          >
            {item.subItems.map((subItem) => (
              <DropdownMenuItem
                key={subItem.title}
                className={cn(
                  "cursor-pointer gap-2.5 rounded-lg px-2 py-2",
                  subItem.isActive && "bg-accent text-accent-foreground",
                )}
                onClick={() => {
                  if (!subItem.path) return;
                  onNavigate?.();
                  router.push(subItem.path);
                }}
              >
                {subItem.icon ? (
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center [&_svg]:size-4",
                      subItem.isActive ? "text-accent-foreground" : "text-muted-foreground",
                    )}
                  >
                    {subItem.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate font-medium">{subItem.title}</span>
                {subItem.badge != null && subItem.badge > 0 ? (
                  <NavItemCountBadge count={subItem.badge} />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

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
                  isEditing || !subItem.path
                    ? undefined
                    : (
                        <Link
                          href={subItem.path}
                          onClick={(event) => {
                            onNavigate?.();
                            // Same-route query changes are more reliable via push.
                            event.preventDefault();
                            router.push(subItem.path!);
                          }}
                        />
                      )
                }
              >
                {subItem.icon}
                <span className="min-w-0 flex-1 truncate">{subItem.title}</span>
                {subItem.badge != null && subItem.badge > 0 ? (
                  <NavItemCountBadge count={subItem.badge} />
                ) : null}
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
