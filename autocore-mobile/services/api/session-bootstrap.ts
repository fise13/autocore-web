import type { User } from 'firebase/auth';

import type { CompanyAppConfig } from '@/types/company-config';
import type { UserCompanyMembership } from '@/types/rbac';
import type { UserEntity } from '@/types/user';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

export type SessionBootstrapPayload = {
  profile: UserEntity | null;
  companyConfig: CompanyAppConfig | null;
  memberships: UserCompanyMembership[];
  activeCompanyName: string | null;
};

export async function fetchSessionBootstrapFromApi(
  user: User,
): Promise<SessionBootstrapPayload | null> {
  try {
    const token = await user.getIdToken();
    const response = await fetch(`${getPublicApiBaseUrl()}/api/mobile/session/bootstrap`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (__DEV__) {
        console.warn(
          `Session bootstrap API ${response.status} from ${getPublicApiBaseUrl()}/api/mobile/session/bootstrap`,
        );
      }
      return null;
    }

    const payload = (await response.json()) as SessionBootstrapPayload;
    return payload;
  } catch (error) {
    if (__DEV__) {
      console.warn('Session bootstrap API unreachable:', error);
    }
    return null;
  }
}
