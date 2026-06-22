const SESSION_KEY = "autocore.motor-import.session";
const DISMISSED_KEY = "autocore.motor-import.dismissed";

/** In-memory dismissals — instant UI hide before localStorage round-trip / Firestore sync. */
const dismissedInMemory = new Set<string>();

export type MotorImportSession = {
  jobId: string;
  fileName?: string;
  startedAt: number;
};

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  const list = [...ids].slice(-40);
  window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
}

export function readMotorImportSession(): MotorImportSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MotorImportSession>;
    if (!parsed.jobId || typeof parsed.jobId !== "string") return null;
    return {
      jobId: parsed.jobId,
      fileName: typeof parsed.fileName === "string" ? parsed.fileName : undefined,
      startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeMotorImportSession(session: MotorImportSession) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearMotorImportSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
}

export function isMotorImportJobDismissed(jobId: string): boolean {
  return dismissedInMemory.has(jobId) || readDismissedIds().has(jobId);
}

export function dismissMotorImportJob(jobId: string) {
  dismissedInMemory.add(jobId);
  const ids = readDismissedIds();
  ids.add(jobId);
  writeDismissedIds(ids);
}

export function isActiveMotorImportSession(jobId: string, pendingJobId: string | null): boolean {
  if (isMotorImportJobDismissed(jobId)) return false;
  if (pendingJobId === jobId) return true;
  const session = readMotorImportSession();
  return session?.jobId === jobId;
}
