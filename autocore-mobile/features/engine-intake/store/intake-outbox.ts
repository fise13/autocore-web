import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Directory, File, Paths } from 'expo-file-system';
import type {
  EngineIntakeCommand,
  EngineIntakeCommandResult,
  IntakePhotoCategory,
  PrepareIntakePhotoResponse,
} from '@autocore/engine-intake';

import { MobileApiError } from '@/services/api/mobile-client';
import { getJson, setJson } from '@/lib/storage/kv';

import { engineIntakeId } from '../lib/device';
import {
  finalizeEngineIntakePhoto,
  prepareEngineIntakePhoto,
  sendEngineIntakeCommand,
} from '../services/engine-intake-api';

const STORAGE_KEY = 'engine-intake:outbox:v1';

export type IntakeOutboxCommand = {
  id: string;
  companyId: string;
  command: EngineIntakeCommand;
  state: 'pending' | 'syncing' | 'failed';
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
  state: 'pending' | 'syncing' | 'failed';
  attempts: number;
  lastError: string | null;
  createdAt: string;
};

type PersistedOutbox = {
  commands: IntakeOutboxCommand[];
  photos: IntakeOutboxPhoto[];
};

export type IntakeOutboxSnapshot = PersistedOutbox & {
  pendingCount: number;
  failedCount: number;
  syncing: boolean;
};

const initial = getJson<PersistedOutbox>(STORAGE_KEY) ?? { commands: [], photos: [] };
let commands = initial.commands ?? [];
let photos = initial.photos ?? [];
let syncing = false;
let snapshot = buildSnapshot();
const listeners = new Set<() => void>();
let drainPromise: Promise<void> | null = null;

function buildSnapshot(): IntakeOutboxSnapshot {
  const all = [...commands, ...photos];
  return {
    commands,
    photos,
    pendingCount: all.filter((item) => item.state !== 'failed').length,
    failedCount: all.filter((item) => item.state === 'failed').length,
    syncing,
  };
}

function publish(): void {
  setJson(STORAGE_KEY, { commands, photos });
  snapshot = buildSnapshot();
  for (const listener of listeners) listener();
}

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Sync failed';
  return humanizeIntakeOutboxError(raw);
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
  patch: Partial<Pick<IntakeOutboxCommand, 'state' | 'attempts' | 'lastError'>>,
): void {
  commands = commands.map((item) => (item.id === id ? { ...item, ...patch } : item));
  publish();
}

function updatePhoto(
  id: string,
  patch: Partial<Pick<IntakeOutboxPhoto, 'state' | 'attempts' | 'lastError'>>,
): void {
  photos = photos.map((item) => (item.id === id ? { ...item, ...patch } : item));
  publish();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): IntakeOutboxSnapshot {
  return snapshot;
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
  };
  photos = [...photos, item];
  publish();
  return item;
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
  const prepared = await prepareEngineIntakePhoto({
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
  });
  if (prepared.alreadyUploaded) {
    return prepared;
  }
  const upload = await fetch(prepared.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': prepared.contentType },
    body: file,
  });
  if (!upload.ok) {
    throw new Error(`Photo upload failed (HTTP ${upload.status})`);
  }
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
  return prepared;
}

async function drain(companyId: string): Promise<void> {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return;

  syncing = true;
  publish();
  try {
    const blockedJobIds = new Set<string>();
    for (const item of commands) {
      if (
        item.companyId !== companyId ||
        item.state !== 'failed' ||
        !commandFailureBlocksJob(item.command)
      ) {
        continue;
      }
      if ('jobId' in item.command.payload && item.command.payload.jobId) {
        blockedJobIds.add(item.command.payload.jobId);
      }
    }

    const work = [
      ...commands
        .filter((item) => item.companyId === companyId && item.state !== 'failed')
        .map((item) => ({ kind: 'command' as const, item })),
      ...photos
        .filter((item) => item.companyId === companyId && item.state !== 'failed')
        .map((item) => ({ kind: 'photo' as const, item })),
    ].sort((left, right) => left.item.createdAt.localeCompare(right.item.createdAt));

    for (const entry of work) {
      const jobId =
        entry.kind === 'photo'
          ? entry.item.jobId
          : 'jobId' in entry.item.command.payload
            ? entry.item.command.payload.jobId
            : undefined;
      if (jobId && blockedJobIds.has(jobId)) continue;

      if (entry.kind === 'command') {
        const item = entry.item;
        updateCommand(item.id, {
          state: 'syncing',
          attempts: item.attempts + 1,
          lastError: null,
        });
        try {
          await sendEngineIntakeCommand(item.command);
          commands = commands.filter((candidate) => candidate.id !== item.id);
          publish();
        } catch (error) {
          const terminal = isTerminalError(error);
          updateCommand(item.id, {
            state: terminal ? 'failed' : 'pending',
            lastError: errorMessage(error),
          });
          if (terminal && jobId && commandFailureBlocksJob(item.command)) {
            blockedJobIds.add(jobId);
            continue;
          }
          return;
        }
        continue;
      }

      const item = entry.item;
      updatePhoto(item.id, {
        state: 'syncing',
        attempts: item.attempts + 1,
        lastError: null,
      });
      try {
        await uploadPhoto(item);
        const file = new File(item.localUri);
        if (file.exists) file.delete();
        photos = photos.filter((candidate) => candidate.id !== item.id);
        publish();
      } catch (error) {
        const terminal = isTerminalError(error);
        updatePhoto(item.id, {
          state: terminal ? 'failed' : 'pending',
          lastError: errorMessage(error),
        });
        if (terminal) continue;
        return;
      }
    }
  } finally {
    syncing = false;
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

export function retryIntakeOutboxItem(id: string): void {
  commands = commands.map((item) =>
    item.id === id ? { ...item, state: 'pending', lastError: null } : item,
  );
  photos = photos.map((item) =>
    item.id === id ? { ...item, state: 'pending', lastError: null } : item,
  );
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

export function useEngineIntakeOutbox(companyId: string | null): IntakeOutboxSnapshot {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!companyId) return;
    void drainIntakeOutbox(companyId);
    const unsubscribe = NetInfo.addEventListener((network) => {
      if (network.isConnected) void drainIntakeOutbox(companyId);
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void drainIntakeOutbox(companyId);
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [companyId]);

  return state;
}

export async function sendOrQueueIntakeCommand(
  companyId: string,
  command: EngineIntakeCommand,
): Promise<EngineIntakeCommandResult | null> {
  try {
    return await sendEngineIntakeCommand(command);
  } catch (error) {
    if (isTerminalError(error)) throw error;
    enqueueIntakeCommand(companyId, command);
    return null;
  }
}
