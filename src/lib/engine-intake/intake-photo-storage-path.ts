/**
 * The canonical location of an intake photo object, read back out of its path.
 *
 * `prepareIntakePhotoUpload` mints exactly one shape —
 * `companies/{companyId}/engine-intake/{jobId}/{photoId}.{ext}` — and the
 * Storage trigger that auto-finalizes an upload has nothing but the object name
 * to go on. Parsing here rather than in the trigger keeps the authority on the
 * side that also owns the writer, and keeps it testable without Firebase.
 *
 * Anything that does not match exactly is `null`, never a guess: a bucket holds
 * company logos, documents and imports too, and mistaking one of those for a
 * photo would write nonsense into an intake job.
 */

const INTAKE_PHOTO_EXTENSIONS = new Set(["jpg", "png", "webp", "heic", "heif"]);

export type IntakePhotoStorageRef = {
  companyId: string;
  jobId: string;
  photoId: string;
  extension: string;
};

/** Cheap enough for a trigger to run on every object in the bucket. */
export function isIntakePhotoStoragePath(path: string): boolean {
  return parseIntakePhotoStoragePath(path) !== null;
}

export function parseIntakePhotoStoragePath(path: string): IntakePhotoStorageRef | null {
  const segments = path.trim().split("/");
  if (segments.length !== 5) return null;
  const [root, companyId, kind, jobId, fileName] = segments;
  if (root !== "companies" || kind !== "engine-intake") return null;
  if (!companyId || !jobId || !fileName) return null;

  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return null;
  const photoId = fileName.slice(0, dot);
  const extension = fileName.slice(dot + 1).toLowerCase();
  if (!photoId || !INTAKE_PHOTO_EXTENSIONS.has(extension)) return null;

  return { companyId, jobId, photoId, extension };
}
