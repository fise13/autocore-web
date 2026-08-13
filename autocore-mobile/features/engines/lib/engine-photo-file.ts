/**
 * Saving an engine photo out of the app.
 *
 * Follows the same shape as the document PDF actions: pull the remote file into
 * the cache directory, then hand it to the system share sheet, which is what
 * "download" means on iOS — the user picks Save to Files / Save Image / send.
 *
 * Naming rules live in `engine-photo-name` so they stay unit-testable.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  buildEnginePhotoFilename,
  photoExtension,
  PHOTO_MIME_BY_EXTENSION,
  PHOTO_UTI_BY_EXTENSION,
} from './engine-photo-name';

async function downloadToCache(url: string, filename: string): Promise<File> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();

  await File.downloadFileAsync(url, file, { idempotent: true });

  if (!file.exists) throw new Error(`Could not save "${filename}"`);
  if ((file.info().size ?? 0) <= 0) {
    file.delete();
    throw new Error('The photo came back empty');
  }
  return file;
}

export async function shareEnginePhoto(
  url: string,
  serial: string,
  index: number,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }

  const filename = buildEnginePhotoFilename(serial, index, url);
  const file = await downloadToCache(url, filename);
  const extension = photoExtension(url);

  await Sharing.shareAsync(file.uri, {
    mimeType: PHOTO_MIME_BY_EXTENSION[extension] ?? 'image/jpeg',
    UTI: PHOTO_UTI_BY_EXTENSION[extension] ?? 'public.jpeg',
    dialogTitle: filename,
  });
}
