"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, CreditCard, LogOut, Settings, UserCircle } from "lucide-react";

import { UserAvatar } from "@/components/account/user-avatar";
import { CompanySwitcherMenu } from "@/components/layout/company-switcher-menu";
import { useAuth } from "@/components/providers/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type SidebarUserMenuProps = {
  collapsed?: boolean;
};

export function SidebarUserMenu({ collapsed = false }: SidebarUserMenuProps) {
  const router = useRouter();
  const { firebaseUser, profile, logout } = useAuth();

  if (!firebaseUser) return null;

  const accountInfo = getAccountProviderInfo(firebaseUser);
  const displayName = profile?.displayName ?? accountInfo?.displayName ?? null;
  const photoURL = profile?.photoURL ?? accountInfo?.photoURL ?? null;
  const email = profile?.email ?? accountInfo?.email ?? "";
  const userSeed = profile?.id ?? firebaseUser.uid ?? email;
  const shortLabel = displayName || email.split("@")[0] || userCopy.account.menuTitle;

  function navigate(href: string) {
    router.push(href);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size={collapsed ? "default" : "lg"}
                className={cn(
                  "cursor-pointer data-[state=open]:bg-sidebar-accent",
                  collapsed && "size-8! justify-center p-0!",
                )}
                tooltip={collapsed ? shortLabel : undefined}
              />
            }
          >
            <UserAvatar
              photoURL={photoURL}
              displayName={displayName}
              email={email}
              seed={userSeed}
              provider={accountInfo?.kind}
              showProviderBadge={!collapsed}
              size="sm"
            />
            {!collapsed ? (
              <>
                <div data-sidebar-hide-collapsed className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">{shortLabel}</p>
                  {email ? (
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  ) : null}
                </div>
                <ChevronsUpDown
                  data-sidebar-hide-collapsed
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </>
            ) : null}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={collapsed ? "right" : "top"}
            align={collapsed ? "start" : "start"}
            className="w-64"
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2">
                <UserAvatar
                  photoURL={photoURL}
                  displayName={displayName}
                  email={email}
                  seed={userSeed}
                  provider={accountInfo?.kind}
                  showProviderBadge
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  {displayName ? (
                    <p className="truncate text-sm font-medium">{displayName}</p>
                  ) : null}
                  <p className="truncate text-xs text-muted-foreground">{email || "—"}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <CompanySwitcherMenu />
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => navigate("/settings?section=account")}
              >
                <UserCircle />
                {userCopy.settings.account}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => navigate("/settings")}>
                <Settings />
                {userCopy.settings.title}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => navigate("/settings?section=billing")}
              >
                <CreditCard />
                {userCopy.billing.title}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                variant="destructive"
                onClick={() => {
                  void logout();
                }}
              >
                <LogOut />
                {userCopy.account.signOut}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
