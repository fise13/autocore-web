import { ActivityLogEntry, CompanyEmployee } from "@/domain/rbac";

function looksLikeUid(value: string): boolean {
  return value.length >= 20 && !value.includes("@") && !value.includes(" ");
}

export function resolveActorDisplayName(
  actorId: string,
  employees: CompanyEmployee[],
  actorName?: string | null,
): string {
  const trimmed = actorName?.trim();
  if (trimmed && !looksLikeUid(trimmed)) return trimmed;

  const employee = employees.find((item) => item.uid === actorId);
  if (employee?.fullName?.trim()) return employee.fullName.trim();
  if (employee?.email?.includes("@")) return employee.email.split("@")[0] ?? employee.email;

  return "Сотрудник";
}

export function enrichActivityLogs(
  entries: ActivityLogEntry[],
  employees: CompanyEmployee[],
): ActivityLogEntry[] {
  return entries.map((entry) => ({
    ...entry,
    actorName: resolveActorDisplayName(entry.actor, employees, entry.actorName),
    actorRole: entry.actorRole ?? employees.find((item) => item.uid === entry.actor)?.role,
  }));
}
