"use client";

import { AppleIcon, GoogleIcon } from "@/components/auth/auth-brand-icons";
import { AuthProviderKind, getAccountInitials } from "@/lib/auth/account-info";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string;
  provider?: AuthProviderKind;
  size?: "sm" | "md" | "lg";
  showProviderBadge?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "size-8 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-14 text-base",
} as const;

const badgeSizeClasses = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

export function UserAvatar({
  photoURL,
  displayName,
  email = "",
  provider,
  size = "md",
  showProviderBadge = false,
  className,
}: UserAvatarProps) {
  const initials = getAccountInitials(displayName, email);

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoURL}
          alt=""
          referrerPolicy="no-referrer"
          className={cn(
            "rounded-full object-cover ring-1 ring-border/40",
            sizeClasses[size],
          )}
        />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/75 font-semibold text-primary-foreground shadow-sm",
            sizeClasses[size],
          )}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}

      {showProviderBadge && provider && provider !== "email" && provider !== "unknown" ? (
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 inline-flex items-center justify-center rounded-full border border-background bg-background p-0.5 shadow-sm",
            badgeSizeClasses[size],
          )}
        >
          {provider === "google" ? (
            <GoogleIcon className="size-full" />
          ) : (
            <AppleIcon className="size-full text-foreground" />
          )}
        </span>
      ) : null}
    </span>
  );
}
