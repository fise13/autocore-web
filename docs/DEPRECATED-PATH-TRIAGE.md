# Deprecated path triage

Kill-by dates for dual-write / legacy surfaces. Owners: platform eng.

| Path | Status | Kill-by | Notes |
|------|--------|---------|-------|
| `documentImports` dual-write from `api/mobile/imports` | Active dual-write | 2026-09-30 | Keep until import hub fully on `importBatches` |
| Legacy `motors` collection reads in `motor-sale-documents` | Read fallback | 2026-09-30 | Migrate remaining docs to company-scoped motors |
| `warrantyMonths` → days (`domain/warranty`, `document-config`) | Compat field | 2026-10-31 | Write only `warrantyDays`; drop months on read after backfill |
| `isMarketingInternalPath` deprecated alias | Soft | 2026-08-31 | Prefer `isMarketingContentPath` |
| `workspace-toolbar` → `DashboardTopBar` | Soft | 2026-08-31 | Delete alias export when no imports |
| Apple JS sign-in deprecated helpers | Soft | 2026-08-31 | Use Firebase Apple helpers |
| `desktop-download-icons` re-export | Soft | 2026-08-15 | Import buttons module directly |
| Sidebar `toggleCollapsed` deprecated | Soft | 2026-09-15 | Prefer current collapse API |

Review cadence: first Monday of each month. Do not add new dual-writes without an entry here.
