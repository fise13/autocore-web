import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { IntakePhoto } from '@autocore/engine-intake';

import {
  intakePhotoPreviewUri,
  mergeIntakePhotos,
  thumbStatusFromSync,
  type LocalIntakePhotoInput,
} from './merge-intake-photos';

function serverPhoto(id: string, capturedAt: string): IntakePhoto {
  return {
    id,
    companyId: 'acme',
    jobId: 'job_1',
    engineId: 'eng_1',
    sessionId: 'session_1',
    requirementId: null,
    category: 'other',
    categorySource: 'worker',
    localUri: null,
    storagePath: `path/${id}`,
    url: `https://cdn.example/${id}.jpg`,
    contentType: 'image/jpeg',
    sizeBytes: 12,
    width: null,
    height: null,
    capturedByUid: 'user',
    capturedOnDeviceId: 'device',
    capturedAt,
    uploadedAt: capturedAt,
    syncState: 'synced',
    reviewDecision: null,
    aiInspectionState: 'none',
    deletedAt: null,
  };
}

function localPhoto(id: string, capturedAt: string): LocalIntakePhotoInput {
  return {
    id,
    companyId: 'acme',
    jobId: 'job_1',
    sessionId: 'session_1',
    requirementId: null,
    category: 'other',
    localUri: `file:///intake/${id}.jpg`,
    capturedAt,
    status: 'queued',
  };
}

describe('mergeIntakePhotos', () => {
  it('appends local captures that the server has not confirmed yet', () => {
    const merged = mergeIntakePhotos(
      [serverPhoto('server_1', '2026-08-25T10:00:00.000Z')],
      [localPhoto('local_1', '2026-08-25T10:01:00.000Z')],
      'eng_1',
    );
    assert.deepEqual(
      merged.map((photo) => photo.id),
      ['server_1', 'local_1'],
    );
    assert.equal(merged[1]?.url, 'file:///intake/local_1.jpg');
    assert.equal(merged[1]?.syncState, 'queued');
  });

  it('does not duplicate a local row the server already has', () => {
    const merged = mergeIntakePhotos(
      [serverPhoto('photo_1', '2026-08-25T10:00:00.000Z')],
      [localPhoto('photo_1', '2026-08-25T10:00:00.000Z')],
      'eng_1',
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.url, 'https://cdn.example/photo_1.jpg');
  });

  it('skips deleted server photos', () => {
    const deleted = {
      ...serverPhoto('gone', '2026-08-25T09:00:00.000Z'),
      deletedAt: '2026-08-25T11:00:00.000Z',
    };
    const merged = mergeIntakePhotos([deleted], [], 'eng_1');
    assert.equal(merged.length, 0);
  });
});

describe('thumbStatusFromSync', () => {
  it('maps outbox mirrors onto the four UI states', () => {
    assert.equal(thumbStatusFromSync('queued'), 'queued');
    assert.equal(thumbStatusFromSync('pending'), 'queued');
    assert.equal(thumbStatusFromSync('uploading'), 'uploading');
    assert.equal(thumbStatusFromSync('syncing'), 'uploading');
    assert.equal(thumbStatusFromSync('failed'), 'failed');
    assert.equal(thumbStatusFromSync('completed'), 'completed');
  });
});

describe('intakePhotoPreviewUri', () => {
  it('prefers the CDN url, then the local file', () => {
    assert.equal(
      intakePhotoPreviewUri(serverPhoto('a', '2026-08-25T10:00:00.000Z')),
      'https://cdn.example/a.jpg',
    );
    assert.equal(
      intakePhotoPreviewUri({
        ...serverPhoto('b', '2026-08-25T10:00:00.000Z'),
        url: null,
        localUri: 'file:///b.jpg',
      }),
      'file:///b.jpg',
    );
  });
});
