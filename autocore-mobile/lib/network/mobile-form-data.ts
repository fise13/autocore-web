import { File } from 'expo-file-system';

/** Multipart file part compatible with Expo SDK 56+ fetch (RN `{ uri, name, type }` is unsupported). */
export function appendLocalFile(formData: FormData, fieldName: string, uri: string): void {
  formData.append(fieldName, new File(uri));
}

export function createLocalFileFormData(fieldName: string, uri: string): FormData {
  const formData = new FormData();
  appendLocalFile(formData, fieldName, uri);
  return formData;
}
