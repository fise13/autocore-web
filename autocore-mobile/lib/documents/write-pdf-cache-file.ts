import { File, Paths } from 'expo-file-system';

/** Persist PDF bytes in cache — expo-file-system requires create() before write. */
export function writePdfCacheFile(filename: string, bytes: ArrayBuffer): File {
  const file = new File(Paths.cache, filename);

  if (file.exists) {
    file.delete();
  }

  file.create({ overwrite: true });
  file.write(new Uint8Array(bytes));

  if (!file.exists) {
    throw new Error(`Failed to save PDF "${filename}"`);
  }

  const size = file.info().size ?? 0;
  if (size <= 0) {
    file.delete();
    throw new Error('Server returned an empty PDF');
  }

  return file;
}

export function writePdfDocumentFile(filename: string, bytes: ArrayBuffer): File {
  const file = new File(Paths.document, filename);

  if (file.exists) {
    file.delete();
  }

  file.create({ overwrite: true });
  file.write(new Uint8Array(bytes));

  if (!file.exists) {
    throw new Error(`Failed to save PDF "${filename}"`);
  }

  return file;
}
