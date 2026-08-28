import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { Directory, File, Paths, UploadTask, UploadType } from 'expo-file-system';
import type {
  EngineIntakeCommand,
  EngineIntakeCommandResult,
  IntakePhotoCategory,
  PrepareIntakePhotoRequest,
} from '@autocore/engine-intake';

import { MobileApiError } from '@/services/api/mobile-client';
import { beginBackgroundExecution } from '@/lib/offline/background-execution';
import { getJson, setJson } from '@/lib/storage/kv';
import { engineIntakeId, getEngineIntakeDeviceId, getEngineIntakeDeviceName } from '../lib/device';
import { commandFailureAbortsDrainWave, orderIntakeDrainWork } from '../lib/intake-drain-order';
import {
  LEAVE_INFLIGHT_PREPARE_WAIT_MS,
  orderLeaveAppPhotoWork,
  photoIsLeaveDrainWork,
  photoNeedsLiveRuntime,
  shouldContinueLeaveAppDrain,
  shouldRunLeaveAppDrain,
  shouldWaitForLeaveInflightPrepares,
} from '../lib/leave-app-drain';
import { fileNameForIntakePhoto, normalizeIntakePhotoPayload } from '../lib/intake-photo-payload';
import { optimizeIntakePhotoFile } from '../lib/optimize-intake-photo';
import { resolvePhotoUploadSession } from '../lib/photo-upload-session';
import { resolvePreparedPhotoStep } from '../lib/prepared-photo-step';
import {
  isPreparedUploadUsable,
  preparedUploadExpiresAt,
  withPreparedUploadDefaults,
  type PreparedIntakeUpload,
} from '../lib/prepared-upload';
import {
  isClaimGoneError,
  isClaimHeldByOtherMessage,
  rebindJobSessionIds,
} from '../lib/intake-session-recover';
import {
  mapPool,
  PHOTO_UPLOAD_CONCURRENCY,
  withPhotoUploadSlot,
} from '../lib/intake-upload-pool';
import { classifySyncError, describeSyncError, isBenignCancelError, isBenignFieldCompleteError, isIdempotentPhotoSuccess, isTransportSyncError, shouldRequeueAfterAppLeave, shouldReviveFailedSyncRow, syncErrorMessage, syncErrorNeedsPerson, SYNC_ERROR_MESSAGES, type SyncErrorInfo } from '../lib/sync-errors';
import {
  isJobRunnable,
  reconcileOnLaunch,
  resolveFailureTransition,
  type SyncJobStatus,
} from '../lib/sync-schedule';
import {
  finalizeEngineIntakePhoto,
  prepareEngineIntakePhoto,
  sendEngineIntakeCommand,
} from '../services/engine-intake-api';
import {
  markIntakeJobReady,
  restoreIntakeJobReady,
} from './intake-local-overlay';
import {
  clearIntakeUploadProgress,
  setIntakeUploadProgress,
} from './intake-upload-progress';

const STORAGE_KEY = 'engine-intake:outbox:v2';
const LEGACY_STORAGE_KEY = 'engine-intake:outbox:v1';

/**
 * `state` is kept as a derived mirror of `status` so the camera, the bay list,
 * the banner and the home dashboard keep reading the field they already read.
 * `status` is the real one — it is what the scheduler and the Live Activity use.
 */
export function legacyState(status: SyncJobStatus): 'pending' | 'syncing' | 'failed' {
  if (status === 'uploading') return 'syncing';
  if (status === 'failed') return 'failed';
  return 'pending';
}

type SyncJobFields = {
  status: SyncJobStatus;
  attemptCount: number;
  nextRetryAt: string | null;
  errorInfo: SyncErrorInfo | null;
  updatedAt: string;
};

export type IntakeOutboxCommand = SyncJobFields & {
  id: string;
  companyId: string;
  command: EngineIntakeCommand;
  /** @deprecated Mirror of `status` — read `status`. */
  state: 'pending' | 'syncing' | 'failed';
  /** @deprecated Mirror of `attemptCount`. */
  attempts: number;
  lastError: string | null;
  createdAt: string;
};

export type IntakeOutboxPhoto = {
  id: string;
  companyId: string;
  jobId: string;
  sessionId: string;
  deviceId: string;
  requirementId: string | null;
  category: IntakePhotoCategory;
  localUri: string;
  capturedAt: string;
  /**
   * The server's photo id, once `prepare` has minted one.
   *
   * The server starts counting a photo at `prepare`, long before its bytes
   * arrive, so without this the phone had no way to tell which of its rows the
   * job document already included — and every screen that added the two
   * together over-reported the shoot. Persisted, so a relaunch mid-upload does
   * not lose the fact.
   */
  serverPhotoId: string | null;
  /**
   * What `prepare` handed back, so a PUT can be started without asking again.
   *
   * This is the whole reason a photo can reach Firebase while the person is
   * away: handing bytes to the background URLSession is the only step that
   * outlives the JS runtime, and until these credentials were persisted it
   * could not happen without a live round-trip first.
   */
  prepared: PreparedIntakeUpload | null;
  /** When the bytes were handed to the background URLSession (ISO). */
  putStartedAt: string | null;
  /** @deprecated Mirror of `status` — read `status`. */
  state: 'pending' | 'syncing' | 'failed';
  /** @deprecated Mirror of `attemptCount`. */
  attempts: number;
  lastError: string | null;
  createdAt: string;
} & SyncJobFields;

type PersistedOutbox = {
  commands: IntakeOutboxCommand[];
  photos: IntakeOutboxPhoto[];
};

export type IntakeOutboxSnapshot = PersistedOutbox & {
  pendingCount: number;
  failedCount: number;
  syncing: boolean;
  /** Photos waiting to upload (pending + syncing) — Island progress source. */
  photoPendingCount: number;
  /** Photos that failed upload. */
  photoFailedCount: number;
  /** Photos successfully uploaded in the current sync wave. */
  syncedCount: number;
  /** Peak photo count for the current sync wave (synced + still pending). */
  sessionTotal: number;
};

type LegacyRow = { state?: 'pending' | 'syncing' | 'failed'; attempts?: number; lastError?: string | null };

/** v1 rows only had `state`/`attempts`; give them the scheduler fields. */
function upgradeRow<T extends LegacyRow>(row: T): T & SyncJobFields {
  const existing = row as T & Partial<SyncJobFields>;
  if (existing.status) return existing as T & SyncJobFields;
  const status: SyncJobStatus =
    row.state === 'failed' ? 'failed' : row.state === 'syncing' ? 'uploading' : 'queued';
  return {
    ...row,
    status,
    attemptCount: row.attempts ?? 0,
    nextRetryAt: null,
    errorInfo: null,
    updatedAt: new Date().toISOString(),
  } as T & SyncJobFields;
}

function reviveIfTransient<T extends { status: SyncJobStatus; nextRetryAt?: string | null; errorInfo: SyncErrorInfo | null; lastError?: string | null }>(
  row: T,
): T {
  if (
    !shouldReviveFailedSyncRow({
      status: row.status,
      errorInfo: row.errorInfo,
      lastError: row.lastError ?? null,
    })
  ) {
    return row;
  }
  return { ...row, status: 'queued', nextRetryAt: null, errorInfo: null };
}

function loadPersisted(): PersistedOutbox {
  const current = getJson<PersistedOutbox>(STORAGE_KEY);
  const source = current ?? getJson<PersistedOutbox>(LEGACY_STORAGE_KEY) ?? { commands: [], photos: [] };
  return {
    // Launch reconcile: a row left `uploading` means the process died holding
    // it. That is not a failure and the file is still on disk — requeue it.
    // Localized leave-app `fetch failed` used to land as UNKNOWN/failed.
    commands: reconcileOnLaunch((source.commands ?? []).map(upgradeRow)).map(reviveIfTransient),
    photos: reconcileOnLaunch((source.photos ?? []).map(upgradeRow))
      .map(reviveIfTransient)
      // Rows written before `serverPhotoId` existed: unknown, not "never
      // prepared". Their next attempt fills it in, and until then counting them
      // is the safe direction to be wrong in.
      .map((row) => (row.serverPhotoId === undefined ? { ...row, serverPhotoId: null } : row))
      .map(withPreparedUploadDefaults),
  };
}

const initial = loadPersisted();
let commands = initial.commands ?? [];
let photos = initial.photos ?? [];
// Cold start: Finish may already be queued while the bay still reads in_session.
for (const item of commands) {
  if (item.command.type === 'field_complete' && item.status !== 'failed') {
    markIntakeJobReady(item.companyId, item.command.payload.jobId);
  }
}
let syncing = false;
/** Successful photo uploads since the current drain wave started. */
let syncedCount = 0;
/** Photo work size captured when the current drain wave began. */
let sessionTotal = 0;
let snapshot = buildSnapshot();
const listeners = new Set<() => void>();
let drainPromise: Promise<void> | null = null;
/** A drain requested while one is running — retry once so leave-app fetch
 *  failures that requeued as `queued` get a second pass on background time. */
let drainAgain = false;

function isNoiseCommand(command: EngineIntakeCommand): boolean {
  return command.type === 'heartbeat_session';
}

function isConflictPhoto(photo: IntakeOutboxPhoto): boolean {
  if (photo.errorInfo?.code === 'CONFLICT') return true;
  const message = `${photo.lastError ?? ''} ${photo.errorInfo?.message ?? ''}`.toLowerCase();
  return message.includes('already on the server') || message.includes('already recorded');
}

function countPendingCommands(list: IntakeOutboxCommand[]): number {
  return list.filter(
    (item) => !commandNeedsPerson(item) && !isNoiseCommand(item.command),
  ).length;
}

/** Same rule as photos: only a person-blocking command counts as a failure. */
function commandNeedsPerson(item: IntakeOutboxCommand): boolean {
  if (item.status !== 'failed') return false;
  const code = item.errorInfo?.code;
  return code ? syncErrorNeedsPerson(code) : false;
}

function countFailedCommands(list: IntakeOutboxCommand[]): number {
  return list.filter((item) => commandNeedsPerson(item) && !isNoiseCommand(item.command)).length;
}

/**
 * A photo the queue is still working on.
 *
 * A row parked by a dead link counts here, not as a failure: from the yard's
 * point of view nothing has gone wrong, the photo is simply not on the server
 * yet, and it will be. Only a row waiting on a *person* leaves this count.
 */
function countPhotoPending(list: IntakeOutboxPhoto[]): number {
  return list.filter(
    (item) => item.status !== 'completed' && !isConflictPhoto(item) && !photoNeedsPerson(item),
  ).length;
}

/**
 * A photo that will not move until someone does something about it.
 *
 * Deliberately *not* "status === failed". The queue parks rows for reasons the
 * worker has no part in — no signal, a busy server, a claim that has to be
 * retaken — and every one of those used to light up the camera with a red
 * "4 failed" pill over an engine the person had photographed perfectly well.
 */
export function photoNeedsPersonRow(item: IntakeOutboxPhoto): boolean {
  return photoNeedsPerson(item);
}

function photoNeedsPerson(item: IntakeOutboxPhoto): boolean {
  if (item.status !== 'failed') return false;
  if (isConflictPhoto(item)) return false;
  const code = item.errorInfo?.code;
  // No stored code means a row from an older build; treat it as still working
  // rather than as a failure — the launch revive puts it back on the queue.
  return code ? syncErrorNeedsPerson(code) : false;
}

function countPhotoFailed(list: IntakeOutboxPhoto[]): number {
  return list.filter(photoNeedsPerson).length;
}

function buildSnapshot(): IntakeOutboxSnapshot {
  const photoPendingCount = countPhotoPending(photos);
  const photoFailedCount = countPhotoFailed(photos);
  const pendingCount = countPendingCommands(commands) + photoPendingCount;
  const failedCount = countFailedCommands(commands) + photoFailedCount;
  return {
    commands,
    photos,
    pendingCount,
    failedCount,
    syncing,
    photoPendingCount,
    photoFailedCount,
    syncedCount,
    // Never fold failed leftovers into the wave total — that inflated Island to 18/18.
    sessionTotal: Math.max(sessionTotal, syncedCount + photoPendingCount),
  };
}

function resetSyncSession(): void {
  syncedCount = 0;
  sessionTotal = 0;
}

function noteSyncSuccess(): void {
  syncedCount += 1;
}

/** Keeps the deprecated `state`/`attempts` mirrors truthful. */
function mirror<T extends SyncJobFields & { state: unknown; attempts: number; lastError: string | null }>(
  row: T,
): T {
  const state = legacyState(row.status);
  const lastError = row.errorInfo?.message ?? null;
  if (row.state === state && row.attempts === row.attemptCount && row.lastError === lastError) {
    return row;
  }
  return { ...row, state, attempts: row.attemptCount, lastError };
}

function publish(): boolean {
  commands = commands.map(mirror);
  photos = photos.map(mirror);
  const persisted = setJson(STORAGE_KEY, { commands, photos });
  snapshot = buildSnapshot();
  for (const listener of listeners) listener();
  return persisted;
}

/** Serialize outbox mutations while photo PUTs run in parallel. */
let outboxMutationGate: Promise<void> = Promise.resolve();

function withOutboxMutation<T>(fn: () => T): Promise<T> {
  const run = outboxMutationGate.then(fn, fn);
  outboxMutationGate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * One calm sentence for a failure the worker is actually being shown.
 *
 * This used to be a second, independent humaniser sitting on top of
 * `describeSyncError` — a parallel list of substrings with its own opinions,
 * its own English-only matching, and its own fallbacks. Where the two lists
 * disagreed the camera and the Engines banner told the worker different stories
 * about the same photo. `describeSyncError` now produces the only sentence, so
 * this is the thin adapter for the places that still hold a bare string.
 */
export function humanizeIntakeOutboxError(message: string | null | undefined): string {
  const normalized = message?.trim();
  if (!normalized) return syncErrorMessage('UNKNOWN');
  // Already one of ours — `describeSyncError` writes the canned copy into the
  // row, so this is the ordinary path and there is nothing left to translate.
  if (SYNC_ERROR_MESSAGES.has(normalized)) return normalized;
  return syncErrorMessage(classifySyncError({ message: normalized }));
}

function isTerminalError(error: unknown): boolean {
  return error instanceof MobileApiError && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429;
}

function commandFailureBlocksJob(command: EngineIntakeCommand): boolean {
  return (
    command.type === 'create_job' ||
    command.type === 'claim_job' ||
    command.type === 'confirm_identity' ||
    command.type === 'set_location'
  );
}

function updateCommand(
  id: string,
  patch: Partial<Pick<IntakeOutboxCommand, 'status' | 'attemptCount' | 'nextRetryAt' | 'errorInfo'>>,
): void {
  commands = commands.map((item) =>
    item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
  );
  publish();
}

function updatePhoto(
  id: string,
  patch: Partial<Pick<IntakeOutboxPhoto, 'status' | 'attemptCount' | 'nextRetryAt' | 'errorInfo'>>,
): void {
  photos = photos.map((item) =>
    item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
  );
  publish();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): IntakeOutboxSnapshot {
  return snapshot;
}

/** Non-React access, for the headless sync head. */
export const subscribeIntakeOutbox = subscribe;
export const getIntakeOutboxSnapshot = getSnapshot;

/** Company-scoped snapshot for Live Activity / widgets (no React). */
export function getCompanyIntakeOutboxSnapshot(companyId: string): IntakeOutboxSnapshot {
  return snapshotForCompanyCached(getSnapshot(), companyId);
}

function dropQueuedPauseForSession(sessionId: string, publishNow: boolean): void {
  const next = commands.filter(
    (item) =>
      item.command.type !== 'pause_session' ||
      item.command.payload.sessionId !== sessionId,
  );
  if (next.length === commands.length) return;
  commands = next;
  if (publishNow) publish();
}

export function enqueueIntakeCommand(
  companyId: string,
  command: EngineIntakeCommand,
): void {
  const duplicate = commands.some(
    (item) =>
      item.companyId === companyId &&
      item.command.idempotencyKey === command.idempotencyKey,
  );
  if (duplicate) return;

  if (command.type === 'heartbeat_session') {
    commands = commands.filter(
      (item) =>
        item.command.type !== 'heartbeat_session' ||
        item.command.payload.sessionId !== command.payload.sessionId,
    );
  }
  if (command.type === 'pause_session') {
    commands = commands.filter(
      (item) =>
        item.command.type !== 'pause_session' ||
        item.command.payload.sessionId !== command.payload.sessionId,
    );
  }
  if (command.type === 'resume_session') {
    dropQueuedPauseForSession(command.payload.sessionId, false);
  }
  if (command.type === 'field_complete') {
    const finishJobId = command.payload.jobId;
    commands = commands.filter((item) => {
      if (
        item.command.type === 'field_complete' &&
        item.command.payload.jobId === finishJobId
      ) {
        return false;
      }
      if (
        item.command.type === 'pause_session' &&
        item.command.payload.jobId === finishJobId
      ) {
        return false;
      }
      return true;
    });
    // Bay Ready tab must not wait on a lagging Firestore listener — web already
    // shows In review once field_complete lands; phone often still holds in_session.
    markIntakeJobReady(companyId, finishJobId);
  }
  commands = [
    ...commands,
    {
      id: engineIntakeId('command'),
      companyId,
      command,
      state: 'pending',
      attempts: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
      status: 'queued',
      attemptCount: 0,
      nextRetryAt: null,
      errorInfo: null,
      updatedAt: new Date().toISOString(),
    },
  ];
  publish();
}

export function saveIntakePhotoLocally(input: {
  companyId: string;
  jobId: string;
  sessionId: string;
  deviceId: string;
  requirementId: string | null;
  category: IntakePhotoCategory;
  sourceUri: string;
}): IntakeOutboxPhoto {
  const id = engineIntakeId('photo');
  const directory = new Directory(
    Paths.document,
    'engine-intake',
    input.companyId,
    input.jobId,
  );
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  const source = new File(input.sourceUri);
  if (!source.exists) {
    throw new Error('Captured photo is no longer available');
  }
  const destination = new File(directory, `${id}.jpg`);
  // Camera cache and picker temps are on the same volume — rename, don't copy.
  try {
    source.moveSync(destination);
  } catch {
    try {
      source.copySync(destination);
    } catch {
      throw new Error('Storage full — this photo could not be saved on the phone');
    }
  }

  const item: IntakeOutboxPhoto = {
    id,
    companyId: input.companyId,
    jobId: input.jobId,
    sessionId: input.sessionId,
    deviceId: input.deviceId,
    requirementId: input.requirementId,
    category: input.category,
    localUri: destination.uri,
    capturedAt: new Date().toISOString(),
    serverPhotoId: null,
    prepared: null,
    putStartedAt: null,
    state: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    status: 'queued',
    attemptCount: 0,
    nextRetryAt: null,
    errorInfo: null,
    updatedAt: new Date().toISOString(),
  };
  photos = [...photos, item];
  // Freeze the Island denominator on shutter, not on the next drain pass.
  // Drain used to skip in-flight primes, reset the wave, and paint `0/2`.
  sessionTotal = Math.max(sessionTotal, syncedCount + countPhotoPending(photos));
  // Hold JS now — `willResignActive` can lose the race to a lock-the-phone
  // swipe that lands before the AppState handler runs.
  beginBackgroundExecution('intake-sync');
  // The shot is durable and queued as of the line above — that guarantee is
  // never traded for bandwidth. Shrinking it is a best-effort improvement
  // afterwards, and it only lands while the row is still waiting its turn.
  startPhotoOptimization(id);
  // Pause before the PUT lands makes the current production API reject the
  // upload ("Resume the session before taking photos"). Drop it; Finish or a
  // later pause can run after the files are on the server.
  commands = commands.filter(
    (candidate) =>
      candidate.command.type !== 'pause_session' ||
      candidate.command.payload.sessionId !== input.sessionId,
  );
  if (!publish()) {
    throw new Error('Storage full — the photo is on disk but the upload queue could not be saved');
  }
  // Do not wait for the next drain wave to reach this row. A wave is bounded,
  // and on a twelve-shot bay walk the last photos used to sit untouched until
  // the person had already swiped the app away — so their bytes were still on
  // the phone when the JS runtime died. Priming here means the ordinary case
  // is "the PUT is already the daemon's problem before anybody leaves".
  void primeAndStartUpload(id);
  return item;
}

/**
 * Re-encode a queued photo in place, if the compression policy says it is
 * worth it and the upload has not already opened the file.
 *
 * `uploading` is still safe: `transferPhoto` awaits this promise before PUT.
 * Skipping the URI write after a WebP rename left the outbox pointing at a
 * JPEG that this function had already deleted.
 */
async function optimizeQueuedPhoto(photoId: string): Promise<void> {
  const queued = photos.find((item) => item.id === photoId);
  if (!queued) return;
  if (queued.status === 'failed' || queued.status === 'completed') return;
  const outcome = await optimizeIntakePhotoFile(queued.localUri);
  if (!outcome.changed) return;
  const live = photos.find((item) => item.id === photoId);
  if (!live) return;
  if (live.status === 'failed' || live.status === 'completed') return;
  // `uploading` is allowed: transferPhoto awaits this promise before PUT, so
  // the URLSession has not opened the file yet. Skipping the URI write here
  // left the outbox pointing at a JPEG that compression already deleted.
  photos = photos.map((item) =>
    item.id === photoId
      ? {
          ...item,
          localUri: outcome.localUri,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );
  publish();
}

/**
 * Re-encodes still running, keyed by photo id.
 *
 * `ingestPhotoUris` kicks a drain on the next frame, and a re-encode takes
 * 100–300 ms, so without this the drain always won the race: it flipped the
 * row to `uploading`, the optimizer saw a row it must not touch and bailed,
 * and the full-resolution original went over the wire every time. The
 * compression was, in practice, dead code on any usable connection.
 *
 * Uploads now wait for the re-encode of the specific photo they are about to
 * send — never for other photos, so a slow re-encode cannot stall the wave.
 */
const pendingOptimizations = new Map<string, Promise<void>>();

function startPhotoOptimization(photoId: string): void {
  const run = optimizeQueuedPhoto(photoId)
    .catch(() => undefined)
    .finally(() => {
      pendingOptimizations.delete(photoId);
    });
  pendingOptimizations.set(photoId, run);
}

/** Resolves once this photo's bytes are final and safe to read. */
async function awaitPhotoOptimization(photoId: string): Promise<void> {
  const pending = pendingOptimizations.get(photoId);
  if (pending) await pending;
}

function prepareRequest(
  item: IntakeOutboxPhoto,
  contentType: string,
  sizeBytes: number,
): PrepareIntakePhotoRequest {
  return {
    jobId: item.jobId,
    sessionId: item.sessionId,
    idempotencyKey: item.id,
    deviceId: item.deviceId,
    requirementId: item.requirementId,
    category: item.category,
    fileName: fileNameForIntakePhoto(item.id, item.localUri),
    contentType,
    sizeBytes,
    capturedAt: item.capturedAt,
  };
}

/**
 * Native PUT onto the iOS background URLSession, which keeps transferring
 * while the app is suspended or after its process is gone. See
 * `resolvePhotoUploadSession` for why the session is never chosen from
 * `AppState` any more.
 *
 * The `UploadTask` SharedObject MUST stay reachable for the whole PUT.
 * `file.upload()` creates a task, starts it, and drops the only JS
 * reference — Hermes then releases the native handle, `sharedObjectWillRelease`
 * cancels the URLSession, and leaving the app looks like a dropped
 * connection. Holding the task in this map is what lets Live Activity +
 * the background session actually finish the transfer.
 *
 * Progress is reported to the caller rather than kept native-side, so the
 * persistent queue owns the state and the UI merely reads it.
 */
type HeldPhotoPut = {
  task: UploadTask;
  done: Promise<void>;
};

const heldPhotoPuts = new Map<string, HeldPhotoPut>();
/** Photos whose PUT is already running — a second drain must not start another. */
const inflightPhotoIds = new Set<string>();
/** PUT finished (or skipped) and finalize/settle is still running. */
const closingPhotoIds = new Set<string>();

function beginPhotoPut(
  photoId: string,
  file: File,
  uploadUrl: string,
  contentType: string,
  onProgress?: (progress: { bytesSent: number; totalBytes: number }) => void,
): Promise<void> {
  const existing = heldPhotoPuts.get(photoId);
  if (existing) return existing.done;

  let announced = false;
  const announceStarted = () => {
    if (announced) return;
    announced = true;
    void notePutStarted(photoId);
  };

  const task = file.createUploadTask(uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
    mimeType: contentType,
    sessionType: resolvePhotoUploadSession(Platform.OS),
    onProgress: (data: { bytesSent: number; totalBytes: number }) => {
      // First byte on the wire — not the JS call that *asked* for a PUT — is
      // when the daemon actually owns this photo. Marking earlier let leave
      // skip the row and freeze JS before native `resume()` ran.
      announceStarted();
      onProgress?.({ bytesSent: data.bytesSent, totalBytes: data.totalBytes });
    },
  });
  const done = (async () => {
    try {
      const result = await task.uploadAsync();
      announceStarted();
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Photo upload failed (HTTP ${result.status})`);
      }
    } finally {
      heldPhotoPuts.delete(photoId);
      clearIntakeUploadProgress(photoId);
    }
  })();
  heldPhotoPuts.set(photoId, { task, done });
  return done;
}

function isPhotoTransferOwned(photoId: string): boolean {
  return (
    inflightPhotoIds.has(photoId) ||
    heldPhotoPuts.has(photoId) ||
    closingPhotoIds.has(photoId)
  );
}

function countInflightPrepares(): number {
  let count = 0;
  for (const id of inflightPhotoIds) {
    if (!heldPhotoPuts.has(id)) count += 1;
  }
  return count;
}

const inflightPrepareIdleWaiters = new Set<() => void>();

function notifyInflightPrepareIdle(): void {
  if (countInflightPrepares() > 0) return;
  const waiters = [...inflightPrepareIdleWaiters];
  inflightPrepareIdleWaiters.clear();
  for (const waiter of waiters) waiter();
}

function waitForInflightPrepares(ms: number): Promise<void> {
  if (countInflightPrepares() === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (settled) return;
      settled = true;
      inflightPrepareIdleWaiters.delete(finish);
      if (timer) clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(finish, ms);
    inflightPrepareIdleWaiters.add(finish);
  });
}

/** Pending, blocked, preparing, or already handed to the daemon — keep the wave. */
function companyWaveStillOpen(companyId: string): boolean {
  for (const item of photos) {
    if (item.companyId !== companyId) continue;
    if (heldPhotoPuts.has(item.id) || inflightPhotoIds.has(item.id) || closingPhotoIds.has(item.id)) {
      return true;
    }
    if (countPhotoPending([item]) > 0 || countPhotoFailed([item]) > 0) return true;
  }
  return false;
}

async function finalizePreparedPhoto(
  item: IntakeOutboxPhoto,
  prepared: PreparedIntakeUpload,
): Promise<{ photoId: string; url: string; aiInspectionId: string }> {
  return finalizeEngineIntakePhoto({
    jobId: item.jobId,
    sessionId: item.sessionId,
    photoId: prepared.serverPhotoId,
    idempotencyKey: `${item.id}:finalize`,
    deviceId: item.deviceId,
    storagePath: prepared.storagePath,
    downloadToken: prepared.downloadToken,
    contentType: prepared.contentType,
    sizeBytes: prepared.sizeBytes,
  });
}

function jobHasFinishPending(companyId: string, jobId: string): boolean {
  return commands.some(
    (item) =>
      item.companyId === companyId &&
      item.command.type === 'field_complete' &&
      item.command.payload.jobId === jobId,
  );
}

/** Photos still waiting on prepare/PUT/finalize — not server-confirmed rows. */
function jobHasOpenPhotos(companyId: string, jobId: string): boolean {
  return photos.some(
    (photo) =>
      photo.companyId === companyId &&
      photo.jobId === jobId &&
      photo.status !== 'failed' &&
      photo.status !== 'completed',
  );
}

function deleteLocalPhotoFile(localUri: string): void {
  try {
    const file = new File(localUri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort local cleanup.
  }
}

/**
 * Mark a photo as on the server. If Finish is still queued for this job, keep
 * the local file + outbox row (`completed`) so a failed Finish can retry upload
 * instead of wiping the camera to empty while the engine stays Active.
 */
function settleUploadedPhoto(item: IntakeOutboxPhoto): void {
  if (jobHasFinishPending(item.companyId, item.jobId)) {
    photos = photos.map((candidate) =>
      candidate.id === item.id
        ? {
            ...candidate,
            status: 'completed' as SyncJobStatus,
            nextRetryAt: null,
            errorInfo: null,
            updatedAt: new Date().toISOString(),
          }
        : candidate,
    );
    publish();
    return;
  }
  photos = photos.filter((candidate) => candidate.id !== item.id);
  deleteLocalPhotoFile(item.localUri);
  publish();
}

/** Drop server-confirmed local rows after Finish lands (or is benignly done). */
function purgeSettledPhotos(companyId: string, jobId: string): void {
  const settled = photos.filter(
    (photo) =>
      photo.companyId === companyId &&
      photo.jobId === jobId &&
      photo.status === 'completed',
  );
  if (settled.length === 0) return;
  for (const photo of settled) {
    deleteLocalPhotoFile(photo.localUri);
  }
  photos = photos.filter(
    (photo) =>
      !(
        photo.companyId === companyId &&
        photo.jobId === jobId &&
        photo.status === 'completed'
      ),
  );
  publish();
}

/** Finish said "needs photo" — put confirmed rows back in the upload queue. */
function requeueSettledPhotos(companyId: string, jobId: string): void {
  let touched = false;
  photos = photos.map((photo) => {
    if (
      photo.companyId !== companyId ||
      photo.jobId !== jobId ||
      photo.status !== 'completed'
    ) {
      return photo;
    }
    touched = true;
    return {
      ...photo,
      status: 'queued' as SyncJobStatus,
      nextRetryAt: null,
      errorInfo: null,
      updatedAt: new Date().toISOString(),
    };
  });
  if (touched) publish();
}

function applyJobSessionRebind(companyId: string, jobId: string, sessionId: string): void {
  const next = rebindJobSessionIds({
    companyId,
    jobId,
    sessionId,
    photos,
    commands,
  });
  if (next.rebound === 0) return;
  photos = next.photos;
  commands = next.commands;
  publish();
}

/**
 * Photos need a live bay claim. Leaving the app / Finish / a stale lease can
 * clear `activeSessionId` while files are still local — resume then 409s with
 * "Session claim is no longer active". Reclaim and rewrite outbox sessionIds.
 */
async function reclaimJobSession(input: {
  companyId: string;
  jobId: string;
  deviceId: string;
}): Promise<string> {
  // Always mint a fresh session id. Reusing the dead claim's sessionId makes
  // server `transaction.create(session)` collide with the stale/paused doc and
  // abort reclaim — photos then look "synced" locally while Ready never flips.
  const requestedSessionId = engineIntakeId('session');
  const result = await sendEngineIntakeCommand({
    type: 'claim_job',
    idempotencyKey: engineIntakeId('reclaim'),
    client: 'mobile',
    clientAt: new Date().toISOString(),
    deviceId: input.deviceId || getEngineIntakeDeviceId(),
    payload: {
      jobId: input.jobId,
      sessionId: requestedSessionId,
      deviceName: getEngineIntakeDeviceName(),
    },
  });
  const sessionId =
    typeof result.sessionId === 'string' && result.sessionId.length > 0
      ? result.sessionId
      : requestedSessionId;
  applyJobSessionRebind(input.companyId, input.jobId, sessionId);
  return sessionId;
}

/**
 * Take the bay back so a photo can be uploaded — the last resort, not the norm.
 *
 * This used to run *ahead of every wave*, as a `resume_session` for each job
 * followed by a reclaim when the session was gone. Both halves were wrong.
 * The resume bought nothing: the server has always accepted uploads into a
 * paused session, because upload is transport. And the reclaim was actively
 * destructive — `claim_job` moves a job from `awaiting_verification` back to
 * `in_session`, so one straggling photo silently pulled a finished engine off
 * the reviewer's Ready list, with no Finish left in the queue to put it back.
 *
 * The server now accepts late photos on its own (`canAcceptIntakePhotoUpload`),
 * so this runs only when an upload genuinely reports a dead claim, and only
 * while the job still has capture work outstanding.
 */
async function recoverSessionForPhotoUpload(item: IntakeOutboxPhoto): Promise<void> {
  // Finish already landed for this job: whatever the server objected to, it was
  // not a claim this photo is entitled to retake. Reclaiming here is exactly
  // what would undo the worker's Finish.
  if (!jobHasFinishPending(item.companyId, item.jobId)) return;

  try {
    await reclaimJobSession({
      companyId: item.companyId,
      jobId: item.jobId,
      deviceId: item.deviceId,
    });
  } catch (error) {
    if (isClaimHeldByOtherMessage(error instanceof Error ? error.message : String(error))) {
      throw error;
    }
    // Last resort: prepare may still succeed if the claim came back.
  }
}

function isNeedsPhotoFinishError(error: unknown): boolean {
  const text = String(
    error && typeof error === 'object' && 'message' in error
      ? (error as { message?: unknown }).message ?? ''
      : error ?? '',
  ).toLowerCase();
  return text.includes('at least one photo') || text.includes('finish needs a serial');
}

async function sendQueuedFieldComplete(companyId: string, jobId: string): Promise<void> {
  if (jobHasOpenPhotos(companyId, jobId)) return;
  const pending = commands.find(
    (item) =>
      item.companyId === companyId &&
      item.command.type === 'field_complete' &&
      item.command.payload.jobId === jobId,
  );
  if (!pending) {
    // No Finish queued — safe to drop locally retained uploads for this job.
    purgeSettledPhotos(companyId, jobId);
    return;
  }

  const succeed = () => {
    commands = commands.filter((candidate) => candidate.id !== pending.id);
    markIntakeJobReady(companyId, jobId);
    purgeSettledPhotos(companyId, jobId);
    publish();
  };

  try {
    await sendEngineIntakeCommand(pending.command);
    succeed();
  } catch (error) {
    if (isBenignFieldCompleteError(error)) {
      succeed();
      return;
    }
    if (isClaimGoneError(error)) {
      try {
        await reclaimJobSession({
          companyId,
          jobId,
          deviceId: pending.command.deviceId || getEngineIntakeDeviceId(),
        });
        const live = commands.find((candidate) => candidate.id === pending.id);
        if (live) {
          await sendEngineIntakeCommand(live.command);
          succeed();
          return;
        }
      } catch {
        // Fall through — surface the Finish failure below.
      }
    }
    if (isNeedsPhotoFinishError(error)) {
      // Server still has zero photos — put retained files back on the wire.
      requeueSettledPhotos(companyId, jobId);
    }
    if (
      shouldRequeueAfterAppLeave({
        appState: String(AppState.currentState),
        error,
      })
    ) {
      updateCommand(pending.id, {
        status: 'queued',
        attemptCount: pending.attemptCount,
        nextRetryAt: null,
        errorInfo: null,
      });
      return;
    }
    const info = describeSyncError(error);
    const transition = resolveFailureTransition({
      attemptCount: pending.attemptCount + 1,
      retryable: info.retryable || isNeedsPhotoFinishError(error),
      offline: info.code === 'NETWORK_UNAVAILABLE',
      transport: isTransportSyncError(info.code),
    });
    updateCommand(pending.id, {
      status: transition.status,
      attemptCount: transition.attemptCount,
      nextRetryAt: transition.nextRetryAt,
      errorInfo: info,
    });
    if (transition.status === 'failed' && !isNeedsPhotoFinishError(error)) {
      restoreIntakeJobReady(companyId, jobId);
    }
  }
}

/**
 * Network-only transfer. Does not touch the outbox — callers settle the row
 * under `withOutboxMutation` so parallel PUTs cannot clobber each other.
 * Resolves only when the server confirms a photo URL.
 */
/**
 * Record the server photo id the moment `prepare` returns it.
 *
 * Goes through the mutation gate like every other row write: four uploads run
 * in parallel, and each `photos.map` rebuilds the whole array from the snapshot
 * it captured, so an ungated write here would silently drop a sibling's status.
 */
async function notePreparedPhoto(
  photoId: string,
  serverPhotoId: string,
  prepared: PreparedIntakeUpload | null,
): Promise<void> {
  if (!serverPhotoId) return;
  await withOutboxMutation(() => {
    let touched = false;
    const next = photos.map((item) => {
      if (item.id !== photoId) return item;
      if (item.serverPhotoId === serverPhotoId && item.prepared === prepared) return item;
      touched = true;
      return {
        ...item,
        serverPhotoId,
        prepared,
        updatedAt: new Date().toISOString(),
      };
    });
    if (!touched) return;
    photos = next;
    publish();
  });
}

/**
 * Record that the bytes are the daemon's problem now.
 *
 * Persisted rather than held in memory because the point of the flag is to
 * survive the runtime that set it: on the next wake it is what tells the queue
 * that this photo's next question is "did the object land?" rather than "send
 * it again".
 */
async function notePutStarted(photoId: string): Promise<void> {
  await withOutboxMutation(() => {
    let touched = false;
    const startedAt = new Date().toISOString();
    const next = photos.map((item) => {
      if (item.id !== photoId) return item;
      touched = true;
      return { ...item, putStartedAt: startedAt, updatedAt: startedAt };
    });
    if (!touched) return;
    photos = next;
    publish();
  });
}

type PrimedPhoto =
  /** Nothing left to do — the server already holds a finished photo. */
  | { step: 'settle'; url: string }
  /** Bytes are in the bucket; only the Firestore row is outstanding. */
  | { step: 'finalize'; prepared: PreparedIntakeUpload }
  /** Send the bytes. */
  | { step: 'upload'; file: File; prepared: PreparedIntakeUpload };

/**
 * Step 1 — make a photo ready for the daemon: optimize, measure, prepare.
 *
 * Credentials already on the row are reused while their signed URL is good and
 * the bytes have not been sent, which is what turns the leave window into pure
 * PUT time. Once a PUT has been attempted the server has to be asked again:
 * only it can say whether the object landed, and `prepare` answers that with
 * `alreadyUploaded` instead of making the worker pay for the file twice.
 */
async function primePhoto(item: IntakeOutboxPhoto): Promise<PrimedPhoto> {
  // The bytes must be final before they are measured or sent — a re-encode
  // landing mid-flight would upload one image and finalize against the size
  // of another.
  await awaitPhotoOptimization(item.id);
  const latest = photos.find((candidate) => candidate.id === item.id) ?? item;
  const file = new File(latest.localUri);
  if (!file.exists) {
    throw new MobileApiError('Local photo is missing. Retake this angle.', 410);
  }

  if (!latest.putStartedAt && isPreparedUploadUsable(latest.prepared, new Date())) {
    return { step: 'upload', file, prepared: latest.prepared! };
  }

  const normalized = normalizeIntakePhotoPayload({
    localUri: latest.localUri,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (!normalized.ok) {
    const status = normalized.error.code === 'EMPTY' ? 410 : 400;
    throw new MobileApiError(normalized.error.message, status);
  }
  const { contentType, sizeBytes } = normalized.value;
  const response = await prepareEngineIntakePhoto(
    prepareRequest(latest, contentType, sizeBytes),
  );
  const next = resolvePreparedPhotoStep(response);
  const prepared: PreparedIntakeUpload = {
    serverPhotoId: response.photoId,
    uploadUrl: response.uploadUrl,
    storagePath: response.storagePath,
    downloadToken: response.downloadToken,
    contentType: response.contentType,
    sizeBytes,
    url: response.url ?? '',
    expiresAt: preparedUploadExpiresAt(new Date()),
  };
  // The job document counts this shot from here on; the phone must stop
  // counting it a second time.
  await notePreparedPhoto(item.id, response.photoId, next.step === 'settle' ? null : prepared);

  if (next.step === 'settle') return { step: 'settle', url: next.url };
  if (next.step === 'finalize') return { step: 'finalize', prepared };
  return { step: 'upload', file, prepared };
}

/** Step 2 — hand the bytes to the iOS background URLSession. Does not wait for them. */
async function startPreparedPut(
  item: IntakeOutboxPhoto,
  file: File,
  prepared: PreparedIntakeUpload,
): Promise<{ bytes: Promise<void> }> {
  if (!prepared.uploadUrl) {
    throw new MobileApiError('Photo upload URL was missing from the server.', 502);
  }
  return {
    bytes: beginPhotoPut(item.id, file, prepared.uploadUrl, prepared.contentType, (progress) =>
      setIntakeUploadProgress(item.id, progress),
    ),
  };
}

/**
 * Step 3 — close the Firestore row, or accept that it is already closed.
 *
 * The server's Storage trigger finalizes an object on its own, so by the time
 * a woken runtime gets here the answer is often "already done". Both of those
 * are success; only a photo whose bytes are genuinely not on the server may
 * report failure.
 */
async function finalizeOrSettle(
  item: IntakeOutboxPhoto,
  prepared: PreparedIntakeUpload,
  bytesConfirmed: boolean,
): Promise<{ url: string }> {
  const storedUrl = prepared.url.trim();
  try {
    const finalized = await finalizePreparedPhoto(item, prepared);
    const url = finalized.url?.trim() || storedUrl;
    if (!url) {
      throw new MobileApiError('Server did not confirm the photo upload.', 502);
    }
    return { url };
  } catch (error) {
    if (isIdempotentPhotoSuccess(error) && storedUrl) {
      return { url: storedUrl };
    }
    // `prepare` handed back a URL, which it only does for a photo whose bytes
    // are in the bucket. Whatever finalize objected to, the work is not lost and
    // must not be presented as lost — an older server that still answers without
    // `alreadyFinalized` lands here.
    if (bytesConfirmed && storedUrl) {
      return { url: storedUrl };
    }
    throw error;
  }
}

/**
 * What a caller of `runPhotoUpload` knows that the upload itself does not.
 *
 * A drain wave has a blocked-job set, one shared session recovery per job, and
 * an abort flag; an eager prime fired by the shutter has none of those. Keeping
 * them as collaborators is what lets both paths run the exact same transfer,
 * failure classification and settle rules instead of drifting apart.
 */
type PhotoUploadContext = {
  isBlocked: (jobId: string) => boolean;
  recoverJobSession: (item: IntakeOutboxPhoto) => Promise<void>;
  onOffline: () => void;
};

async function runPhotoUpload(
  item: IntakeOutboxPhoto,
  context: PhotoUploadContext,
): Promise<void> {
  if (context.isBlocked(item.jobId)) return;
  if (isPhotoTransferOwned(item.id)) return;

  // `completed` is not "gone": a job with a queued Finish keeps its confirmed
  // rows so a failed Finish can retry from them. With the shutter and the drain
  // both able to pick a photo up, existence alone would let the second one
  // through and upload a file the server had already accepted.
  const stillQueued = await withOutboxMutation(() =>
    photos.some((candidate) => candidate.id === item.id && candidate.status !== 'completed'),
  );
  if (!stillQueued) return;

  inflightPhotoIds.add(item.id);
  try {
    await withOutboxMutation(() => {
      updatePhoto(item.id, {
        status: 'uploading',
        attemptCount: item.attemptCount + 1,
        nextRetryAt: null,
        errorInfo: null,
      });
    });

    const liveRow = async (): Promise<IntakeOutboxPhoto | null> =>
      withOutboxMutation(() => photos.find((candidate) => candidate.id === item.id) ?? null);

    const parkFailure = async (error: unknown): Promise<void> => {
      const live = (await liveRow()) ?? item;
      if (isIdempotentPhotoSuccess(error)) {
        await withOutboxMutation(() => {
          const row = photos.find((candidate) => candidate.id === item.id) ?? live;
          settleUploadedPhoto(row);
          noteSyncSuccess();
        });
        return;
      }
      if (
        shouldRequeueAfterAppLeave({
          appState: String(AppState.currentState),
          error,
        })
      ) {
        await withOutboxMutation(() => {
          updatePhoto(live.id, {
            status: 'queued',
            attemptCount: item.attemptCount,
            nextRetryAt: null,
            errorInfo: null,
          });
        });
        return;
      }
      const info = describeSyncError(error);
      const offline = info.code === 'NETWORK_UNAVAILABLE';
      const transition = resolveFailureTransition({
        attemptCount: item.attemptCount + 1,
        retryable: info.retryable,
        offline,
        transport: isTransportSyncError(info.code),
      });
      await withOutboxMutation(() => {
        updatePhoto(live.id, {
          status: transition.status,
          attemptCount: transition.attemptCount,
          nextRetryAt: transition.nextRetryAt,
          errorInfo: info,
        });
      });
      if (offline) context.onOffline();
    };

    const settleSuccess = async (): Promise<void> => {
      await withOutboxMutation(() => {
        const row = photos.find((candidate) => candidate.id === item.id);
        if (row) settleUploadedPhoto(row);
        noteSyncSuccess();
      });
    };

    type StartedTransfer = {
      primed: PrimedPhoto;
      bytes: Promise<void> | null;
    };

    const primeAndBegin = async (target: IntakeOutboxPhoto): Promise<StartedTransfer> => {
      const primed = await primePhoto(target);
      if (primed.step !== 'upload') return { primed, bytes: null };
      const startedPut = await startPreparedPut(target, primed.file, primed.prepared);
      return { primed, bytes: startedPut.bytes };
    };

    let started: StartedTransfer | null = null;
    try {
      started = await withPhotoUploadSlot(async () => {
        const live = await liveRow();
        if (!live) return null;
        try {
          return await primeAndBegin(live);
        } catch (firstError) {
          if (!isClaimGoneError(firstError)) throw firstError;
          await context.recoverJobSession(live);
          const retried = await liveRow();
          if (!retried) return null;
          return primeAndBegin(retried);
        }
      });
    } catch (error) {
      await parkFailure(error);
      return;
    }

    if (!started) return;
    const primed = started.primed;
    if (primed.step === 'settle') {
      await settleSuccess();
      return;
    }

    // Always close the row after the PUT, including on leave. Skipping that
    // left photos `uploading` on this phone until the next foreground drain —
    // Island looked right (`0/3`) and nothing appeared until the app was opened.
    // Do not await here: the slot is already released, and blocking would
    // starve later shutter-presses of the 30s window.
    closingPhotoIds.add(item.id);
    void (async () => {
      try {
        if (started.bytes) await started.bytes;
        const live = (await liveRow()) ?? item;
        await finalizeOrSettle(
          live,
          primed.prepared,
          primed.step === 'finalize' || Boolean(live.putStartedAt),
        );
        await settleSuccess();
      } catch (error) {
        await parkFailure(error);
      } finally {
        closingPhotoIds.delete(item.id);
      }
    })();
  } finally {
    inflightPhotoIds.delete(item.id);
    notifyInflightPrepareIdle();
  }
}

/**
 * Take a freshly captured photo all the way to a started PUT, now.
 *
 * The slot lives inside `runPhotoUpload` around prepare + starting the PUT,
 * not around waiting for bytes — so a burst of captures cannot outrun prepare
 * and also cannot block the last photo behind four in-flight transfers.
 */
async function primeAndStartUpload(photoId: string): Promise<void> {
  const item = photos.find((candidate) => candidate.id === photoId);
  if (!item) return;
  if (!syncing) {
    syncing = true;
    publish();
  }
  try {
    await runPhotoUpload(item, {
      isBlocked: () => false,
      recoverJobSession: recoverSessionForPhotoUpload,
      onOffline: () => undefined,
    });
  } catch {
    // `runPhotoUpload` already parked the row with a retry schedule.
  } finally {
    if (
      !drainPromise &&
      inflightPhotoIds.size === 0 &&
      closingPhotoIds.size === 0 &&
      heldPhotoPuts.size === 0 &&
      syncing
    ) {
      syncing = false;
      publish();
    }
  }
}

/**
 * Capture order in the foreground; survival order once the person has left.
 *
 * While the app is up, oldest first is what the worker expects to see clear.
 * After a leave the queue is racing a suspend, and the only work that keeps
 * paying off once JS dies is a PUT already handed to the background session —
 * so the wave reorders to start as many of those as the window allows.
 */
function orderPhotoWaveWork(items: IntakeOutboxPhoto[]): IntakeOutboxPhoto[] {
  if (String(AppState.currentState) === 'active') return items;
  const now = new Date();
  return orderLeaveAppPhotoWork(
    items.map((item) => ({
      item,
      createdAt: item.createdAt,
      hasUsablePreparedUpload: isPreparedUploadUsable(item.prepared, now),
      putStarted: Boolean(item.putStartedAt),
    })),
  ).map((entry) => entry.item);
}

async function drain(companyId: string): Promise<void> {
  // Never gate the wave on NetInfo. iOS reports offline under a lit Wi‑Fi
  // icon (and always lies in background). A real outage fails the request and
  // parks the row via resolveFailureTransition(offline). Gating here froze
  // reclaim on "Session claim is no longer active" while the phone was online.
  requeueTransientTransportFailures();

  const blockedJobIds = new Set<string>();
  for (const item of commands) {
    if (
      item.companyId !== companyId ||
      item.status !== 'failed' ||
      !commandFailureBlocksJob(item.command)
    ) {
      continue;
    }
    if ('jobId' in item.command.payload && item.command.payload.jobId) {
      blockedJobIds.add(item.command.payload.jobId);
    }
  }

  const runnable = { online: true, now: new Date() };
  const pendingCommands = commands
    .filter((item) => item.companyId === companyId && isJobRunnable(item, runnable))
    .map((item) => ({
      kind: 'command' as const,
      item,
      createdAt: item.createdAt,
      jobId:
        'jobId' in item.command.payload ? item.command.payload.jobId : undefined,
      commandType: item.command.type,
    }));
  const pendingPhotos = photos
    .filter((item) => {
      if (item.companyId !== companyId) return false;
      if (isPhotoTransferOwned(item.id)) return false;
      return isJobRunnable(item, runnable);
    })
    .map((item) => ({
      kind: 'photo' as const,
      item,
      createdAt: item.createdAt,
      jobId: item.jobId,
      commandType: undefined as string | undefined,
    }));
  const work = orderIntakeDrainWork([...pendingCommands, ...pendingPhotos]);
  const photoWorkCount = work.filter((entry) => entry.kind === 'photo').length;

  if (work.length === 0) {
    // In-flight prepares and daemon PUTs are not drainable, but they are still
    // this wave. Resetting here painted the Island as `0/2` then `0/1` while
    // the remaining files were still leaving the phone.
    if (companyWaveStillOpen(companyId)) return;
    if (syncedCount > 0 || sessionTotal > 0) {
      resetSyncSession();
      publish();
    }
    return;
  }

  // Island progress tracks photos only — not heartbeats / old failed junk.
  // Never shrink: a pass that only sees the not-yet-owned remainder is not a
  // new wave.
  if (photoWorkCount > 0) {
    sessionTotal = Math.max(sessionTotal, photoWorkCount + syncedCount);
  }

  syncing = true;
  publish();
  const ensureByJob = new Map<string, Promise<void>>();
  let stopWave = false;

  /** One recovery attempt per job per wave, shared by its parallel uploads. */
  const recoverJobSession = (item: IntakeOutboxPhoto): Promise<void> => {
    const existing = ensureByJob.get(item.jobId);
    if (existing) return existing;
    const pending = recoverSessionForPhotoUpload(item).catch((error) => {
      ensureByJob.delete(item.jobId);
      throw error;
    });
    ensureByJob.set(item.jobId, pending);
    return pending;
  };

  const runCommandEntry = async (item: (typeof commands)[number]): Promise<'ok' | 'abort'> => {
    const jobId =
      'jobId' in item.command.payload ? item.command.payload.jobId : undefined;
    const isHeartbeat = item.command.type === 'heartbeat_session';
    if (jobId && blockedJobIds.has(jobId) && !isHeartbeat) return 'ok';
    if (
      item.command.type === 'field_complete' &&
      jobId &&
      jobHasOpenPhotos(companyId, jobId)
    ) {
      return 'ok';
    }
    if (!commands.some((candidate) => candidate.id === item.id)) return 'ok';

    updateCommand(item.id, {
      status: 'uploading',
      attemptCount: item.attemptCount + 1,
      nextRetryAt: null,
      errorInfo: null,
    });
    try {
      await sendEngineIntakeCommand(item.command);
      commands = commands.filter((candidate) => candidate.id !== item.id);
      if (item.command.type === 'field_complete' && jobId) {
        markIntakeJobReady(companyId, jobId);
        purgeSettledPhotos(companyId, jobId);
      }
      publish();
      return 'ok';
    } catch (error) {
      if (item.command.type === 'cancel_job' && isBenignCancelError(error)) {
        commands = commands.filter((candidate) => candidate.id !== item.id);
        publish();
        return 'ok';
      }
      if (item.command.type === 'field_complete' && isBenignFieldCompleteError(error)) {
        commands = commands.filter((candidate) => candidate.id !== item.id);
        if (jobId) {
          markIntakeJobReady(companyId, jobId);
          purgeSettledPhotos(companyId, jobId);
        }
        publish();
        return 'ok';
      }
      if (
        (item.command.type === 'field_complete' ||
          item.command.type === 'pause_session' ||
          item.command.type === 'resume_session') &&
        isClaimGoneError(error) &&
        jobId
      ) {
        try {
          await reclaimJobSession({
            companyId,
            jobId,
            deviceId: item.command.deviceId || getEngineIntakeDeviceId(),
          });
          const live = commands.find((candidate) => candidate.id === item.id);
          if (live) {
            await sendEngineIntakeCommand(live.command);
            commands = commands.filter((candidate) => candidate.id !== item.id);
            if (item.command.type === 'field_complete') {
              markIntakeJobReady(companyId, jobId);
              purgeSettledPhotos(companyId, jobId);
            }
            publish();
            return 'ok';
          }
        } catch {
          // Fall through to normal failure handling.
        }
      }
      if (item.command.type === 'field_complete' && jobId && isNeedsPhotoFinishError(error)) {
        requeueSettledPhotos(companyId, jobId);
      }
      if (
        shouldRequeueAfterAppLeave({
          appState: String(AppState.currentState),
          error,
        })
      ) {
        updateCommand(item.id, {
          status: 'queued',
          attemptCount: item.attemptCount,
          nextRetryAt: null,
          errorInfo: null,
        });
        return 'ok';
      }
      const info = describeSyncError(error);
      const offline = info.code === 'NETWORK_UNAVAILABLE';
      const transition = resolveFailureTransition({
        attemptCount: item.attemptCount + 1,
        retryable: info.retryable,
        offline,
        transport: isTransportSyncError(info.code),
      });
      const terminal = transition.status === 'failed';
      updateCommand(item.id, {
        status: transition.status,
        attemptCount: transition.attemptCount,
        nextRetryAt: transition.nextRetryAt,
        errorInfo: info,
      });
      if (
        terminal &&
        item.command.type === 'field_complete' &&
        jobId &&
        !isNeedsPhotoFinishError(error)
      ) {
        restoreIntakeJobReady(companyId, jobId);
      }
      if (offline) return 'abort';
      if (isHeartbeat) {
        if (terminal) {
          commands = commands.filter((candidate) => candidate.id !== item.id);
          publish();
        }
        return 'ok';
      }
      if (terminal && jobId && commandFailureBlocksJob(item.command)) {
        blockedJobIds.add(jobId);
        return 'ok';
      }
      if (!commandFailureAbortsDrainWave(item.command.type)) {
        return 'ok';
      }
      return 'abort';
    }
  };

  const runPhotoEntry = async (item: IntakeOutboxPhoto): Promise<void> => {
    if (stopWave) return;
    await runPhotoUpload(item, {
      isBlocked: (jobId) => blockedJobIds.has(jobId),
      recoverJobSession,
      onOffline: () => {
        stopWave = true;
      },
    });
  };

  try {
    const setupEntries = work.filter(
      (entry) =>
        entry.kind === 'command' && entry.item.command.type !== 'field_complete',
    );
    const photoEntries = work.filter((entry) => entry.kind === 'photo');
    const finishEntries = work.filter(
      (entry) =>
        entry.kind === 'command' && entry.item.command.type === 'field_complete',
    );

    for (const entry of setupEntries) {
      if (entry.kind !== 'command') continue;
      const result = await runCommandEntry(entry.item);
      if (result === 'abort') return;
    }

    // No claim seeding here any more. A round-trip per job before every wave
    // bought nothing the server needed, and the recovery it triggered could undo
    // a finished intake; uploads now go straight onto the wire and recover only
    // if one of them actually reports a dead claim.
    await mapPool(
      orderPhotoWaveWork(
        photoEntries.filter((entry) => entry.kind === 'photo').map((entry) => entry.item),
      ),
      PHOTO_UPLOAD_CONCURRENCY,
      async (item) => {
        await runPhotoEntry(item);
      },
    );
    if (stopWave) return;

    const finishedJobIds = new Set(
      photoEntries
        .filter((entry) => entry.kind === 'photo')
        .map((entry) => entry.item.jobId),
    );
    for (const jobId of finishedJobIds) {
      await sendQueuedFieldComplete(companyId, jobId);
    }

    for (const entry of finishEntries) {
      if (entry.kind !== 'command') continue;
      const result = await runCommandEntry(entry.item);
      if (result === 'abort') return;
    }
  } finally {
    // An eager prime started by the shutter can outlive the wave that was
    // running when it fired; clearing the flag unconditionally would drop the
    // banner while a photo was still on the wire.
    syncing =
      inflightPhotoIds.size > 0 ||
      closingPhotoIds.size > 0 ||
      photos.some((item) => item.companyId === companyId && heldPhotoPuts.has(item.id));
    if (!companyWaveStillOpen(companyId)) {
      resetSyncSession();
    }
    publish();
  }
}

/**
 * Leave-app JS fetch used to classify as UNKNOWN and mark the photo failed.
 * Put those rows back on the queue so Live Activity stays on Syncing and the
 * background URLSession can finish the PUT.
 */
export function requeueTransientTransportFailures(): boolean {
  let changed = false;
  const nextCommands = commands.map((row) => {
    const revived = reviveIfTransient(row);
    if (revived !== row) changed = true;
    return revived;
  });
  const nextPhotos = photos.map((row) => {
    const revived = reviveIfTransient(row);
    if (revived !== row) changed = true;
    return revived;
  });
  if (!changed) return false;
  commands = nextCommands;
  photos = nextPhotos;
  publish();
  return true;
}

export function drainIntakeOutbox(companyId: string): Promise<void> {
  if (drainPromise) {
    drainAgain = true;
    return drainPromise;
  }
  drainPromise = (async () => {
    let passes = 0;
    try {
      do {
        drainAgain = false;
        await drain(companyId);
        const appState = String(AppState.currentState);
        if (
          shouldWaitForLeaveInflightPrepares({
            appState,
            inflightPrepareCount: countInflightPrepares(),
          })
        ) {
          await waitForInflightPrepares(LEAVE_INFLIGHT_PREPARE_WAIT_MS);
        }
        passes += 1;
      } while (
        shouldContinueLeaveAppDrain({
          drainAgain,
          appState: String(AppState.currentState),
          hasRunnableWork: hasRunnableIntakeWork(companyId),
          passes,
        })
      );
    } finally {
      drainPromise = null;
    }
  })();
  return drainPromise;
}

export function hasPendingIntakeWork(): boolean {
  return (
    commands.some((item) => item.status !== 'failed' && item.status !== 'completed') ||
    photos.some((item) => item.status !== 'failed' && item.status !== 'completed')
  );
}

/** Work the drain can pick up right now — not a future retry or an in-flight PUT. */
export function hasRunnableIntakeWork(companyId?: string): boolean {
  const runnable = { online: true, now: new Date() };
  const match = (item: { companyId: string }) => !companyId || item.companyId === companyId;
  const leave = String(AppState.currentState) !== 'active';
  return (
    commands.some((item) => match(item) && isJobRunnable(item, runnable)) ||
    photos.some((item) => {
      if (!match(item)) return false;
      if (!leave) {
        if (isPhotoTransferOwned(item.id)) return false;
        return isJobRunnable(item, runnable);
      }
      return photoIsLeaveDrainWork({
        heldByDaemon: heldPhotoPuts.has(item.id) || closingPhotoIds.has(item.id),
        putStarted: false,
        inflightPrepare: inflightPhotoIds.has(item.id) && !heldPhotoPuts.has(item.id),
        jobRunnable: isJobRunnable(item, runnable),
      });
    })
  );
}

/**
 * Work that dies if JS is frozen — prepare, and starting a PUT.
 *
 * Distinct from `hasRunnableIntakeWork`: a photo already in `inflightPhotoIds`
 * is not drainable (the running transfer owns it) but it still needs the
 * runtime, and releasing `beginBackgroundTask` in that gap is how the last
 * photo used to vanish until the app was opened again.
 */
export function hasLiveRuntimeIntakeWork(companyId?: string): boolean {
  const runnable = { online: true, now: new Date() };
  const match = (item: { companyId: string }) => !companyId || item.companyId === companyId;
  if (commands.some((item) => match(item) && isJobRunnable(item, runnable))) return true;
  return photos.some((item) => {
    if (!match(item)) return false;
    // Prepare (and the tick that creates the URLSession task) still need JS,
    // even if a previous publish already wrote `putStartedAt`. Releasing the
    // assertion on that publish is how leave-app sync used to vanish.
    if (inflightPhotoIds.has(item.id)) return true;
    return photoNeedsLiveRuntime({
      putStarted: Boolean(item.putStartedAt),
      status: item.status,
    });
  });
}

function intakeOutboxCompanyIds(): string[] {
  const ids = new Set<string>();
  for (const item of commands) ids.add(item.companyId);
  for (const item of photos) ids.add(item.companyId);
  return [...ids];
}

/** Drain every company in the outbox. Used by the iOS background task. */
export async function drainAllIntakeOutboxes(): Promise<void> {
  if (drainPromise) await drainPromise;
  for (const companyId of intakeOutboxCompanyIds()) {
    await drainIntakeOutbox(companyId);
  }
}

/**
 * A 409 means the server already has this capture. Drop the row so the camera
 * and bay never show "Sync failed" / "already on the server".
 */
export function dropIdempotentPhotoConflicts(companyId?: string): number {
  let removed = 0;
  const nextPhotos: IntakeOutboxPhoto[] = [];
  for (const photo of photos) {
    if (companyId && photo.companyId !== companyId) {
      nextPhotos.push(photo);
      continue;
    }
    if (!isConflictPhoto(photo)) {
      nextPhotos.push(photo);
      continue;
    }
    try {
      const file = new File(photo.localUri);
      if (file.exists) file.delete();
    } catch {
      // best-effort cleanup
    }
    removed += 1;
  }
  if (removed > 0) {
    photos = nextPhotos;
    publish();
  }
  return removed;
}

dropIdempotentPhotoConflicts();

/** @deprecated Use dropIdempotentPhotoConflicts — 409s are already on the server. */
export function requeueIdempotentPhotoConflicts(companyId: string): void {
  dropIdempotentPhotoConflicts(companyId);
}

export function retryIntakeOutboxItem(id: string): void {
  const requeue = <T extends SyncJobFields>(item: T): T =>
    ({ ...item, status: 'queued' as SyncJobStatus, nextRetryAt: null, errorInfo: null });
  commands = commands.map((item) => (item.id === id ? requeue(item) : item));
  photos = photos.map((item) => (item.id === id ? requeue(item) : item));
  publish();
}

export function removeIntakeOutboxItem(id: string): void {
  const photo = photos.find((item) => item.id === id);
  if (photo) {
    const file = new File(photo.localUri);
    if (file.exists) file.delete();
  }
  commands = commands.filter((item) => item.id !== id);
  photos = photos.filter((item) => item.id !== id);
  publish();
}

const DROP_ON_CANCEL = new Set<EngineIntakeCommand['type']>([
  'heartbeat_session',
  'pause_session',
  'resume_session',
  'cancel_session',
  'field_complete',
  'set_location',
  'confirm_identity',
  'report_identity_mismatch',
]);

function commandJobId(command: EngineIntakeCommand): string | undefined {
  return 'jobId' in command.payload ? command.payload.jobId : undefined;
}

/** Photos and in-session commands for an engine the worker just cancelled. */
export function discardIntakeWorkForCancelledJob(companyId: string, jobId: string): void {
  let touched = false;
  const keptPhotos: IntakeOutboxPhoto[] = [];
  for (const photo of photos) {
    if (photo.companyId === companyId && photo.jobId === jobId) {
      try {
        const file = new File(photo.localUri);
        if (file.exists) file.delete();
      } catch {
        // best-effort
      }
      touched = true;
      continue;
    }
    keptPhotos.push(photo);
  }
  const keptCommands = commands.filter((item) => {
    if (item.companyId !== companyId || commandJobId(item.command) !== jobId) return true;
    if (!DROP_ON_CANCEL.has(item.command.type)) return true;
    touched = true;
    return false;
  });
  if (!touched) return;
  photos = keptPhotos;
  commands = keptCommands;
  publish();
}

function photoFileMissing(item: IntakeOutboxPhoto): boolean {
  try {
    return !new File(item.localUri).exists;
  } catch {
    return true;
  }
}

/**
 * Drop rows whose bytes are already gone from disk.
 *
 * This deliberately no longer deletes anything. It used to remove the local
 * photo for any failure whose humanised message matched "permission",
 * "unauthor" or /http 4\d\d/ — so an expired token destroyed the file. A
 * failure never means the work should be thrown away; only a confirmed upload
 * (in `uploadPhoto`) or an explicit user discard may clear a photo.
 */
export function purgeUnrecoverableIntakeOutbox(companyId: string): number {
  let removed = 0;

  const nextPhotos: IntakeOutboxPhoto[] = [];
  for (const photo of photos) {
    if (photo.companyId !== companyId) {
      nextPhotos.push(photo);
      continue;
    }
    if (photoFileMissing(photo)) {
      // Nothing to preserve — the file is not on the device any more.
      removed += 1;
      continue;
    }
    nextPhotos.push(photo);
  }

  if (removed > 0) {
    photos = nextPhotos;
    publish();
  }
  return removed;
}

/** Discard every failed outbox item for a company (user chose to clear the banner). */
export function clearFailedIntakeOutbox(companyId: string): number {
  let removed = 0;
  const nextPhotos: IntakeOutboxPhoto[] = [];
  for (const photo of photos) {
    if (photo.companyId === companyId && photo.status === 'failed') {
      try {
        const file = new File(photo.localUri);
        if (file.exists) file.delete();
      } catch {
        // best-effort cleanup
      }
      removed += 1;
      continue;
    }
    nextPhotos.push(photo);
  }
  const nextCommands = commands.filter((command) => {
    if (command.companyId === companyId && command.status === 'failed') {
      removed += 1;
      return false;
    }
    return true;
  });
  if (removed > 0) {
    photos = nextPhotos;
    commands = nextCommands;
    publish();
  }
  return removed;
}

/**
 * Banner action: drop dead items, re-queue the rest, drain.
 * Returns how many were discarded vs retried so UI can toast.
 */
export async function resolveFailedIntakeOutbox(companyId: string): Promise<{
  discarded: number;
  retried: number;
}> {
  const discarded = purgeUnrecoverableIntakeOutbox(companyId);
  let retried = 0;
  for (const item of [...commands, ...photos]) {
    if (item.companyId === companyId && item.status === 'failed') {
      retryIntakeOutboxItem(item.id);
      retried += 1;
    }
  }
  if (retried > 0) {
    await drainIntakeOutbox(companyId);
  }
  // Anything still failed stays queued in the outbox with its file intact.
  // Clearing here is what used to silently destroy photos after one bad retry.
  return { discarded, retried };
}

function snapshotForCompany(
  state: IntakeOutboxSnapshot,
  companyId: string | null,
): IntakeOutboxSnapshot {
  if (!companyId) {
    return {
      commands: [],
      photos: [],
      pendingCount: 0,
      failedCount: 0,
      syncing: false,
      photoPendingCount: 0,
      photoFailedCount: 0,
      syncedCount: 0,
      sessionTotal: 0,
    };
  }
  const companyCommands = state.commands.filter((item) => item.companyId === companyId);
  const companyPhotos = state.photos.filter((item) => item.companyId === companyId);
  const photoPendingCount = countPhotoPending(companyPhotos);
  const photoFailedCount = countPhotoFailed(companyPhotos);
  const pendingCount = countPendingCommands(companyCommands) + photoPendingCount;
  const failedCount = countFailedCommands(companyCommands) + photoFailedCount;
  return {
    commands: companyCommands,
    photos: companyPhotos,
    pendingCount,
    failedCount,
    syncing: state.syncing,
    photoPendingCount,
    photoFailedCount,
    syncedCount: state.syncedCount,
    sessionTotal: Math.max(state.sessionTotal, state.syncedCount + photoPendingCount),
  };
}

/**
 * `snapshotForCompany` filters into fresh arrays, so calling it straight from
 * the hook body handed every consumer a brand-new object on every render — which
 * silently defeated their `useMemo`s downstream. The store snapshot itself is
 * identity-stable between publishes, so one entry keyed on it is enough.
 */
const derivedSnapshots = new Map<
  string | null,
  { state: IntakeOutboxSnapshot; value: IntakeOutboxSnapshot }
>();

function snapshotForCompanyCached(
  state: IntakeOutboxSnapshot,
  companyId: string | null,
): IntakeOutboxSnapshot {
  const cached = derivedSnapshots.get(companyId);
  if (cached && cached.state === state) return cached.value;
  // Keyed per company, not a single slot: callers legitimately pass `null` while
  // a permission check is pending, and a one-entry cache would thrash between
  // them and hand every consumer a fresh object again.
  if (derivedSnapshots.size > 4) derivedSnapshots.clear();
  const value = snapshotForCompany(state, companyId);
  derivedSnapshots.set(companyId, { state, value });
  return value;
}

export function useEngineIntakeOutbox(companyId: string | null): IntakeOutboxSnapshot {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // No listeners here on purpose. `IntakeSyncHead` owns the network / app-state
  // triggers and the retry timer for the whole session, so sync does not stop
  // when this screen unmounts. A screen-local nudge on mount is still useful.
  useEffect(() => {
    if (!companyId) return;
    void drainIntakeOutbox(companyId);
  }, [companyId]);

  return snapshotForCompanyCached(state, companyId);
}

function queuedCommandResult(command: EngineIntakeCommand): EngineIntakeCommandResult {
  const payload = command.payload as { jobId?: string; sessionId?: string };
  return {
    ok: true,
    jobId: typeof payload.jobId === 'string' ? payload.jobId : '',
    engineId: '',
    sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : undefined,
  };
}

export async function sendOrQueueIntakeCommand(
  companyId: string,
  command: EngineIntakeCommand,
): Promise<EngineIntakeCommandResult | null> {
  if (command.type === 'resume_session') {
    dropQueuedPauseForSession(command.payload.sessionId, true);
  }
  try {
    return await sendEngineIntakeCommand(command);
  } catch (error) {
    if (command.type === 'cancel_job' && isBenignCancelError(error)) {
      return queuedCommandResult(command);
    }
    if (isTerminalError(error)) throw error;
    enqueueIntakeCommand(companyId, command);
    return queuedCommandResult(command);
  }
}
