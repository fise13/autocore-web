"use client";

import { AppleIcon, GoogleIcon } from "@/components/auth/auth-brand-icons";
import { AuthProviderKind } from "@/lib/auth/account-info";
import { userAvatarStyle } from "@/lib/user/user-avatar-style";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string;
  /** Stable id for gradient selection when photo is missing. */
  seed?: string;
  provider?: AuthProviderKind;
  size?: "sm" | "md" | "lg";
  showProviderBadge?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "size-8",
  md: "size-9",
  lg: "size-14",
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
  seed,
  provider,
  size = "md",
  showProviderBadge = false,
  className,
}: UserAvatarProps) {
  const gradientSeed = seed ?? (email.trim() || displayName?.trim() || "user");

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
          style={userAvatarStyle(gradientSeed)}
          className={cn("inline-block rounded-full ring-1 ring-border/20", sizeClasses[size])}
          aria-hidden="true"
        />
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
