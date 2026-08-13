/**
 * Normalize local photo metadata before POST /photos/prepare.
 *
 * Zod on the server requires `sizeBytes` as a positive int and a known
 * content type. RN File.type can be empty or a container mime that the API
 * rejects — that used to surface as a canned "server rejected this upload".
 *
 * Pure — no React Native — so the node test runner can load it.
 */

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
  'image/heic': 'image/heic',
  'image/heif': 'image/heif',
};

export type IntakePhotoPayload = {
  contentType: string;
  sizeBytes: number;
};

export type IntakePhotoPayloadError =
  | { code: 'EMPTY'; message: string }
  | { code: 'UNSUPPORTED_TYPE'; message: string };

export type IntakePhotoPayloadResult =
  | { ok: true; value: IntakePhotoPayload }
  | { ok: false; error: IntakePhotoPayloadError };

function extensionHint(uri: string): string | null {
  const path = uri.split('?')[0] ?? uri;
  const dot = path.lastIndexOf('.');
  if (dot < 0) return null;
  return path.slice(dot + 1).toLowerCase();
}

function contentTypeFromExtension(uri: string): string | null {
  const ext = extensionHint(uri);
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return null;
}

export function normalizeIntakePhotoPayload(input: {
  localUri: string;
  mimeType: string | null | undefined;
  sizeBytes: number | null | undefined;
}): IntakePhotoPayloadResult {
  const size = Math.trunc(Number(input.sizeBytes));
  if (!Number.isFinite(size) || size <= 0) {
    return {
      ok: false,
      error: {
        code: 'EMPTY',
        message: 'Captured photo is empty. Retake this angle.',
      },
    };
  }

  const raw = (input.mimeType ?? '').trim().toLowerCase();
  const fromMime = raw ? ALLOWED[raw] : undefined;
  const fromExt = contentTypeFromExtension(input.localUri);
  const contentType = fromMime ?? fromExt;

  if (!contentType) {
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_TYPE',
        message: 'Only JPEG, PNG, WebP, HEIC, and HEIF photos are supported',
      },
    };
  }

  return { ok: true, value: { contentType, sizeBytes: size } };
}
