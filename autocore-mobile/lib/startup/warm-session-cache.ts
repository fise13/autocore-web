import { isProductionCompanyId, normalizeCompanyId } from '@/lib/company-id';
import { preloadSessionSnapshots } from '@/lib/realtime/preload-session-snapshots';
import { getJson } from '@/lib/storage/kv';
import type { SessionSnapshot } from '@/lib/session/session-snapshot-cache';

const SESSION_KEY = 'autocore-mobile:session-snapshot:v1';

/** Sync MMKV warm-up before first React paint (reload / cold start). */
export function warmSessionCacheFromDisk(): void {
  try {
    const snapshot = getJson<SessionSnapshot>(SESSION_KEY);
    if (!snapshot?.uid || !snapshot.profile?.companyId) return;
    const companyId = normalizeCompanyId(snapshot.profile.companyId);
    if (!isProductionCompanyId(companyId)) return;
    preloadSessionSnapshots(companyId, snapshot.uid);
  } catch {
    // Non-fatal — auth hydrate will retry.
  }
}
