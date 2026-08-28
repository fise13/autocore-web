import { isClaimHeldByOtherMessage } from './intake-session-recover';

/**
 * What a failed `claim_job` means for the person who just tapped Continue.
 *
 * Continue used to await the claim round-trip before opening the camera, and
 * treat any 4xx as fatal. Both were wrong in the same way: they made a local,
 * already-safe action depend on the network.
 *
 * `EngineIntakeCommandError` defaults to **409**, so a large family of
 * transient server answers — a claim lease the server has not expired yet, a
 * session the previous Finish has not cleared because its photos are still
 * uploading — arrived as 4xx and were rethrown as "Engine could not be
 * opened". Meanwhile the await itself starved: the claim POST competes for the
 * pipe with up to four parallel photo uploads, so during a sync wave Continue
 * simply spun.
 *
 * Only two things genuinely stop a worker opening the camera: somebody else
 * holds the bay, or the job is in a state that cannot be captured into. Every
 * other failure is a reason to open the camera anyway and let the queue sort
 * the claim out — the photos are safe on the device either way, and refusing
 * to open only loses work.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

export type ClaimBlockReason = 'held-by-other' | 'not-permitted' | 'unclaimable-state';

export type ClaimOutcome =
  | { action: 'queued' }
  | { action: 'blocked'; reason: ClaimBlockReason; message: string };

type ErrorLike = { status?: number; message?: string };

/** "Job cannot be claimed while completed" and friends — a real dead end. */
function isUnclaimableStateMessage(text: string): boolean {
  return text.includes('cannot be claimed while');
}

export function resolveClaimOutcome(error: unknown): ClaimOutcome {
  const candidate = (error ?? {}) as ErrorLike;
  const raw = String(candidate.message ?? '');
  const text = raw.toLowerCase();

  if (isClaimHeldByOtherMessage(text)) {
    return {
      action: 'blocked',
      reason: 'held-by-other',
      message: raw || 'Another worker holds this engine.',
    };
  }

  if (candidate.status === 403) {
    return {
      action: 'blocked',
      reason: 'not-permitted',
      message: raw || 'Your role cannot open this engine.',
    };
  }

  if (isUnclaimableStateMessage(text)) {
    return {
      action: 'blocked',
      reason: 'unclaimable-state',
      message: raw || 'This engine cannot be opened right now.',
    };
  }

  // Everything else — offline, timeout, 5xx, 429, and the whole 409 family the
  // server uses for transient claim state — opens the camera and lets the
  // drain's reclaim path settle the claim.
  return { action: 'queued' };
}

/**
 * Whether Continue may open the camera straight away, before the claim has
 * been anywhere near the network.
 *
 * True whenever the device already holds the claim locally — including a claim
 * that only exists in the optimistic overlay, which is written synchronously
 * and persisted, so the camera has everything it needs.
 */
export function canOpenSessionImmediately(input: {
  activeSessionId: string | null | undefined;
  claimedByUid: string | null | undefined;
  claimDeviceId: string | null | undefined;
  uid: string;
  deviceId: string;
}): boolean {
  return Boolean(
    input.activeSessionId &&
      input.claimedByUid === input.uid &&
      input.claimDeviceId === input.deviceId,
  );
}

/**
 * Whether the session screen may show the camera for `sessionId`, given that
 * the server snapshot does not (yet) name it as the active session.
 *
 * The gate used to require a `claim_job` row sitting in the outbox, which only
 * exists when the claim already failed. Now that Continue opens the camera
 * before the claim is sent, the ordinary happy path spends a moment with the
 * claim in neither the server snapshot nor the outbox — and the gate would
 * have thrown the worker out of a session they legitimately hold.
 *
 * The optimistic overlay is the authority for that window: it is written
 * synchronously and persisted before the screen is even routed to.
 */
export function canShowSessionForLocalClaim(input: {
  sessionId: string;
  /** Session ids the optimistic overlay holds for this job. */
  overlaySessionIds: readonly string[];
  /** Whether a claim/create command for this job is waiting in the outbox. */
  hasPendingClaimCommand: boolean;
}): boolean {
  if (input.hasPendingClaimCommand) return true;
  return input.overlaySessionIds.includes(input.sessionId);
}

/**
 * Whether the camera should leave because the bay claim is actually gone.
 *
 * The session screen used to treat any Firestore snapshot that did not yet
 * name this `sessionId` as a lost claim — including the window after Continue
 * opens the camera, while the claim is in flight and the optimistic overlay
 * is the only record of it. That painted "Session claim was released" and
 * dumped the worker back to Engines the moment they opened the shutter.
 *
 * Stay in the camera whenever this device still holds the session locally,
 * even if the server copy is paused or the lease looks stale. Kick only for
 * a cancelled engine/session, or a bay someone else holds.
 */
export function isSessionClaimLost(input: {
  jobState: string;
  sessionState: string | null | undefined;
  assignmentSessionId: string | null | undefined;
  claimedByUid: string | null | undefined;
  uid: string;
  routeSessionId: string;
  overlaySessionIds: readonly string[];
  hasPendingClaimCommand: boolean;
}): boolean {
  if (input.jobState === 'cancelled') return true;
  if (input.sessionState === 'cancelled') return true;

  if (
    canShowSessionForLocalClaim({
      sessionId: input.routeSessionId,
      overlaySessionIds: input.overlaySessionIds,
      hasPendingClaimCommand: input.hasPendingClaimCommand,
    })
  ) {
    return false;
  }

  if (
    input.assignmentSessionId === input.routeSessionId &&
    input.claimedByUid === input.uid
  ) {
    return false;
  }

  if (input.claimedByUid && input.claimedByUid !== input.uid) {
    return true;
  }

  return true;
}

/**
 * iOS reports `inactive` for Control Center, permission prompts, and the
 * camera coming online — none of those are leaving the app. Pause the
 * session only when the process is actually backgrounded.
 */
export function shouldPauseIntakeSession(appState: string): boolean {
  return appState === 'background';
}

/**
 * The server refused because the engine is not where this phone thought it was.
 *
 * Not a failure of the tap — a disagreement about state, and the server is
 * right. Two red cards reading "Job is not ready for verification" and "Job is
 * not awaiting verification" are what this looked like before: internal state
 * names shown to a person standing in a yard, with a Retry button that could
 * only ever produce the same answer.
 *
 * Pure — no React Native — so the node test runner can load it.
 */
export function isJobStateMismatchError(error: unknown): boolean {
  const text = String(
    error && typeof error === 'object' && 'message' in error
      ? ((error as { message?: unknown }).message ?? '')
      : (error ?? ''),
  ).toLowerCase();
  return (
    text.includes('not ready for verification') ||
    text.includes('not awaiting verification') ||
    text.includes('cannot be claimed while') ||
    text.includes('no longer open for photos') ||
    text.includes('cannot transition from')
  );
}
