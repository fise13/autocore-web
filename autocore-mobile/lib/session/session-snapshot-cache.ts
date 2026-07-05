import type { CompanyAppConfig } from '@/types/company-config';
import type { UserCompanyMembership } from '@/types/rbac';
import type { UserEntity } from '@/types/user';

import { getJson, remove, setJson } from '@/lib/storage/kv';
import { ensureAsyncStorageMigrated } from '@/lib/storage/migrate-async-storage';

const STORAGE_KEY = 'autocore-mobile:session-snapshot:v1';

export type SessionSnapshot = {
  uid: string;
  profile: UserEntity;
  companyConfig: CompanyAppConfig | null;
  memberships: UserCompanyMembership[];
  activeCompanyName: string | null;
  savedAt: number;
};

export function readSessionSnapshotSync(uid: string): SessionSnapshot | null {
  const parsed = getJson<SessionSnapshot>(STORAGE_KEY);
  if (!parsed || parsed.uid !== uid) return null;
  return parsed;
}

export async function readSessionSnapshot(uid: string): Promise<SessionSnapshot | null> {
  await ensureAsyncStorageMigrated();
  return readSessionSnapshotSync(uid);
}

export async function writeSessionSnapshot(
  uid: string,
  payload: Omit<SessionSnapshot, 'uid' | 'savedAt'>,
): Promise<void> {
  try {
    const snapshot: SessionSnapshot = {
      uid,
      ...payload,
      savedAt: Date.now(),
    };
    setJson(STORAGE_KEY, snapshot);
  } catch {
    // Non-fatal — session still works from network.
  }
}

export async function clearSessionSnapshot(): Promise<void> {
  remove(STORAGE_KEY);
}
