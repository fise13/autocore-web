const SEEN_AT_KEY = "autocore:document-import-inbox-seen-at";
const DISMISSED_KEY = "autocore:document-import-dismissed-ids";

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(ids)));
}

export function getDocumentImportInboxSeenAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(SEEN_AT_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function markDocumentImportInboxSeen(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEEN_AT_KEY, String(Date.now()));
}

export function getDismissedDocumentImportIds(): Set<string> {
  return readDismissedIds();
}

export function dismissDocumentImport(jobId: string): void {
  const ids = readDismissedIds();
  ids.add(jobId);
  writeDismissedIds(ids);
}

export function countUnreadDocumentImports(
  jobs: Array<{ id: string; createdAt: Date }>,
  seenAt = getDocumentImportInboxSeenAt(),
  dismissed = getDismissedDocumentImportIds(),
): number {
  return jobs.filter(
    (job) => job.createdAt.getTime() > seenAt && !dismissed.has(job.id),
  ).length;
}
