import { z } from "zod";

import { getActiveUserCopyLocale } from "@/lib/user-copy";
import { userCopyEn } from "@/lib/user-copy.en";
import { userCopyRu } from "@/lib/user-copy.ru";

export type PasswordRequirement = {
  id: string;
  text: string;
  test: (password: string) => boolean;
};

function loginCopy() {
  return getActiveUserCopyLocale() === "en" ? userCopyEn.auth.login : userCopyRu.auth.login;
}

function buildRequirements(): PasswordRequirement[] {
  const copy = loginCopy();
  return [
    { id: "length", text: copy.reqLength, test: (password) => password.length >= 8 },
    { id: "digit", text: copy.reqDigit, test: (password) => /\d/.test(password) },
    {
      id: "lower",
      text: copy.reqLower,
      test: (password) => /[a-zа-яё]/.test(password),
    },
    {
      id: "upper",
      text: copy.reqUpper,
      test: (password) => /[A-ZА-ЯЁ]/.test(password),
    },
  ];
}

/** Locale-aware signup requirements (call each time — EN/RU text follows active locale). */
export function getSignupPasswordRequirements(): PasswordRequirement[] {
  return buildRequirements();
}

/** @deprecated Prefer getSignupPasswordRequirements() — snapshot at module load is locale-stale. */
export const SIGNUP_PASSWORD_REQUIREMENTS: PasswordRequirement[] = buildRequirements();

export type PasswordStrengthState = {
  requirements: Array<PasswordRequirement & { met: boolean }>;
  score: number;
  strengthText: string;
  barTone: "empty" | "weak" | "fair" | "good" | "strong";
  isValid: boolean;
};

export function getPasswordStrengthState(password: string): PasswordStrengthState {
  const copy = loginCopy();
  const requirements = buildRequirements().map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
  const score = requirements.filter((requirement) => requirement.met).length;

  let strengthText: string = copy.passwordEnter;
  let barTone: PasswordStrengthState["barTone"] = "empty";

  if (score > 0) {
    if (score <= 2) {
      strengthText = copy.passwordWeak;
      barTone = score <= 1 ? "weak" : "fair";
    } else if (score === 3) {
      strengthText = copy.passwordFair;
      barTone = "good";
    } else {
      strengthText = copy.passwordStrong;
      barTone = "strong";
    }
  }

  return {
    requirements,
    score,
    strengthText,
    barTone,
    isValid: score === requirements.length,
  };
}

export const signupPasswordSchema = z
  .string()
  .min(8, userCopyRu.auth.login.reqLength)
  .regex(/\d/, userCopyRu.auth.login.reqDigit)
  .regex(/[a-zа-яё]/, userCopyRu.auth.login.reqLower)
  .regex(/[A-ZА-ЯЁ]/, userCopyRu.auth.login.reqUpper);

export type PasswordStrength = "weak" | "fair" | "strong";

export function validateSignupPassword(password: string): string | null {
  const state = getPasswordStrengthState(password);
  if (state.isValid) return null;
  const firstUnmet = state.requirements.find((requirement) => !requirement.met);
  return firstUnmet?.text ?? loginCopy().passwordWeak;
}

/** @deprecated Use getPasswordStrengthState instead */
export function passwordStrength(password: string): PasswordStrength {
  const { score } = getPasswordStrengthState(password);
  if (score >= 4) return "strong";
  if (score >= 2) return "fair";
  return "weak";
}

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: "Слабый",
  fair: "Нормальный",
  strong: "Надёжный",
};

export const PASSWORD_BAR_SEGMENT_CLASS: Record<PasswordStrengthState["barTone"], string> = {
  empty: "bg-border",
  weak: "bg-red-500",
  fair: "bg-orange-500",
  good: "bg-amber-500",
  strong: "bg-emerald-500",
};
