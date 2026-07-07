"use client";

import { AppleIcon, GoogleIcon } from "@/components/auth/auth-brand-icons";
import { AuthProviderKind } from "@/lib/auth/account-info";
import { avatarMonogram } from "@autocore/avatars";
import { userAvatarStyle } from "@/lib/user/user-avatar-style";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string;
  /** Stable id for gradient selection when photo is missing. */
  seed?: string;
  provider?: AuthProviderKind;
  size?: "xs" | "sm" | "md" | "lg";
  showProviderBadge?: boolean;
  className?: string;
};

const sizeClasses = {
  xs: "size-6",
  sm: "size-8",
  md: "size-9",
  lg: "size-14",
} as const;

const monogramSizeClasses = {
  xs: "text-[9px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
} as const;

const badgeSizeClasses = {
  xs: "size-3",
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
  const monogram = avatarMonogram(displayName, email);

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
          className={cn(
            "inline-flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-border/20",
            sizeClasses[size],
            monogramSizeClasses[size],
          )}
          aria-hidden="true"
        >
          {monogram}
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
