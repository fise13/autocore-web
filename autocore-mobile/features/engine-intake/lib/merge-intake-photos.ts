import type {
  IntakePhoto,
  IntakePhotoCategory,
  IntakeSyncState,
} from '@autocore/engine-intake';

/**
 * Local outbox row shaped for merging into the Firestore photo list.
 * Kept free of the outbox module so tests do not load expo-file-system.
 */
export type LocalIntakePhotoInput = {
  id: string;
  companyId: string;
  jobId: string;
  sessionId: string;
  requirementId: string | null;
  category: IntakePhotoCategory;
  localUri: string;
  capturedAt: string;
  status: string;
};

export type IntakePhotoThumbStatus = 'queued' | 'uploading' | 'failed' | 'completed';

export function thumbStatusFromSync(status: string): IntakePhotoThumbStatus {
  if (status === 'uploading' || status === 'syncing') return 'uploading';
  if (status === 'failed') return 'failed';
  if (status === 'completed') return 'completed';
  return 'queued';
}

function syncStateFromStatus(status: string): IntakeSyncState {
  if (status === 'uploading' || status === 'syncing') return 'syncing';
  if (status === 'failed') return 'failed';
  if (status === 'completed') return 'synced';
  return 'queued';
}

export function localIntakePhotoAsEntity(
  input: LocalIntakePhotoInput,
  engineId: string,
): IntakePhoto {
  return {
    id: input.id,
    companyId: input.companyId,
    jobId: input.jobId,
    engineId,
    sessionId: input.sessionId,
    requirementId: input.requirementId,
    category: input.category,
    categorySource: 'worker',
    localUri: input.localUri,
    storagePath: null,
    url: input.localUri,
    contentType: 'image/jpeg',
    sizeBytes: 0,
    width: null,
    height: null,
    capturedByUid: '',
    capturedOnDeviceId: '',
    capturedAt: input.capturedAt,
    uploadedAt: input.status === 'completed' ? input.capturedAt : null,
    syncState: syncStateFromStatus(input.status),
    reviewDecision: null,
    aiInspectionState: 'none',
    deletedAt: null,
  };
}

/**
 * Server photos plus still-local captures, newest last.
 * Local rows that already share an id with the server (idempotent finalize)
 * are dropped so the strip does not flash a duplicate tile.
 */
export function mergeIntakePhotos(
  server: readonly IntakePhoto[],
  local: readonly LocalIntakePhotoInput[],
  engineId: string,
): IntakePhoto[] {
  const visibleServer = server.filter((photo) => !photo.deletedAt);
  const serverIds = new Set(visibleServer.map((photo) => photo.id));
  const extras = local
    .filter((item) => Boolean(item.localUri) && !serverIds.has(item.id))
    .map((item) => localIntakePhotoAsEntity(item, engineId));
  if (extras.length === 0) return visibleServer.slice();
  return [...visibleServer, ...extras].sort((left, right) =>
    (left.capturedAt ?? '').localeCompare(right.capturedAt ?? ''),
  );
}

export function intakePhotoPreviewUri(photo: IntakePhoto): string | null {
  const uri = photo.url || photo.localUri;
  return uri && uri.length > 0 ? uri : null;
}
