# AI Guide playground

Isolated sandbox company for exercising AutoCore’s interactive walkthroughs without touching Live data.

The Guide Engine, catalog, Help how-to panel, and Core `showGuide` tool are **product** now. They run for every company. This playground is only a provisioned tenant (Ridgeway) plus Reset/Exit chrome.

## Product path (Live)

1. Open Help (`/help`) or Core (`⌘J` / `/ai`).
2. Ask a how-to question, or tap **Start** on a walkthrough.
3. Core (or the Help how-to panel) offers `showGuide`.
4. The Guide Engine highlights real controls.
5. Completion is detected from app state / DOM / named signals.

Catalog and engine live in `src/lib/guides/`. Overlay UI lives in `src/components/guides/`.

## How to run the sandbox

1. Start the Next.js app from the repo root: `npm run dev`.
2. Open [http://localhost:3000/playground/ai-guide](http://localhost:3000/playground/ai-guide).
3. The route provisions the Ridgeway playground company (Firebase Auth + Firestore) and signs you in as the playground owner.
4. You land on **Help** (`/help`).

Ask:

- “How do I create a work order?”
- “How do I invite a mechanic?”
- “How do I add someone to my team?”
- “How does inventory work?”

Then click **Start guided walkthrough**.

Reset seed data from the banner (**Reset data**). Exit with **Exit** (signs out).

## Playground location

| Piece | Path |
|---|---|
| Entry route | `/playground/ai-guide` → `src/app/(auth)/playground/ai-guide/` |
| Token / reset APIs | `src/app/api/playground/ai-guide/` |
| Seed + isolation constants | `src/lib/playground/ai-guide/` |
| Guide Engine + catalog | `src/lib/guides/` + `src/components/guides/` |
| This document | `playground/ai-guide/README.md` |

The playground reuses `DashboardShell`, work orders, and Team. Isolation is tenant `companyId`, not a second database.

## Test company

**Ridgeway Performance Engines LLC** (`ai-guide-playground`)

Fictional Portland, OR dismantler / performance workshop. Deterministic ids in `src/lib/playground/ai-guide/ids.ts`.

Seeded by `ensureAiGuideWorkspace` → `seedAiGuideWorkspaceData`.

Isolation:

- Hard-coded company id `ai-guide-playground` (never taken from the request body)
- Separate Auth email `guide@playground.autocore.app`
- `isAiGuideSession` is **not** `isDemoSession` — marketing Demo (`demo-autocore`) is untouched
- Reset only deletes docs with that company id, then re-seeds

Same Firebase project as Live (same as Demo).

## Architecture

```
USER ASKS ON HELP OR CORE
    → intent (Help: local matcher / Core: showGuide tool)
    → { guideId }
    → ShowGuideCard
    → GuideController (pure reducer)
    → spotlight + dock on real data-guide targets
    → user clicks real AutoCore controls
    → completion (pathname | DOM data-guide-complete | emitGuideSignal)
    → next step
```

- **AI** understands intent and explains. It does not touch the DOM.
- **Guide Engine** owns highlight, progress, wrong-click, Show me.
- **Application** owns work orders, invites, and Firestore.

## Available workflows

| id | Teaches |
|---|---|
| `create-work-order` | Orders → New work order → customer → Next → Motors/engine → Save |
| `invite-team-member` | Team → Invite → email → role → Send email |

Inventory how-to questions currently return an explanation + Motors link, not a third walkthrough.

## Adding a guide

1. Write a `GuideDefinition` under `src/lib/guides/definitions/`.
2. Register it in `src/lib/guides/catalog.ts`.
3. Add intent patterns in `src/lib/guides/intent.ts`.
4. Put `data-guide="…"` on the real control (no behavior change).
5. Prefer completion from URL, `data-guide-complete`, or `emitGuideSignal` after the true mutation.
6. Add `userCopy.guides.catalog` strings (en + ru).
