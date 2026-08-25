import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolvePhotoUploadSession,
  uploadSurvivesAppTermination,
} from './photo-upload-session';

describe('resolvePhotoUploadSession', () => {
  it('always uses the background session on iOS', () => {
    assert.equal(resolvePhotoUploadSession('ios'), 'background');
  });

  it('does not depend on what the app is doing when the task is created', () => {
    // The regression this guards: the old code read AppState and handed the
    // active-app case to the foreground session, which dies on suspend.
    const repeated = Array.from({ length: 5 }, () => resolvePhotoUploadSession('ios'));
    assert.deepEqual(new Set(repeated), new Set(['background']));
  });

  it('falls back to the foreground session where no background session exists', () => {
    assert.equal(resolvePhotoUploadSession('android'), 'foreground');
    assert.equal(resolvePhotoUploadSession('web'), 'foreground');
  });

  it('reports where an upload outlives the app', () => {
    assert.equal(uploadSurvivesAppTermination('ios'), true);
    assert.equal(uploadSurvivesAppTermination('android'), false);
    assert.equal(uploadSurvivesAppTermination('web'), false);
  });
});
