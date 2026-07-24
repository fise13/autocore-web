"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { useMotorWarrantyRealtime } from "@/hooks/use-motor-warranty-realtime";
import { buildWarrantyVerifyUrl } from "@/components/documents/shared/document-qr";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";

type MotorWarrantyCardProps = {
  companyId: string;
  motorId: string;
};

export function MotorWarrantyCard({ companyId, motorId }: MotorWarrantyCardProps) {
  const { warranty, isLoading } = useMotorWarrantyRealtime(companyId, motorId);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">{userCopy.motors.warrantyCard.loading}</p>;
  }

  if (!warranty) {
    return <p className="text-xs text-muted-foreground">{userCopy.motors.warrantyCard.missing}</p>;
  }

  return (
    <div className="rounded-xl border bg-card p-3 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <ShieldCheck className="size-4 text-primary" />
        {userCopy.motors.warrantyCard.title(warranty.status)}
      </div>
      <p className="text-xs text-muted-foreground">
        {userCopy.motors.warrantyCard.until(new Intl.DateTimeFormat(getActiveUserCopyLocale() === "en" ? "en-US" : "ru-KZ").format(warranty.expiresAt))}
      </p>
      <Link
        href={buildWarrantyVerifyUrl(warranty.verificationToken)}
        target="_blank"
        className="mt-2 inline-block text-xs text-primary hover:underline"
      >
        {userCopy.motors.warrantyCard.checkQr}
      </Link>
    </div>
  );
}
