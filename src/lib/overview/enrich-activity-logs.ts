import { ActivityLogEntry, CompanyEmployee } from "@/domain/rbac";
import { userCopy } from "@/lib/user-copy";

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

  return userCopy.activity.actorFallback;
}

export function enrichActivityLogs(
  entries: ActivityLogEntry[],
  employees: CompanyEmployee[],
): ActivityLogEntry[] {
  return entries.map((entry) => {
    const employee = employees.find((item) => item.uid === entry.actor);
    return {
      ...entry,
      actorName: resolveActorDisplayName(entry.actor, employees, entry.actorName),
      actorRole: entry.actorRole ?? employee?.role,
      actorPhotoURL: entry.actorPhotoURL ?? employee?.photoURL,
    };
  });
}
