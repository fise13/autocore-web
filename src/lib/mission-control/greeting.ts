import { userCopy } from "@/lib/user-copy";

export function resolveGreeting(date = new Date()): string {
  const hour = date.getHours();
  const { greetingMorning, greetingDay, greetingEvening, greetingNight } =
    userCopy.missionControl.employee;
  if (hour >= 5 && hour < 12) return greetingMorning;
  if (hour >= 12 && hour < 18) return greetingDay;
  if (hour >= 18 && hour < 23) return greetingEvening;
  return greetingNight;
}

export function resolveProfileHeadline(displayName: string | null | undefined): string {
  const trimmed = displayName?.trim();
  if (!trimmed) return userCopy.missionControl.employee.profileFallback;
  const [firstName] = trimmed.split(/\s+/);
  return firstName || trimmed;
}
