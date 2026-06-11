import { z } from "zod";

export type PasswordRequirement = {
  id: string;
  text: string;
  test: (password: string) => boolean;
};

export const SIGNUP_PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: "length", text: "Минимум 8 символов", test: (password) => password.length >= 8 },
  { id: "digit", text: "Хотя бы 1 цифра", test: (password) => /\d/.test(password) },
  {
    id: "lower",
    text: "Хотя бы 1 строчная буква",
    test: (password) => /[a-zа-яё]/.test(password),
  },
  {
    id: "upper",
    text: "Хотя бы 1 заглавная буква",
    test: (password) => /[A-ZА-ЯЁ]/.test(password),
  },
];

export type PasswordStrengthState = {
  requirements: Array<PasswordRequirement & { met: boolean }>;
  score: number;
  strengthText: string;
  barTone: "empty" | "weak" | "fair" | "good" | "strong";
  isValid: boolean;
};

export function getPasswordStrengthState(password: string): PasswordStrengthState {
  const requirements = SIGNUP_PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
  const score = requirements.filter((requirement) => requirement.met).length;

  let strengthText = "Введите пароль";
  let barTone: PasswordStrengthState["barTone"] = "empty";

  if (score > 0) {
    if (score <= 2) {
      strengthText = "Слабый пароль";
      barTone = score <= 1 ? "weak" : "fair";
    } else if (score === 3) {
      strengthText = "Средний пароль";
      barTone = "good";
    } else {
      strengthText = "Надёжный пароль";
      barTone = "strong";
    }
  }

  return {
    requirements,
    score,
    strengthText,
    barTone,
    isValid: score === SIGNUP_PASSWORD_REQUIREMENTS.length,
  };
}

export const signupPasswordSchema = z
  .string()
  .min(8, "Минимум 8 символов")
  .regex(/\d/, "Нужна хотя бы одна цифра")
  .regex(/[a-zа-яё]/, "Нужна хотя бы одна строчная буква")
  .regex(/[A-ZА-ЯЁ]/, "Нужна хотя бы одна заглавная буква");

export type PasswordStrength = "weak" | "fair" | "strong";

export function validateSignupPassword(password: string): string | null {
  const state = getPasswordStrengthState(password);
  if (state.isValid) return null;
  const firstUnmet = state.requirements.find((requirement) => !requirement.met);
  return firstUnmet?.text ?? "Слабый пароль";
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
