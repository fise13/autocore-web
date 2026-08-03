# Mobile Startup Benchmark

Protocol for measuring AutoCore Mobile cold-start performance on iOS after offline/cache optimizations.

## Prerequisites

- Physical iOS device (simulator is useful for dev, but use a real device for final numbers)
- Signed-in Pro user with production company
- At least one prior session so MMKV caches are populated

## Scenarios

Run each scenario **5 times**. Kill the app fully between runs (swipe away from app switcher).

| Scenario | Network | What to measure |
|----------|---------|-----------------|
| A — Warm cache | Wi‑Fi | Returning user, caches populated |
| B — Offline | Airplane mode ON before launch | Offline-first behavior |
| C — Cold user | Sign out → sign in | First session after login |

## Marks (Diagnostics screen)

Profile → Settings → Diagnostics shows startup marks in milliseconds:

| Mark | Meaning |
|------|---------|
| `js_bundle_eval` | JS bundle evaluated |
| `session_cache_read` | Session snapshot read from MMKV |
| `snapshots_preloaded` | Realtime snapshots seeded into memory |
| `auth_ready` | Auth gate ready (no blocking hydrate) |
| `splash_hidden` | Native splash hidden |
| `tabs_interactive` | Home tab (Overview) mounted |

In `__DEV__`, marks also print as `console.table` when tabs become interactive.

## Recording template

```
Run # | Scenario | splash_hidden | tabs_interactive | MC data visible | Notes
------|----------|---------------|------------------|-----------------|------
1     | A        |               |                  |                 |
2     | A        |               |                  |                 |
...
```

**MC data visible**: Overview shows non-zero metrics or activity from cache (not empty placeholders).

## Targets (after Phase 2)

| Metric | Target |
|--------|--------|
| Returning user → `tabs_interactive` | < 500 ms |
| Returning user → `session_cache_read` | < 5 ms |
| Offline launch → MC data visible | Immediate (from cache) |
| Search idle spinner | Rare (only when no cached data) |

## Pre-Phase 1 baseline (reference)

- 3–10 s blocked on auth + subscription + session bootstrap gates
- Full-screen "Синхронизируем…" before tabs
- No disk cache for realtime lists

## Regression checks

After each benchmark session, verify:

1. Sign out clears cache (Diagnostics cache size near 0)
2. Orders/Search show cached data in airplane mode
3. No crash on `expo run:ios` after MMKV native module install

## Commands

```bash
cd autocore-mobile
npm run typecheck
npx expo run:ios
```

Rebuild required after adding `react-native-mmkv`.
