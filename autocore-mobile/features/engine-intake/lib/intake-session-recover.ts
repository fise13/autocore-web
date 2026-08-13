/**
 * When the bay claim expires or Finish clears `activeSessionId`, local photos
 * still point at the dead session. Resume cannot fix that — we must reclaim
 * and rewrite outbox sessionIds. Pure helpers so tests can cover the rewrite.
 */

export type SessionBoundPhoto = {
  id: string;
  companyId: string;
  jobId: string;
  sessionId: string;
};

export type SessionBoundCommand = {
  id: string;
  companyId: string;
  command: {
    type: string;
    payload: { jobId?: string; sessionId?: string; [key: string]: unknown };
  };
};

export function isClaimGoneMessage(message: string | null | undefined): boolean {
  const text = String(message ?? '').toLowerCase();
  return (
    text.includes('session claim is no longer active') ||
    text.includes('engine intake session was not found') ||
    text.includes('job is not in an active intake session') ||
    text.includes('resume the session before taking photos') ||
    text.includes('resume the session before completing field work')
  );
}

export function isClaimGoneError(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error ?? '');
  return isClaimGoneMessage(message);
}

/** True when another worker holds the bay — do not reclaim-loop. */
export function isClaimHeldByOtherMessage(message: string | null | undefined): boolean {
  const text = String(message ?? '').toLowerCase();
  return text.includes('claimed by') || text.includes('assigned to another');
}

/**
 * Point every outbox photo / session-scoped command for a job at `sessionId`.
 * Returns the next arrays (same references when nothing changed).
 */
export function rebindJobSessionIds<
  P extends SessionBoundPhoto,
  C extends SessionBoundCommand,
>(input: {
  companyId: string;
  jobId: string;
  sessionId: string;
  photos: readonly P[];
  commands: readonly C[];
}): { photos: P[]; commands: C[]; rebound: number } {
  let rebound = 0;
  const photos = input.photos.map((photo) => {
    if (
      photo.companyId !== input.companyId ||
      photo.jobId !== input.jobId ||
      photo.sessionId === input.sessionId
    ) {
      return photo;
    }
    rebound += 1;
    return { ...photo, sessionId: input.sessionId };
  });
  const commands = input.commands.map((item) => {
    if (item.companyId !== input.companyId) return item;
    const payload = item.command.payload;
    if (payload.jobId !== input.jobId) return item;
    if (typeof payload.sessionId !== 'string' || payload.sessionId === input.sessionId) {
      return item;
    }
    rebound += 1;
    return {
      ...item,
      command: {
        ...item.command,
        payload: { ...payload, sessionId: input.sessionId },
      },
    };
  });
  return { photos, commands, rebound };
}
