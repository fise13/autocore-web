import { File } from 'expo-file-system';

import { fileNameForIntakePhoto, rewritePhotoUriExtension } from './intake-photo-payload';
import { isWorthReplacing, planPhotoCompression, resizeTarget } from './photo-compression';

/**
 * Shrink an already-queued intake photo in place, when the policy says it is
 * worth it.
 *
 * Runs *after* the capture is safe on disk and in the outbox, never before.
 * The shutter guarantee stays "the shot is durable the instant it fires";
 * this is a best-effort replacement so 12 MP originals never go over the wire.
 *
 * Prefers WebP when the manipulator can produce a smaller file; otherwise
 * JPEG. Failures leave the captured original untouched.
 *
 * `expo-image-manipulator` is loaded through a guarded require so an older
 * native binary still takes photos instead of throwing at capture time.
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
  | {
      changed: true;
      beforeBytes: number;
      afterBytes: number;
      localUri: string;
      contentType: 'image/jpeg' | 'image/webp';
    };

type RenderedImage = Awaited<
  ReturnType<ReturnType<ImageManipulatorApi['ImageManipulator']['manipulate']>['renderAsync']>
>;

async function saveSmallest(
  manipulator: ImageManipulatorApi,
  rendered: RenderedImage,
  quality: number,
): Promise<{ uri: string; bytes: number; contentType: 'image/jpeg' | 'image/webp' } | null> {
  const jpeg = await rendered.saveAsync({
    compress: quality,
    format: manipulator.SaveFormat.JPEG,
  });
  const jpegFile = new File(jpeg.uri);
  if (!jpegFile.exists) return null;
  let best: { uri: string; bytes: number; contentType: 'image/jpeg' | 'image/webp' } = {
    uri: jpeg.uri,
    bytes: jpegFile.size ?? 0,
    contentType: 'image/jpeg',
  };

  const webpFormat = manipulator.SaveFormat.WEBP;
  if (!webpFormat) return best;

  try {
    const webp = await rendered.saveAsync({
      compress: quality,
      format: webpFormat,
    });
    const webpFile = new File(webp.uri);
    if (webpFile.exists && (webpFile.size ?? Infinity) > 0 && (webpFile.size ?? Infinity) < best.bytes) {
      try {
        jpegFile.delete();
      } catch {
        // Cache file; the OS will reclaim it.
      }
      best = {
        uri: webp.uri,
        bytes: webpFile.size ?? 0,
        contentType: 'image/webp',
      };
    } else if (webpFile.exists) {
      try {
        webpFile.delete();
      } catch {
        // Cache file.
      }
    }
  } catch {
    // WebP is a bonus — JPEG is always a valid fallback.
  }

  return best;
}

/**
 * Where the shrunk copy lands: alongside the original, never on top of it.
 *
 * The `-o` suffix is what makes this operation safe. The previous version wrote
 * to the original's own path, which forced the sequence "delete the capture,
 * then move the replacement into the hole" — and `moveSync` from the image
 * cache to Documents crosses volumes, so it can fail. When it did, the shot was
 * simply gone: the outbox still pointed at a path with nothing behind it, and
 * the worker got "That photo is gone from this phone" for an engine they had
 * photographed correctly.
 *
 * Nothing downstream cares about the name. `fileNameForIntakePhoto` reads only
 * the extension, and the storage object is named from the server's photo id.
 */
function destinationUri(originalUri: string, contentType: 'image/jpeg' | 'image/webp'): string {
  const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
  const withExt = rewritePhotoUriExtension(originalUri, ext);
  return withExt.replace(new RegExp(`\\.${ext}$`), `-o.${ext}`);
}

/**
 * Put the file at `dest`, tolerating a cross-volume move.
 *
 * The manipulator writes into the image cache while intake photos live in
 * Documents; `moveSync` is a rename and cannot cross that boundary on every
 * device, so a copy is the fallback — the same shape `saveIntakePhotoLocally`
 * already uses for camera captures.
 */
function placeFile(source: File, dest: File): boolean {
  try {
    source.moveSync(dest);
    return true;
  } catch {
    try {
      source.copySync(dest);
      return true;
    } catch {
      return false;
    }
  }
}

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
    const loaded = await manipulator.ImageManipulator.manipulate(localUri).renderAsync();
    const plan = planPhotoCompression({
      sizeBytes: beforeBytes,
      dimensions: { width: loaded.width, height: loaded.height },
    });
    if (plan.action === 'keep') return { changed: false, reason: 'kept' };

    const chain =
      plan.action === 'resize'
        ? manipulator.ImageManipulator.manipulate(localUri).resize(
            resizeTarget({ width: loaded.width, height: loaded.height }, plan.longEdge),
          )
        : manipulator.ImageManipulator.manipulate(localUri);
    const rendered = await chain.renderAsync();
    const saved = await saveSmallest(manipulator, rendered, plan.quality);
    if (!saved || saved.bytes <= 0) return { changed: false, reason: 'failed' };
    if (!isWorthReplacing(beforeBytes, saved.bytes)) {
      try {
        new File(saved.uri).delete();
      } catch {
        // Cache directory.
      }
      return { changed: false, reason: 'not-smaller' };
    }

    // Order matters and is the whole safety property: the smaller copy is put
    // in place first, and the capture is only released once it is provably
    // there. A failure at any point leaves the original untouched and the
    // photo still uploadable at full size — worse bandwidth, never lost work.
    const dest = destinationUri(localUri, saved.contentType);
    const replacement = new File(saved.uri);
    if (!placeFile(replacement, new File(dest))) {
      try {
        replacement.delete();
      } catch {
        // Cache file; the OS reclaims it.
      }
      return { changed: false, reason: 'failed' };
    }
    const placed = new File(dest);
    if (!placed.exists || (placed.size ?? 0) <= 0) {
      return { changed: false, reason: 'failed' };
    }
    try {
      original.delete();
    } catch {
      // A stranded original costs disk, not work. The outbox has moved on to
      // `dest`, and the launch sweep clears orphans.
    }
    return {
      changed: true,
      beforeBytes,
      afterBytes: saved.bytes,
      localUri: dest,
      contentType: saved.contentType,
    };
  } catch {
    return { changed: false, reason: 'failed' };
  }
}

export function intakeUploadFileName(photoId: string, localUri: string): string {
  return fileNameForIntakePhoto(photoId, localUri);
}
