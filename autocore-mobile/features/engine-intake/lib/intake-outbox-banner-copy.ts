/**
 * What Engines Incoming says about photos that are not on the server yet.
 *
 * Almost always: nothing.
 *
 * A dismantler's phone lives at the edge of coverage — inside a container row,
 * behind a steel wall, on a yard Wi-Fi whose uplink is down. Photos not being
 * on the server *yet* is the normal condition of the job, not an event. The old
 * banner announced it constantly ("4 photos waiting to sync", "Server
 * temporarily unavailable"), which taught people to swipe past the strip
 * entirely — including on the day it said something that mattered.
 *
 * So this surface has exactly one job now: say something when a **person** has
 * to act, and stay silent otherwise. The queue is not the worker's to manage,
 * and no copy here names it.
 */

import { isIntakePhotoConflict, type CountableIntakePhoto } from './count-visible-intake-photos';
import { syncErrorNeedsPerson, type SyncErrorCode } from './sync-errors';

export type IntakeOutboxIssuePhoto = CountableIntakePhoto & {
  companyId?: string;
  lastError: string | null;
};

/**
 * The one sentence worth showing, or nothing.
 *
 * Reads the stored `errorInfo.code` rather than re-classifying `lastError`.
 * Round-tripping through the message text meant the banner had to recognise
 * its own already-humanised copy to work out what it had been — a translation
 * of a translation, and it went wrong the moment either side changed wording.
 */
export function pickIntakeOutboxPhotoIssue(
  photos: readonly IntakeOutboxIssuePhoto[],
  companyId: string | null | undefined,
): string | null {
  for (const photo of photos) {
    if (companyId && photo.companyId && photo.companyId !== companyId) continue;
    if (isIntakePhotoConflict(photo)) continue;
    const code = photo.errorInfo?.code as SyncErrorCode | undefined;
    if (!code || !syncErrorNeedsPerson(code)) continue;
    if (photo.status !== 'failed' && photo.state !== 'failed') continue;
    return photo.lastError ?? null;
  }
  return null;
}

export function isIntakeOutboxDeployIssue(issue: string | null): boolean {
  if (!issue) return false;
  const lower = issue.toLowerCase();
  return lower.includes('missing the upload api') || lower.includes('deploy');
}

/**
 * The line under "Saved" when a capture session ends.
 *
 * Never mentions a queue, a connection, or a count of outstanding files. The
 * worker pressed Finish; as far as their job is concerned the engine is
 * documented, and it is.
 */
export function intakeSessionDoneCopy(input: {
  synced: boolean;
  photoPending: number;
}): string {
  if (input.synced) {
    return 'Field capture is complete. The team reviews photos when needed.';
  }
  return 'The photos are on this phone and on their way. You can put it in your pocket.';
}

export type IntakeOutboxBannerCopyInput = {
  photoPending: number;
  /** Photos stuck behind something only a person can clear. */
  photoFailed: number;
  syncing: boolean;
  needsDeploy: boolean;
};

export type IntakeOutboxBannerCopy = {
  visible: boolean;
  title: string;
  alert: boolean;
};

const HIDDEN: IntakeOutboxBannerCopy = { visible: false, title: '', alert: false };

export function intakeOutboxBannerCopy(
  input: IntakeOutboxBannerCopyInput,
): IntakeOutboxBannerCopy {
  if (input.needsDeploy) {
    return {
      visible: true,
      alert: true,
      title: 'Photos cannot reach the server — ask your admin',
    };
  }

  if (input.photoFailed > 0) {
    return {
      visible: true,
      alert: true,
      title:
        input.photoFailed === 1
          ? '1 photo needs you'
          : `${input.photoFailed} photos need you`,
    };
  }

  // Photos in flight, photos waiting for signal, a busy server: all of it is
  // the app's business. Nothing to say.
  return HIDDEN;
}
