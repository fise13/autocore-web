import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  intakeOutboxBannerCopy,
  intakeSessionDoneCopy,
  pickIntakeOutboxPhotoIssue,
} from './intake-outbox-banner-copy';

describe('intakeOutboxBannerCopy', () => {
  it('hides when only commands remain — no phantom leftover item', () => {
    assert.deepEqual(
      intakeOutboxBannerCopy({
        photoPending: 0,
        photoFailed: 0,
        syncing: true,
        needsDeploy: false,
      }),
      { visible: false, alert: false, title: '' },
    );
  });

  it('says nothing about photos that are simply still on their way', () => {
    // The yard works at the edge of coverage; "4 photos waiting to sync" was
    // the banner's most common state and taught people to ignore the strip.
    for (const syncing of [true, false]) {
      assert.equal(
        intakeOutboxBannerCopy({
          photoPending: 4,
          photoFailed: 0,
          syncing,
          needsDeploy: false,
        }).visible,
        false,
      );
    }
  });

  it('speaks up only when a person is actually needed', () => {
    assert.deepEqual(
      intakeOutboxBannerCopy({
        photoPending: 0,
        photoFailed: 1,
        syncing: false,
        needsDeploy: false,
      }),
      { visible: true, alert: true, title: '1 photo needs you' },
    );
    assert.equal(
      intakeOutboxBannerCopy({
        photoPending: 2,
        photoFailed: 3,
        syncing: true,
        needsDeploy: false,
      }).title,
      '3 photos need you',
    );
  });

  it('never says "sync" — the word has no meaning on the floor', () => {
    const titles = [
      intakeOutboxBannerCopy({
        photoPending: 0,
        photoFailed: 2,
        syncing: false,
        needsDeploy: false,
      }).title,
      intakeOutboxBannerCopy({
        photoPending: 0,
        photoFailed: 0,
        syncing: false,
        needsDeploy: true,
      }).title,
      intakeSessionDoneCopy({ synced: false, photoPending: 3 }),
      intakeSessionDoneCopy({ synced: true, photoPending: 0 }),
    ];
    for (const title of titles) {
      assert.ok(!/sync/i.test(title), title);
    }
  });

  it('reads the stored code, not the humanised sentence', () => {
    assert.equal(
      pickIntakeOutboxPhotoIssue(
        [
          {
            companyId: 'c',
            status: 'failed',
            errorInfo: { code: 'AUTH_EXPIRED' },
            lastError: 'Sign in again to keep going. Your photos stay on this phone.',
          },
        ],
        'c',
      ),
      'Sign in again to keep going. Your photos stay on this phone.',
    );
  });

  it('ignores a photo that is merely waiting for signal', () => {
    assert.equal(
      pickIntakeOutboxPhotoIssue(
        [
          {
            companyId: 'c',
            status: 'failed',
            errorInfo: { code: 'NETWORK_UNAVAILABLE' },
            lastError: 'Saved on this phone. It uploads by itself once there is signal.',
          },
          {
            companyId: 'c',
            status: 'retry_scheduled',
            errorInfo: { code: 'SERVER_5XX' },
            lastError: 'Saved on this phone. It uploads by itself in a moment.',
          },
        ],
        'c',
      ),
      null,
    );
  });

  it('does not surface a leave-app fetch abort as a banner issue', () => {
    assert.equal(
      pickIntakeOutboxPhotoIssue(
        [
          {
            companyId: 'c',
            status: 'failed',
            errorInfo: { code: 'TIMEOUT' },
            lastError: 'fetch failed: Сетевое соединение потеряно.',
          },
        ],
        'c',
      ),
      null,
    );
  });

  it('does not invent a leftover photo on the done screen', () => {
    assert.equal(
      intakeSessionDoneCopy({ synced: false, photoPending: 0 }),
      intakeSessionDoneCopy({ synced: false, photoPending: 4 }),
    );
  });
});
