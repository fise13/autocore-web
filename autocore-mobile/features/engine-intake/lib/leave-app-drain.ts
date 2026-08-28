/**
 * Drain policy for the moment the person leaves the app.
 *
 * Killing the process is the fast path: JS dies before `pause_session` can
 * land, in-flight PUTs stay on the iOS background URLSession, and the next
 * launch finalizes whatever Storage already has. Leaving used to be slower
 * because the camera sent pause as a live request — production still answers
 * "Resume the session before taking photos" — and because a torn-down fetch
 * finished the drain wave with no second pass, so the remaining photos sat
 * until a 15-minute BGProcessingTask.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

/** Safety cap so a poisoned row cannot spin the leave-app drain forever. */
export const MAX_LEAVE_APP_DRAIN_PASSES = 12;

/**
 * How long one leave-app pass may wait for an in-flight `prepare` to finish
 * or fail. The drain used to treat those rows as "owned" and return immediately,
 * which froze JS before any background URLSession task existed.
 */
export const LEAVE_INFLIGHT_PREPARE_WAIT_MS = 5_000;

export function shouldContinueLeaveAppDrain(input: {
  drainAgain: boolean;
  /** `AppState.currentState` — anything but `active` is a leave. */
  appState: string;
  hasRunnableWork: boolean;
  passes: number;
}): boolean {
  if (input.passes >= MAX_LEAVE_APP_DRAIN_PASSES) return false;
  if (input.drainAgain) return true;
  return input.appState !== 'active' && input.hasRunnableWork;
}

/**
 * After a leave-app drain pass that found nothing drainable, wait for shutter
 * primes that are still in `prepare` — they are why an instant Home swipe
 * used to drop the wave. Held PUTs are the daemon's problem; do not wait.
 */
export function shouldWaitForLeaveInflightPrepares(input: {
  appState: string;
  inflightPrepareCount: number;
}): boolean {
  return input.appState !== 'active' && input.inflightPrepareCount > 0;
}

/**
 * Whether a leave-app drain loop must keep JS alive for this photo.
 *
 * Distinct from "the drain can start a new transfer": an in-flight prepare is
 * not startable (the running call owns it) but it still needs the runtime.
 * A PUT already handed to the background URLSession does not.
 */
export function photoIsLeaveDrainWork(input: {
  heldByDaemon: boolean;
  putStarted: boolean;
  inflightPrepare: boolean;
  jobRunnable: boolean;
}): boolean {
  if (input.heldByDaemon || input.putStarted) return false;
  if (input.inflightPrepare) return true;
  return input.jobRunnable;
}

export type LeaveAppPhotoState = {
  createdAt: string;
  /** `prepare` credentials are on the row and their signed URL is still good. */
  hasUsablePreparedUpload: boolean;
  /** The bytes were already handed to the background URLSession. */
  putStarted: boolean;
};

/**
 * What the leave window should spend itself on, cheapest survival first.
 *
 * The 30s of `beginBackgroundTask` buys JS time, and JS time is only worth
 * anything for work that hands something to a process which outlives it. On
 * iOS that is one thing: starting a PUT on the background URLSession. So the
 * order is by how few round-trips stand between a photo and the daemon.
 *
 *  0. primed already — start the PUT, no network round-trip needed first;
 *  1. not primed — one `prepare` call, then the PUT;
 *  2. PUT already started — the daemon owns those bytes and the server's
 *     Storage trigger finalizes them, so spending the window here would only
 *     buy a finalize that is going to happen anyway.
 *
 * Getting this backwards is what made a swipe-away lose photos: the wave
 * worked through the queue in capture order, burnt its window finalizing the
 * first shots, and the last ones never reached `prepare` at all — so their
 * bytes were never handed to anything that survives.
 */
export function leaveAppPhotoRank(photo: LeaveAppPhotoState): number {
  if (photo.putStarted) return 2;
  return photo.hasUsablePreparedUpload ? 0 : 1;
}

export function orderLeaveAppPhotoWork<T extends LeaveAppPhotoState>(photos: readonly T[]): T[] {
  return [...photos].sort((left, right) => {
    const byRank = leaveAppPhotoRank(left) - leaveAppPhotoRank(right);
    if (byRank !== 0) return byRank;
    return left.createdAt.localeCompare(right.createdAt);
  });
}

/**
 * Whether this photo still needs the JS runtime.
 *
 * Once `putStarted` is true the bytes belong to the background URLSession and
 * Firestore is the Storage trigger's problem. Ending `beginBackgroundTask`
 * while this is still true is how the last shutter-press died on leave: the
 * drain had already skipped the in-flight row, so the assertion was released
 * mid-prepare, and iOS froze the runtime before the PUT existed.
 */
export function photoNeedsLiveRuntime(photo: {
  putStarted: boolean;
  status: string;
}): boolean {
  if (photo.status === 'failed' || photo.status === 'completed') return false;
  return !photo.putStarted;
}

/** `AppState` values that mean the process is about to be suspended. */
export function isLeaveAppRuntime(appState: string): boolean {
  return appState !== 'active';
}

/**
 * When JS should run the leave-app drain.
 *
 * `inactive` is Control Center, the Live Activity presentation beat, and the
 * instant before a lock. Treating it as a leave started a drain that then saw
 * `active` again and skipped finalize — photos sat `uploading` until the app
 * was opened. Native `willResignActive` still begins the 30s assertion.
 * The drain itself waits for `background`.
 */
export function shouldRunLeaveAppDrain(appState: string): boolean {
  return appState === 'background';
}
