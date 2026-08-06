import type {
  EngineIntakeCommand,
  EngineIntakeCommandResult,
  FinalizeIntakePhotoRequest,
  PrepareIntakePhotoRequest,
  PrepareIntakePhotoResponse,
} from '@autocore/engine-intake';

import { mobilePost } from '@/services/api/mobile-client';

export async function sendEngineIntakeCommand(
  command: EngineIntakeCommand,
): Promise<EngineIntakeCommandResult> {
  const result = await mobilePost<EngineIntakeCommandResult>(
    '/api/engine-intake/commands',
    command,
  );
  if (!result?.ok || !result.jobId) {
    throw new Error('Engine intake command returned an invalid response');
  }
  return result;
}

export function prepareEngineIntakePhoto(
  input: PrepareIntakePhotoRequest,
): Promise<PrepareIntakePhotoResponse> {
  return mobilePost<PrepareIntakePhotoResponse>('/api/engine-intake/photos/prepare', input);
}

export function finalizeEngineIntakePhoto(
  input: FinalizeIntakePhotoRequest,
): Promise<{ photoId: string; url: string; aiInspectionId: string }> {
  return mobilePost('/api/engine-intake/photos/finalize', input);
}
