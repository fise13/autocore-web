"use client";

import { UserRound } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type ProfileNameFieldsProps = {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  disabled?: boolean;
  firstNameId?: string;
  lastNameId?: string;
  className?: string;
};

export function ProfileNameFields({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  disabled = false,
  firstNameId = "profile-first-name",
  lastNameId = "profile-last-name",
  className,
}: ProfileNameFieldsProps) {
  const copy = userCopy.auth.login;
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={firstNameId}>{copy.firstNameLabel}</Label>
        <InputGroup>
          <InputGroupInput
            id={firstNameId}
            value={firstName}
            onChange={(event) => onFirstNameChange(event.target.value)}
            autoComplete="given-name"
            placeholder={copy.firstNamePlaceholder}
            disabled={disabled}
            required
          />
          <InputGroupAddon align="inline-start">
            <UserRound aria-hidden />
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={lastNameId}>{copy.lastNameLabel}</Label>
        <InputGroup>
          <InputGroupInput
            id={lastNameId}
            value={lastName}
            onChange={(event) => onLastNameChange(event.target.value)}
            autoComplete="family-name"
            placeholder={copy.lastNamePlaceholder}
            disabled={disabled}
            required
          />
          <InputGroupAddon align="inline-start">
            <UserRound aria-hidden />
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

export function isCompleteFullName(displayName: string | null | undefined): boolean {
  const trimmed = displayName?.trim() ?? "";
  if (!trimmed) return false;
  return trimmed.split(/\s+/).filter(Boolean).length >= 2;
}
