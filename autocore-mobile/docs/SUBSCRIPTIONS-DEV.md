# Running the subscription system in development

The real flow needs three things that do not exist on a dev machine: a
verification endpoint, App Store Connect products, and a sandbox Apple ID. The
built-in simulator substitutes all three.

**One button.** Open the paywall (or get blocked by the subscription gate) and
tap **Simulate purchase** in the dashed *Development* panel at the bottom. It
runs the real state machine — loading → verifying → success, with haptics and
the success animation — and leaves the workspace on Pro. The whole app reacts
immediately: gates unlock, the badge appears, the status card fills in.

The panel appears in two places:

- the paywall (`/paywall`, and the blocking gate for a workspace with no plan)
- Profile → Subscription

## Jumping to a specific state

The scenario chips switch the entitlement instantly, so every branch of the UI
is reachable without waiting for a real billing event:

| Scenario | What it exercises |
|---|---|
| `Off` | Real server + StoreKit (the default) |
| `Free` | Paywall, locked feature gates, the blocking gate |
| `Trial` | Trial countdown bar, 12 days left |
| `Pro monthly` / `Pro yearly` | Active states, renewal date, premium badge |
| `Ending` | Auto-renew off — "Access until" instead of "Next billing date" |
| `Past due` | Grace period, amber payment-issue state |
| `Expired` | Ended subscription, restore / re-subscribe path |
| `Stripe` | `managedExternally` — purchase CTAs hidden, no double-billing |
| `Enterprise` | Contract tier, contact-sales presentation |

**Simulate offline** forces the sync indicator into its offline state and
disables refresh/restore, so the offline path can be checked without airplane
mode.

The choice persists across reloads (MMKV), so a scenario survives a Fast Refresh
or an app restart. Set it back to **Off** to return to the real system.

## What the simulator does not fake

- **Server-side gates.** Paid API routes are still guarded by
  `assertCompanyPro`, which reads Firestore. A simulated entitlement unlocks the
  *UI* only; a request to a paid endpoint will still be refused. That is
  deliberate — it is the same asymmetry that makes the client-side fallback safe
  in production.
- **StoreKit itself.** No transaction is created, so nothing lands in the queue
  and `finishTransaction` is never called.

## Safety

Every entry point in [dev-mode.ts](../lib/subscriptions/dev-mode.ts) returns an
inert value when `__DEV__` is false, and `DevSubscriptionPanel` renders `null`,
so the entire subtree drops out of release builds even if a call site forgets to
guard.

A simulated entitlement resolves with `source: 'dev'`, and the sync indicator
renders it as an amber **Simulated** chip — it can never be mistaken on screen
for a real subscription.

## Products without App Store Connect

`loadProducts()` falls back to a simulated catalog whenever the store returns an
empty list or errors **and** `__DEV__` is true. Prices are built with
`Intl.NumberFormat`, so the paywall exercises the same "render the string the
store gave us" path as production rather than a placeholder.

This also covers the most common real-world cause of a blank paywall: the Paid
Applications Agreement not being active yet. In development you get a working
catalog; in production you get the honest empty state.

## Native build required

`react-native-iap@16` autolinks through Nitro, so it needs `expo prebuild` and a
native rebuild. It does **not** run in Expo Go — use the dev client or an EAS
build. The simulator above works in either case, since it never touches the
native module.
