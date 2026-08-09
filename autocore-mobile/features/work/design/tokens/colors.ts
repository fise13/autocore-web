/** Work OS private palette — Apple Health rings × Stripe ops slate. */
export type WorkOsTone =
  | 'canvas'
  | 'surface'
  | 'elevated'
  | 'ink'
  | 'inkSecondary'
  | 'inkMuted'
  | 'border'
  | 'borderStrong'
  | 'accent'
  | 'accentMuted'
  | 'success'
  | 'successMuted'
  | 'warning'
  | 'warningMuted'
  | 'danger'
  | 'dangerMuted'
  | 'ringOpen'
  | 'ringProgress'
  | 'ringWaiting'
  | 'ringCompleted'
  | 'ringIntake'
  | 'ringClaimable'
  | 'stripeBlue'
  | 'stripeIndigo'
  | 'kpiPositive'
  | 'kpiNegative'
  | 'tableHeader'
  | 'tableRow'
  | 'tableRowAlt'
  | 'chip'
  | 'chipActive'
  | 'skeleton'
  | 'overlay';

export type WorkOsColorScheme = Record<WorkOsTone, string>;

export const workOsLight: WorkOsColorScheme = {
  canvas: '#F6F7F9',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  ink: '#0A2540',
  inkSecondary: '#425466',
  inkMuted: '#697386',
  border: '#E6EBF1',
  borderStrong: '#C7D0DB',
  accent: '#635BFF',
  accentMuted: '#EEEDFE',
  success: '#0D9488',
  successMuted: '#E6FAF7',
  warning: '#F59E0B',
  warningMuted: '#FFF7E6',
  danger: '#E11D48',
  dangerMuted: '#FFE4E9',
  ringOpen: '#0A84FF',
  ringProgress: '#30D158',
  ringWaiting: '#FF9F0A',
  ringCompleted: '#64D2FF',
  ringIntake: '#BF5AF2',
  ringClaimable: '#FF375F',
  stripeBlue: '#533AFD',
  stripeIndigo: '#7A73FF',
  kpiPositive: '#0E9F6E',
  kpiNegative: '#E0245E',
  tableHeader: '#F7F9FC',
  tableRow: '#FFFFFF',
  tableRowAlt: '#FAFBFC',
  chip: '#EEF2F6',
  chipActive: '#0A2540',
  skeleton: '#E8EEF4',
  overlay: 'rgba(10, 37, 64, 0.45)',
};

export const workOsDark: WorkOsColorScheme = {
  canvas: '#0B1220',
  surface: '#121A2B',
  elevated: '#1A2438',
  ink: '#F5F7FA',
  inkSecondary: '#C4CDD8',
  inkMuted: '#8B97A8',
  border: '#243044',
  borderStrong: '#334155',
  accent: '#8B85FF',
  accentMuted: '#2A2750',
  success: '#2DD4BF',
  successMuted: '#12352F',
  warning: '#FBBF24',
  warningMuted: '#3A2A0A',
  danger: '#FB7185',
  dangerMuted: '#3F1520',
  ringOpen: '#409CFF',
  ringProgress: '#30D158',
  ringWaiting: '#FFB340',
  ringCompleted: '#70D7FF',
  ringIntake: '#DA8FFF',
  ringClaimable: '#FF6482',
  stripeBlue: '#7A73FF',
  stripeIndigo: '#A5A0FF',
  kpiPositive: '#34D399',
  kpiNegative: '#FB7185',
  tableHeader: '#152033',
  tableRow: '#121A2B',
  tableRowAlt: '#101826',
  chip: '#1E2A3D',
  chipActive: '#F5F7FA',
  skeleton: '#1E2A3D',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export function workOsColors(scheme: 'light' | 'dark'): WorkOsColorScheme {
  return scheme === 'dark' ? workOsDark : workOsLight;
}

export const RING_COLOR_KEY: Record<string, keyof WorkOsColorScheme> = {
  open: 'ringOpen',
  progress: 'ringProgress',
  waiting: 'ringWaiting',
  completed: 'ringCompleted',
  intake: 'ringIntake',
  claimable: 'ringClaimable',
  offline: 'inkMuted',
  danger: 'danger',
};
