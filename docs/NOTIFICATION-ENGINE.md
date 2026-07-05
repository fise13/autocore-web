# AutoCore Notification Engine

Enterprise notification infrastructure for AutoCore. **Push is one delivery channel**, not the product.

## Architecture

```
Business Action
    → NotificationEvent (typed)
    → Event Registry (priority, category, roles, channels)
    → Recipient Resolver (RBAC + assignee rules)
    → Preference Filter (categories, quiet hours, channel toggles)
    → Grouping Engine (anti-spam buckets)
    → Delivery Orchestrator
         ├── Inbox (Firestore /notifications)
         ├── Push (Expo Push API)
         ├── Badge (via push payload)
         ├── Email (future — Resend)
         ├── SMS (future)
         └── Webhook (future)
```

## Core modules (web)

| Path | Responsibility |
|------|----------------|
| `src/domain/notifications/types.ts` | Event types, priorities, preferences schema |
| `src/domain/notifications/event-registry.ts` | **Register events here** — priority, roles, copy, deep links |
| `src/lib/notifications/engine.server.ts` | `emitNotificationEvent()` entry point |
| `src/lib/notifications/preference-resolver.ts` | Quiet hours, category/channel resolution |
| `src/lib/notifications/grouping.ts` | Smart grouping copy + bucket keys |
| `src/lib/notifications/dispatch.server.ts` | Expo push sender (decoupled from inbox) |
| `src/lib/notifications/from-domain-event.server.ts` | Domain event → notification bridge |
| `src/lib/notifications/rule-evaluators.server.ts` | Scheduled business rules |
| `src/infrastructure/firestore/notification-repository.server.ts` | Firestore persistence |

## Adding a new notification (3 steps)

1. Add event type to `NOTIFICATION_EVENT_TYPES` in `types.ts`
2. Register in `NOTIFICATION_EVENT_REGISTRY` with priority, roles, channels, copy builders
3. Emit from business code: `await emitNotificationEvent({ companyId, eventType, ... })`

No changes to push, inbox, or preference plumbing required.

## Data model (Firestore)

| Collection | Purpose |
|------------|---------|
| `notifications/{id}` | Inbox records per user |
| `users/{uid}/notificationPreferences/default` | Server-synced preferences |
| `users/{uid}/devices/{deviceId}` | Expo push tokens |
| `companies/{id}/notificationGroupBuckets/{id}` | Grouping state (anti-spam) |

## Priority → channels

| Priority | Default delivery |
|----------|------------------|
| Critical | Inbox + Push + Badge (ignores quiet hours for push) |
| High | Inbox + Push |
| Medium | Inbox only |
| Low | Inbox (history) |

User preferences and quiet hours filter on top.

## Role awareness

Each event defines eligible `roles` and optional `permissions`. Mechanics/diagnosticians respect `assigneeOnlyForRoles` — they only receive work-order events when listed in `assigneeUserIds`.

Owners do **not** receive every event; registry limits categories per role.

## Event sources (current)

- **Work order domain events** — after `processWorkOrderEventsUseCase` (OrderCreated, OrderCompleted, EngineSold, …)
- **Cron rules** — `POST /api/cron/notifications/evaluate-rules?schedule=hourly|morning|evening` with header `x-cron-secret: $CRON_SECRET`
  - Hourly: low inventory, overdue invoices
  - Evening: open work orders after hours
  - Morning: expiring warranties

## Mobile

| Path | Purpose |
|------|---------|
| `features/settings/screens/notifications-settings-screen.tsx` | Full prefs UI (channels, categories, quiet hours) |
| `features/notifications/notification-inbox-screen.tsx` | In-app Notification Center |
| `hooks/use-notification-preferences.ts` | Server-synced prefs + MMKV cache |
| `hooks/use-notification-inbox.ts` | Inbox API client |
| `hooks/use-push-notifications.ts` | Expo token registration + deep links |

### API routes

- `GET /api/mobile/notifications/inbox`
- `PATCH /api/mobile/notifications/preferences`
- `POST /api/mobile/notifications/register-device`
- `PATCH /api/mobile/notifications/[id]`
- `POST /api/mobile/notifications/mark-all-read`

## Deep links

Notifications carry `deepLink` (e.g. `autocoremobile://orders/{id}`). Mobile resolves to Expo Router paths on tap (foreground, background, cold start via `getLastNotificationResponseAsync`).

## Environment

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Authorizes scheduled rule evaluation |

## Firestore indexes (deploy)

```
notifications: userId ASC, companyId ASC, createdAt DESC
notifications: userId ASC, companyId ASC, state ASC
```

## Design decisions

1. **Event-first** — notifications never originate from push SDK; push is a dispatcher concern.
2. **Registry pattern** — scales to dozens of event types without architectural churn.
3. **Admin SDK writes** — delivery runs server-side; clients only read/update own inbox + prefs.
4. **Grouping buckets** — prevents "John created work order" spam; merges within configurable windows.
5. **Async delivery** — `emitNotificationEvent` uses `Promise.all` per recipient; never blocks HTTP handlers (work-order processing fires notifications in `void` catch).
6. **Expo Push** — chosen for Expo dev/production parity; swappable for FCM HTTP v1 behind `dispatch.server.ts`.

## Roadmap

- [ ] Email channel via Resend + digest job
- [ ] Web inbox (Next.js)
- [ ] Rich push actions (iOS categories)
- [ ] Webhook channel for integrations
- [ ] Real-time inbox listener (Firestore client) vs polling
