import { File } from 'expo-file-system';

import { isWorthReplacing, planPhotoCompression, resizeTarget } from './photo-compression';

/**
 * Shrink an already-queued intake photo in place, when the policy says it is
 * worth it.
 *
 * Runs *after* the capture is safe on disk and in the outbox, never before.
 * The ordering matters: the guarantee the feature rests on is "the shot is
 * durable the instant the shutter fires", and putting an image re-encode in
 * front of that would trade the guarantee for bandwidth. So the original is
 * queued first and this is a best-effort improvement on top — every failure
 * path leaves the original file exactly where it was, and the upload proceeds
 * with it.
 *
 * `expo-image-manipulator` is loaded through a guarded require, the same way
 * `background-sync-task` loads its native modules: a JS bundle running on a
 * binary built before this dependency was added must keep taking photos
 * rather than throw at capture time.
 */

type ImageManipulatorApi = typeof import('expo-image-manipulator');

function loadImageManipulator(): ImageManipulatorApi | null {
  try {
    return require('expo-image-manipulator') as ImageManipulatorApi;
  } catch {
    return null;
  }
}

const ImageManipulatorModule = loadImageManipulator();

export type OptimizeOutcome =
  | { changed: false; reason: 'unavailable' | 'missing-file' | 'kept' | 'failed' | 'not-smaller' }
  | { changed: true; beforeBytes: number; afterBytes: number };

export async function optimizeIntakePhotoFile(localUri: string): Promise<OptimizeOutcome> {
  const manipulator = ImageManipulatorModule;
  if (!manipulator) return { changed: false, reason: 'unavailable' };

  let original: File;
  try {
    original = new File(localUri);
    if (!original.exists) return { changed: false, reason: 'missing-file' };
  } catch {
    return { changed: false, reason: 'missing-file' };
  }

  const beforeBytes = original.size ?? 0;

  try {
    // Render once to learn the real pixel dimensions — the policy refuses to
    // act without them rather than guess.
    const loaded = await manipulator.ImageManipulator.manipulate(localUri).renderAsync();
    const plan = planPhotoCompression({
      sizeBytes: beforeBytes,
      dimensions: { width: loaded.width, height: loaded.height },
    });
    if (plan.action === 'keep') return { changed: false, reason: 'kept' };

    const target = resizeTarget({ width: loaded.width, height: loaded.height }, plan.longEdge);
    const rendered = await manipulator.ImageManipulator.manipulate(localUri)
      .resize({ width: target.width, height: target.height })
      .renderAsync();
    const saved = await rendered.saveAsync({
      compress: plan.quality,
      format: manipulator.SaveFormat.JPEG,
    });

    const replacement = new File(saved.uri);
    if (!replacement.exists) return { changed: false, reason: 'failed' };
    const afterBytes = replacement.size ?? 0;
    if (!isWorthReplacing(beforeBytes, afterBytes)) {
      try {
        replacement.delete();
      } catch {
        // The cache directory is the system's to reclaim.
      }
      return { changed: false, reason: 'not-smaller' };
    }

    // Replace only now, once there is a verified, smaller file to put in its
    // place. The queue row keeps pointing at the same path throughout.
    original.delete();
    replacement.moveSync(new File(localUri));
    return { changed: true, beforeBytes, afterBytes };
  } catch {
    // Any failure leaves the captured original untouched and uploadable.
    return { changed: false, reason: 'failed' };
  }
}
