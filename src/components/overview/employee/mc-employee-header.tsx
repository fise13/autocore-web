"use client";

import { UserAvatar } from "@/components/account/user-avatar";
import { UserEntity } from "@/domain/user";
import { resolveGreeting, resolveProfileHeadline } from "@/lib/overview/greeting";
import { userCopy } from "@/lib/user-copy";
import { resolveUserAvatarSeed } from "@/lib/user/user-avatar-style";
import { ROLE_LABELS } from "@/components/work-orders/work-order-copy";

type McEmployeeHeaderProps = {
  profile: UserEntity;
};

export function McEmployeeHeader({ profile }: McEmployeeHeaderProps) {
  const greeting = resolveGreeting();
  const headline = resolveProfileHeadline(profile.displayName);
  const roleLabel = ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] ?? profile.role;

  return (
    <div className="col-span-full flex items-center justify-between gap-4 rounded-xl border bg-card/80 p-4 md:p-5">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">{headline}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {roleLabel} · {userCopy.overview.employee.subtitle}
        </p>
      </div>
      <UserAvatar
        displayName={profile.displayName ?? profile.email}
        photoURL={profile.photoURL}
        seed={resolveUserAvatarSeed({
          profileId: profile.id,
          uid: profile.id,
          email: profile.email,
        })}
        size="lg"
        className="shrink-0"
      />
    </div>
  );
}
