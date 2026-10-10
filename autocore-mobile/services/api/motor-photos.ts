import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { createLocalFileFormData } from '@/lib/network/mobile-form-data';
import { mobileApi } from '@/services/api/endpoints';
import { mobileUpload } from '@/services/api/mobile-client';

/** Long edge sent to the server: sharp on a phone, a fraction of a camera original. */
const UPLOAD_LONG_EDGE = 2048;

/**
 * Upload one engine photo and return its download URL.
 *
 * Goes through the web API (`/api/inventory/row-photo`, entityKind `motor`) —
 * the same route the desktop grid uses — because Storage rules deny direct
 * client writes and the server checks inventory-edit rights itself.
 */
export async function uploadEnginePhoto(input: {
  companyId: string;
  motorId: string;
  localUri: string;
  width?: number;
  height?: number;
}): Promise<string> {
  const wide = (input.width ?? 0) >= (input.height ?? 0);
  const resize = wide ? { width: UPLOAD_LONG_EDGE } : { height: UPLOAD_LONG_EDGE };
  const tooBig = Math.max(input.width ?? Infinity, input.height ?? Infinity) > UPLOAD_LONG_EDGE;
  const rendered = await (tooBig
    ? ImageManipulator.manipulate(input.localUri).resize(resize)
    : ImageManipulator.manipulate(input.localUri)
  ).renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });

  const form = createLocalFileFormData('file', saved.uri);
  form.append('entityKind', 'motor');
  form.append('entityId', input.motorId);
  form.append('companyId', input.companyId);

  const result = await mobileUpload<{ url?: string }>(mobileApi.inventoryRowPhoto, form);
  const url = result.url?.trim();
  if (!url) throw new Error('The server did not return a photo link');
  return url;
}
