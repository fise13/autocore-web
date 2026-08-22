/**
 * Where the saved Home brief actually lives.
 *
 * Split from `home-snapshot.ts` so the rules — what may be restored, what must
 * be re-derived, how a brief expires — stay testable in plain Node. This file is
 * the only part that touches MMKV, and it holds no policy of its own.
 */
import { getAllKeys, getJson, remove, setJson } from '@/lib/storage/kv';

import type { HomePeriodId, HomeViewModel } from '../types';
import {
  deserializeHomeViewModel,
  homeBriefKey,
  serializeHomeViewModel,
  shouldPersistHomeBrief,
  HOME_BRIEF_MAX_AGE_MS,
  HOME_BRIEF_MAX_ENTRIES,
  HOME_BRIEF_PREFIX,
  HOME_BRIEF_VERSION,
  type HomeBriefEnvelope,
  type RestoredHomeBrief,
} from './home-snapshot';

/**
 * The last payload written per key, and when the store was last swept.
 *
 * The live model is rebuilt every time a listener delivers, so a naive write
 * would hit MMKV — and walk every key in it — dozens of times during a cold
 * start, to store the same brief over and over. Both guards below exist to keep
 * that off the paint path.
 */
const lastWritten = new Map<string, string>();
let lastPrunedAt = 0;
const PRUNE_INTERVAL_MS = 60_000;

function prune(): void {
  const now = Date.now();
  const entries: Array<{ key: string; savedAt: number }> = [];

  for (const key of getAllKeys()) {
    if (!key.startsWith(HOME_BRIEF_PREFIX)) continue;
    const envelope = getJson<HomeBriefEnvelope>(key);
    if (
      !envelope ||
      envelope.version !== HOME_BRIEF_VERSION ||
      now - envelope.savedAt > HOME_BRIEF_MAX_AGE_MS
    ) {
      remove(key);
      continue;
    }
    entries.push({ key, savedAt: envelope.savedAt });
  }

  if (entries.length <= HOME_BRIEF_MAX_ENTRIES) return;
  entries
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(HOME_BRIEF_MAX_ENTRIES)
    .forEach((entry) => remove(entry.key));
}

/** Persist a brief, subject to `shouldPersistHomeBrief`. */
export function writeHomeSnapshot(
  companyId: string | null,
  uid: string | null,
  model: HomeViewModel,
): void {
  if (!companyId) return;
  if (!shouldPersistHomeBrief(model)) return;

  const key = homeBriefKey(companyId, uid, model.meta.trendPeriod.id);

  try {
    // `generatedAt` moves every rebuild, so it is excluded from the comparison —
    // otherwise no two briefs would ever look equal and the guard would never
    // catch anything.
    const serialized = serializeHomeViewModel(model);
    const payload = JSON.stringify({ ...serialized, meta: { ...serialized.meta, generatedAt: 0 } });
    if (lastWritten.get(key) === payload) return;
    lastWritten.set(key, payload);

    const envelope: HomeBriefEnvelope = {
      version: HOME_BRIEF_VERSION,
      companyId,
      uid,
      savedAt: Date.now(),
      model: serialized,
    };
    setJson(key, envelope);

    const now = Date.now();
    if (now - lastPrunedAt > PRUNE_INTERVAL_MS) {
      lastPrunedAt = now;
      prune();
    }
  } catch {
    // A brief that cannot be saved is not worth failing a render over.
  }
}

export function readHomeSnapshot(
  companyId: string | null,
  uid: string | null,
  period: HomePeriodId,
): RestoredHomeBrief | null {
  if (!companyId) return null;

  const envelope = getJson<HomeBriefEnvelope>(homeBriefKey(companyId, uid, period));
  if (!envelope || envelope.version !== HOME_BRIEF_VERSION) return null;
  // Belt and braces: the key already carries these, but a brief must never be
  // shown to a different reader or a different company.
  if (envelope.companyId !== companyId || (envelope.uid ?? null) !== (uid ?? null)) return null;
  if (Date.now() - envelope.savedAt > HOME_BRIEF_MAX_AGE_MS) return null;

  try {
    return { model: deserializeHomeViewModel(envelope.model), savedAt: envelope.savedAt };
  } catch {
    return null;
  }
}

export function clearHomeSnapshots(): void {
  for (const key of getAllKeys()) {
    if (key.startsWith(HOME_BRIEF_PREFIX)) remove(key);
  }
  // Without this the dedupe guard would suppress the next write, leaving the
  // store empty and the guard convinced it had already saved.
  lastWritten.clear();
  lastPrunedAt = 0;
}
