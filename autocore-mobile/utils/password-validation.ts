export type PasswordRequirement = {
  id: string;
  text: string;
  test: (password: string) => boolean;
};

export const SIGNUP_PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', text: 'At least 8 characters', test: (password) => password.length >= 8 },
  { id: 'digit', text: 'At least 1 number', test: (password) => /\d/.test(password) },
  { id: 'lower', text: 'At least 1 lowercase letter', test: (password) => /[a-zа-яё]/.test(password) },
  { id: 'upper', text: 'At least 1 uppercase letter', test: (password) => /[A-ZА-ЯЁ]/.test(password) },
];

export type PasswordStrengthState = {
  requirements: Array<PasswordRequirement & { met: boolean }>;
  score: number;
  strengthText: string;
  barTone: 'empty' | 'weak' | 'fair' | 'good' | 'strong';
  isValid: boolean;
};

export function getPasswordStrengthState(password: string): PasswordStrengthState {
  const requirements = SIGNUP_PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
  const score = requirements.filter((requirement) => requirement.met).length;

  let strengthText = 'Enter a password';
  let barTone: PasswordStrengthState['barTone'] = 'empty';

  if (score > 0) {
    if (score <= 2) {
      strengthText = 'Weak password';
      barTone = score <= 1 ? 'weak' : 'fair';
    } else if (score === 3) {
      strengthText = 'Fair password';
      barTone = 'good';
    } else {
      strengthText = 'Strong password';
      barTone = 'strong';
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

export function validateSignupPassword(password: string): string | null {
  const state = getPasswordStrengthState(password);
  if (state.isValid) return null;
  const firstUnmet = state.requirements.find((requirement) => !requirement.met);
  return firstUnmet?.text ?? 'Weak password';
}
