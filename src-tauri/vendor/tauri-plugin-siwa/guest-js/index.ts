import { invoke } from '@tauri-apps/api/core';

export type Scope = 'fullName' | 'email';

export interface AppleIDAuthorizationRequest {
  scope: Scope[];
  nonce?: string;
  state?: string;
}

export interface AppleIDAuthorizationResponse {
  userIdentifier: string | null;
  givenName: string | null;
  familyName: string | null;
  email: string | null;
  authorizationCode: string;
  identityToken: string | null;
  state: string | null;
}

export async function getAppleIdCredential(
  request: AppleIDAuthorizationRequest,
): Promise<AppleIDAuthorizationResponse> {
  return invoke<AppleIDAuthorizationResponse>('plugin:siwa|get_apple_id_credential', {
    payload: request,
  });
}
