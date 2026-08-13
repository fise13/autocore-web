import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Directory, File, Paths, UploadType } from 'expo-file-system';
import type {
  EngineIntakeCommand,
  EngineIntakeCommandResult,
  IntakePhotoCategory,
  PrepareIntakePhotoRequest,
  PrepareIntakePhotoResponse,
} from '@autocore/engine-intake';

import { MobileApiError } from '@/services/api/mobile-client';
import { getJson, setJson } from '@/lib/storage/kv';
import { netInfoSaysOnline } from '@/lib/offline/netinfo-online';

import { engineIntakeId } from '../lib/device';
import { commandFailureAbortsDrainWave, orderIntakeDrainWork } from '../lib/intake-drain-order';
import { describeSyncError, isBenignCancelError, isBenignFieldCompleteError, isIdempotentPhotoSuccess, type SyncErrorInfo } from '../lib/sync-errors';
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

function loadPersisted(): PersistedOutbox {
  const current = getJson<PersistedOutbox>(STORAGE_KEY);
  const source = current ?? getJson<PersistedOutbox>(LEGACY_STORAGE_KEY) ?? { commands: [], photos: [] };
  return {
    // Launch reconcile: a row left `uploading` means the process died holding
    // it. That is not a failure and the file is still on disk — requeue it.
    commands: reconcileOnLaunch((source.commands ?? []).map(upgradeRow)),
    photos: reconcileOnLaunch((source.photos ?? []).map(upgradeRow)),
  };
}

const initial = loadPersisted();
let commands = initial.commands ?? [];
let photos = initial.photos ?? [];
let syncing = false;
/** Successful photo uploads since the current drain wave started. */
let syncedCount = 0;
/** Photo work size captured when the current drain wave began. */
let sessionTotal = 0;
let snapshot = buildSnapshot();
const listeners = new Set<() => void>();
let drainPromise: Promise<void> | null = null;

function isNoiseCommand(command: EngineIntakeCommand): boolean {
  return command.type === 'heartbeat_session';
}

function isConflictPhoto(photo: IntakeOutboxPhoto): boolean {
  if (photo.errorInfo?.code === 'CONFLICT') return true;
  const message = `${photo.lastError ?? ''} ${photo.errorInfo?.message ?? ''}`.toLowerCase();
  return message.includes('already on the server') || message.includes('already recorded');
}

function countPendingCommands(list: IntakeOutboxCommand[]): number {
  return list.filter((item) => item.state !== 'failed' && !isNoiseCommand(item.command)).length;
}

function countPhotoPending(list: IntakeOutboxPhoto[]): number {
  return list.filter((item) => item.state !== 'failed' && !isConflictPhoto(item)).length;
}

function countPhotoFailed(list: IntakeOutboxPhoto[]): number {
  return list.filter((item) => item.state === 'failed' && !isConflictPhoto(item)).length;
}

function buildSnapshot(): IntakeOutboxSnapshot {
  const photoPendingCount = countPhotoPending(photos);
  const photoFailedCount = countPhotoFailed(photos);
  const pendingCount = countPendingCommands(commands) + photoPendingCount;
  const failedCount =
    commands.filter((item) => item.state === 'failed' && !isNoiseCommand(item.command)).length +
    photoFailedCount;
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

function publish(): void {
  commands = commands.map(mirror);
  photos = photos.map(mirror);
  setJson(STORAGE_KEY, { commands, photos });
  snapshot = buildSnapshot();
  for (const listener of listeners) listener();
}

/** Short, actionable copy for camera / Warehouse sync failures. */
export function humanizeIntakeOutboxError(message: string | null | undefined): string {
  if (!message?.trim()) return 'Could not sync. Try again.';
  const normalized = message.trim();
  const lower = normalized.toLowerCase();

  if (
    lower.includes('web app needs to be deployed') ||
    lower.includes('api not found') ||
    lower.includes('returned html instead of json')
  ) {
    return 'Upload API is missing on the server. Deploy the web app, then retry.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('offline')) {
    return 'No connection. Photos stay on this phone until you are online.';
  }
  if (lower.includes('authorization') || lower.includes('unauthor') || lower.includes('401')) {
    return 'Sign-in expired. Open the app again, then retry.';
  }
  if (lower.includes('permission') || lower.includes('403')) {
    return 'Your role cannot upload intake photos.';
  }
  if (
    lower.includes('confirm the physical engine identity') ||
    lower.includes('identity before taking photos')
  ) {
    return 'Outdated server check blocked upload. Redeploy web, then retry.';
  }
  if (lower.includes('local photo is missing') || lower.includes('retake')) {
    return 'That photo file is gone. Shoot it again.';
  }
  if (lower.includes('empty')) {
    return 'That photo was empty. Shoot it again.';
  }
  if (lower.includes('http 5') || lower.includes('server error')) {
    return 'Server error. Photos stay on this phone — retry in a moment.';
  }
  if (normalized.length > 160) {
    return `${normalized.slice(0, 157)}…`;
  }
  return normalized;
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
  if (command.type === 'field_complete') {
    commands = commands.filter(
      (item) =>
        item.command.type !== 'pause_session' ||
        item.command.payload.sessionId !== command.payload.sessionId,
    );
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
  source.copy(destination);

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
  // Pause before the PUT lands makes the current production API reject the
  // upload ("Resume the session before taking photos"). Drop it; Finish or a
  // later pause can run after the files are on the server.
  commands = commands.filter(
    (candidate) =>
      candidate.command.type !== 'pause_session' ||
      candidate.command.payload.sessionId !== input.sessionId,
  );
  publish();
  return item;
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
    fileName: `${item.id}.jpg`,
    contentType,
    sizeBytes,
    capturedAt: item.capturedAt,
  };
}

/** iOS background URLSession PUT — survives leaving the app. JS `fetch` does not. */
async function putPhotoBytes(file: File, uploadUrl: string, contentType: string): Promise<void> {
  const result = await file.upload(uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
    mimeType: contentType,
    sessionType: 'background',
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Photo upload failed (HTTP ${result.status})`);
  }
}

async function finalizePreparedPhoto(
  item: IntakeOutboxPhoto,
  prepared: PrepareIntakePhotoResponse,
  sizeBytes: number,
): Promise<void> {
  await finalizeEngineIntakePhoto({
    jobId: item.jobId,
    sessionId: item.sessionId,
    photoId: prepared.photoId,
    idempotencyKey: `${item.id}:finalize`,
    deviceId: item.deviceId,
    storagePath: prepared.storagePath,
    downloadToken: prepared.downloadToken,
    contentType: prepared.contentType,
    sizeBytes,
  });
}

function jobHasOpenPhotos(companyId: string, jobId: string): boolean {
  return photos.some(
    (photo) =>
      photo.companyId === companyId &&
      photo.jobId === jobId &&
      photo.status !== 'failed',
  );
}

function completeUploadedPhoto(item: IntakeOutboxPhoto): void {
  // Drop the outbox row before yielding back to the JS event loop. Finalize
  // already bumped server `capturedCount`; if the Firestore snapshot lands
  // while this row is still present, the camera UI double-counts the shot.
  photos = photos.filter((candidate) => candidate.id !== item.id);
  try {
    const file = new File(item.localUri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort local cleanup — upload already succeeded.
  }
  publish();
}

/**
 * Leaving the app pauses the session. The current production prepare API then
 * 409s every photo. Resume first so this phone's outbox can drain even before
 * the paused-upload deploy lands.
 */
async function resumeSessionForPhotoUpload(item: IntakeOutboxPhoto): Promise<void> {
  try {
    await sendEngineIntakeCommand({
      type: 'resume_session',
      idempotencyKey: `intake-resume-for-upload:${item.sessionId}`,
      client: 'mobile',
      deviceId: item.deviceId,
      payload: { jobId: item.jobId, sessionId: item.sessionId },
    });
  } catch {
    // Already active / already finished — prepare decides.
  }
}

async function sendQueuedFieldComplete(companyId: string, jobId: string): Promise<void> {
  if (jobHasOpenPhotos(companyId, jobId)) return;
  const pending = commands.find(
    (item) =>
      item.companyId === companyId &&
      item.command.type === 'field_complete' &&
      item.command.payload.jobId === jobId,
  );
  if (!pending) return;
  try {
    await sendEngineIntakeCommand(pending.command);
    commands = commands.filter((candidate) => candidate.id !== pending.id);
    publish();
  } catch (error) {
    if (isBenignFieldCompleteError(error)) {
      commands = commands.filter((candidate) => candidate.id !== pending.id);
      publish();
    }
  }
}

async function uploadPhoto(item: IntakeOutboxPhoto): Promise<PrepareIntakePhotoResponse> {
  const file = new File(item.localUri);
  if (!file.exists) {
    throw new MobileApiError('Local photo is missing. Retake this angle.', 410);
  }
  const contentType = file.type || 'image/jpeg';
  const sizeBytes = file.size;
  if (!sizeBytes) {
    throw new MobileApiError('Captured photo is empty. Retake this angle.', 400);
  }
  const prepared = await prepareEngineIntakePhoto(prepareRequest(item, contentType, sizeBytes));
  if (!prepared.alreadyUploaded) {
    await putPhotoBytes(file, prepared.uploadUrl, prepared.contentType);
  }
  try {
    await finalizePreparedPhoto(item, prepared, sizeBytes);
  } catch (error) {
    if (!isIdempotentPhotoSuccess(error)) throw error;
    completeUploadedPhoto(item);
    return prepared;
  }
  completeUploadedPhoto(item);
  return prepared;
}

async function drain(companyId: string): Promise<void> {
  const network = await NetInfo.fetch();
  // iOS reports disconnected the moment we leave the foreground. Background
  // URLSession still has the radios — try the wave. A real outage fails the
  // PUT and parks the row in the catch path.
  const online =
    AppState.currentState === 'active' ? netInfoSaysOnline(network) : true;
  if (!online) {
    // Offline is a pause, not a failure. Park everything runnable so the UI can
    // say "waiting for connection" instead of inventing an error.
    let touched = false;
    commands = commands.map((item) => {
      if (item.companyId !== companyId || item.status === 'failed' || item.status === 'waiting_for_network') return item;
      touched = true;
      return { ...item, status: 'waiting_for_network' as SyncJobStatus, nextRetryAt: null };
    });
    photos = photos.map((item) => {
      if (item.companyId !== companyId || item.status === 'failed' || item.status === 'waiting_for_network') return item;
      touched = true;
      return { ...item, status: 'waiting_for_network' as SyncJobStatus, nextRetryAt: null };
    });
    if (touched) publish();
    return;
  }

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

  const runnable = { online, now: new Date() };
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
    .filter((item) => item.companyId === companyId && isJobRunnable(item, runnable))
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
    if (syncedCount > 0 || sessionTotal > 0) {
      resetSyncSession();
      publish();
    }
    return;
  }

  // Island progress tracks photos only — not heartbeats / old failed junk.
  if (photoWorkCount > 0) {
    if (!syncing || sessionTotal === 0) {
      sessionTotal = photoWorkCount + syncedCount;
    } else {
      sessionTotal = Math.max(sessionTotal, photoWorkCount + syncedCount);
    }
  }

  syncing = true;
  publish();
  const resumedSessions = new Set<string>();
  try {
    for (const entry of work) {
      const jobId =
        entry.kind === 'photo'
          ? entry.item.jobId
          : 'jobId' in entry.item.command.payload
            ? entry.item.command.payload.jobId
            : undefined;
      // Heartbeats must still run for a job even if a prior command failed.
      const isHeartbeat =
        entry.kind === 'command' && entry.item.command.type === 'heartbeat_session';
      if (jobId && blockedJobIds.has(jobId) && !isHeartbeat) continue;
      if (
        entry.kind === 'command' &&
        entry.item.command.type === 'field_complete' &&
        jobId &&
        jobHasOpenPhotos(companyId, jobId)
      ) {
        continue;
      }

      if (entry.kind === 'command') {
        const item = entry.item;
        if (!commands.some((candidate) => candidate.id === item.id)) continue;
        updateCommand(item.id, {
          status: 'uploading',
          attemptCount: item.attemptCount + 1,
          nextRetryAt: null,
          errorInfo: null,
        });
        try {
          await sendEngineIntakeCommand(item.command);
          commands = commands.filter((candidate) => candidate.id !== item.id);
          publish();
        } catch (error) {
          if (item.command.type === 'cancel_job' && isBenignCancelError(error)) {
            commands = commands.filter((candidate) => candidate.id !== item.id);
            publish();
            continue;
          }
          if (item.command.type === 'field_complete' && isBenignFieldCompleteError(error)) {
            commands = commands.filter((candidate) => candidate.id !== item.id);
            publish();
            continue;
          }
          const info = describeSyncError(error);
          const offline = info.code === 'NETWORK_UNAVAILABLE';
          const transition = resolveFailureTransition({
            attemptCount: item.attemptCount + 1,
            retryable: info.retryable,
            offline,
          });
          const terminal = transition.status === 'failed';
          updateCommand(item.id, {
            status: transition.status,
            attemptCount: transition.attemptCount,
            nextRetryAt: transition.nextRetryAt,
            errorInfo: info,
          });
          if (offline) return;
          // Drop a dead heartbeat instead of blocking the rest of the wave.
          if (isHeartbeat) {
            if (terminal) {
              commands = commands.filter((candidate) => candidate.id !== item.id);
              publish();
            }
            continue;
          }
          if (terminal && jobId && commandFailureBlocksJob(item.command)) {
            blockedJobIds.add(jobId);
            continue;
          }
          if (!commandFailureAbortsDrainWave(item.command.type)) {
            continue;
          }
          return;
        }
        continue;
      }

      const item = entry.item;
      if (!photos.some((candidate) => candidate.id === item.id)) continue;
      updatePhoto(item.id, {
        status: 'uploading',
        attemptCount: item.attemptCount + 1,
        nextRetryAt: null,
        errorInfo: null,
      });
      try {
        if (!resumedSessions.has(item.sessionId)) {
          resumedSessions.add(item.sessionId);
          await resumeSessionForPhotoUpload(item);
        }
        await uploadPhoto(item);
        // uploadPhoto already removed the outbox row + local file.
        noteSyncSuccess();
        publish();
        await sendQueuedFieldComplete(companyId, item.jobId);
      } catch (error) {
        if (isIdempotentPhotoSuccess(error)) {
          completeUploadedPhoto(item);
          noteSyncSuccess();
          await sendQueuedFieldComplete(companyId, item.jobId);
          continue;
        }
        const info = describeSyncError(error);
        const offline = info.code === 'NETWORK_UNAVAILABLE';
        const transition = resolveFailureTransition({
          attemptCount: item.attemptCount + 1,
          retryable: info.retryable,
          offline,
        });
        updatePhoto(item.id, {
          status: transition.status,
          attemptCount: transition.attemptCount,
          nextRetryAt: transition.nextRetryAt,
          errorInfo: info,
        });
        // Offline: stop the wave rather than marching the rest into the same wall.
        if (offline) return;
        // Non-terminal photo failure: keep going so later heartbeats / photos
        // are not permanently stuck behind one bad file.
        continue;
      }
    }
  } finally {
    syncing = false;
    const photosStillMoving = photos.some(
      (item) => item.companyId === companyId && item.status !== 'failed',
    );
    if (!photosStillMoving) {
      resetSyncSession();
    }
    publish();
  }
}

export function drainIntakeOutbox(companyId: string): Promise<void> {
  if (drainPromise) return drainPromise;
  drainPromise = drain(companyId).finally(() => {
    drainPromise = null;
  });
  return drainPromise;
}

export function hasPendingIntakeWork(): boolean {
  return (
    commands.some((item) => item.status !== 'failed' && item.status !== 'completed') ||
    photos.some((item) => item.status !== 'failed' && item.status !== 'completed')
  );
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
  const failedCount =
    companyCommands.filter((item) => item.state === 'failed' && !isNoiseCommand(item.command))
      .length + photoFailedCount;
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
