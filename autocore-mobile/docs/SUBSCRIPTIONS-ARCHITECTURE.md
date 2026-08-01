# AutoCore Mobile — Subscription System Architecture

Status: **mobile implemented** (typecheck clean). Server side not yet built —
see [SUBSCRIPTIONS-SERVER-CONTRACT.md](./SUBSCRIPTIONS-SERVER-CONTRACT.md) for
the endpoints and the App Store Server Notifications webhook this depends on.
Until those exist, the paywall renders and prices load, but a purchase cannot be
verified and therefore cannot grant entitlement.

Target: `react-native-iap@16` (Nitro / StoreKit 2), Expo SDK 56, RN 0.85.3, TypeScript strict.

---

## 1. Audit of what already exists

This is not a greenfield feature. The app already has a working, server-authoritative,
company-scoped subscription system. The IAP work must extend it, not replace it.

### 1.1 Authentication

| Concern | Location |
|---|---|
| Firebase Auth session, email / Google / Apple | [authentication/auth-provider.tsx](../authentication/auth-provider.tsx) |
| Zustand session store | [store/auth-store.ts](../store/auth-store.ts) |
| Session facade (`uid`, `profile`, `companyId`, `memberships`, `can`) | [hooks/use-session.ts](../hooks/use-session.ts) |
| RBAC policy facade | [hooks/use-rbac-policy.ts](../hooks/use-rbac-policy.ts) |
| Root access gate | [authentication/auth-gate.tsx](../authentication/auth-gate.tsx) |
| Bearer-token API client (`Authorization` + `X-Company-Id`) | [services/api/mobile-client.ts](../services/api/mobile-client.ts) |

`AuthGate` already hard-blocks the entire app on `!isPro`, rendering
[authentication/subscription-required-screen.tsx](../authentication/subscription-required-screen.tsx),
which today only says "manage billing on the website".

### 1.2 Navigation

Expo Router, typed routes. `app/_layout.tsx` → `PersistQueryClientProvider` → `ThemeProvider`
→ `AuthProvider` → `BottomSheetModalProvider` → `AuthGate` → `RootNavigator`.
Route `app/(tabs)/profile/subscription.tsx` already exists and renders
`features/profile/screens/subscription-screen.tsx`.

### 1.3 Settings / Profile

- `features/settings/*` — hub, sections, `workspace-subscription-card.tsx`.
- `features/profile/*` — `subscription-screen.tsx`, `team-pro-gate.tsx` (an ad-hoc feature gate).
- Route registry: `features/profile/navigation.ts`, `features/settings/navigation.ts`.

### 1.4 Existing backend (web repo, Vercel + Firebase)

| Piece | Location |
|---|---|
| Domain type | `src/domain/billing.ts` |
| Internal (non-Stripe) subscription engine, 14-day trial | `src/lib/billing/internal-subscription.server.ts` |
| Server-side Pro gate for paid APIs (HTTP 402) | `src/lib/billing/verify-pro-subscription.server.ts` |
| REST | `POST /api/billing/{start-trial,activate-pro,refresh}` |
| Stripe checkout / portal / sync | `firebase/functions/src/index.ts` + `stripe-shared.ts` (callables) |
| Firestore document | `companies/{companyId}/billing/subscription` |
| Security rules | `firestore.rules` — client read only; `update`/`delete` are **`false`**. Server-authoritative. |

### 1.5 Current user / subscription model

- User: `UserEntity` from `@autocore/rbac` — role + permission set, `isCompanyOwner`, `companyId`.
- **Subscription is scoped to the company, never the user.** One `billing/subscription` doc per
  company; every employee of that company inherits `proActive`.
- Plans today: `free | pro`. Statuses: `active | trialing | past_due | canceled | unpaid | incomplete`.
- `proActive: boolean` is the single authoritative entitlement flag.

### 1.6 Reusable mobile infrastructure (must be reused, not re-implemented)

| Capability | Existing module |
|---|---|
| Ref-counted Firestore listener + `useSyncExternalStore` snapshot registry | [lib/billing/subscription-registry.ts](../lib/billing/subscription-registry.ts) |
| MMKV offline cache w/ serialize/deserialize | [lib/billing/subscription-cache.ts](../lib/billing/subscription-cache.ts) |
| MMKV KV primitives | [lib/storage/kv.ts](../lib/storage/kv.ts) |
| Firestore mapping repository | [services/firestore/billing-repository.ts](../services/firestore/billing-repository.ts) |
| Renewal/plan copy | [lib/billing/format-renewal.ts](../lib/billing/format-renewal.ts) |
| Network state | `@react-native-community/netinfo` (used in `auth-provider`) |
| UI kit | `components/ui/index.ts` — `Button`, `Badge`, `SettingsSectionCard`, `BottomSheet`, `Dialog`, `Text`, `Screen`, `Skeleton`, `EmptyState`, `SegmentedControl`, `toast` |
| Design tokens | `theme/` → `@autocore/design-tokens` (`tones`, `spacing`, `radius`, `rhythm`, `haptics`) |

**The registry + cache pair in `lib/billing/` is already exactly the "subscription state provider +
offline cache" the brief asks for.** It gets extended and moved under `lib/subscriptions/`, not rewritten.

---

## 2. The two hard problems

These drive every decision below.

### 2.1 Apple purchases are Apple-ID-scoped; AutoCore entitlements are company-scoped

A StoreKit transaction belongs to an Apple ID. An AutoCore entitlement belongs to a company.
The mapping is neither 1:1 nor stable:

- One person can own/join **several** companies (`memberships[]` already supports this).
- One company has **many** employees, each with their own Apple ID.
- Restoring on a new device replays transactions that may have been bought *for a different company*.

Resolution: every purchase is bound at request time to a **`appAccountToken`** (a UUID StoreKit 2
carries through the transaction and the server-side JWS). We mint a deterministic, server-stored
UUID per `(uid, companyId)` pair. The server maintains a uniqueness index keyed by
`originalTransactionId`, so a single Apple subscription can entitle exactly **one** company at a time.
Attempting to bind it elsewhere returns a typed, user-presentable conflict error.

### 2.2 Two payment rails write to one entitlement document

Stripe (web) and Apple (iOS) can both target `companies/{id}/billing/subscription`.
A precedence rule is mandatory, enforced **server-side only**:

```
enterprise (manual/contract)  >  stripe (active)  >  apple (active)  >  internal trial  >  free
```

- If a company has an active Stripe subscription, the app **must not** offer an IAP purchase —
  it shows "managed on the web" instead. Double-billing is the failure mode to design out.
- If a company has an active Apple subscription, the web must not offer Stripe checkout.
- A downgrade only takes effect when the higher-precedence provider reports inactive.

---

## 3. Layered architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ L6  UI                features/subscription/*                       │
│     Paywall · PlanCard · ManageSubscription · RestoreRow · Upsell   │
└───────────────▲─────────────────────────────────────────────────────┘
                │ hooks only, never imports react-native-iap
┌───────────────┴─────────────────────────────────────────────────────┐
│ L5  FeatureGate       lib/subscriptions/feature-gate.ts             │
│     feature → required tier;  ANDed with RBAC permission            │
└───────────────▲─────────────────────────────────────────────────────┘
┌───────────────┴─────────────────────────────────────────────────────┐
│ L4  State provider    providers/subscription-provider.tsx           │
│     hooks/use-subscription.ts · use-entitlement.ts · use-paywall.ts │
│     (useSyncExternalStore over the registry — no context re-renders)│
└───────────────▲─────────────────────────────────────────────────────┘
┌───────────────┴─────────────────────────────────────────────────────┐
│ L3  SubscriptionManager   lib/subscriptions/subscription-manager.ts │
│     entitlement resolution · reconcile loop · restore orchestration │
│     · pending-transaction drain · precedence · grace handling       │
└───────▲──────────────────────▲──────────────────────▲───────────────┘
        │                      │                      │
┌───────┴────────┐   ┌─────────┴─────────┐   ┌────────┴──────────────┐
│ L2 Receipt     │   │ L2 Server sync    │   │ L2 Offline cache      │
│ validation     │   │ entitlement-sync  │   │ entitlement-cache     │
│ (server-side)  │   │ (Firestore + REST)│   │ (MMKV, TTL-bounded)   │
└───────▲────────┘   └───────────────────┘   └───────────────────────┘
        │
┌───────┴─────────────────────────────────────────────────────────────┐
│ L1  PurchaseManager   lib/subscriptions/purchase-manager.ts         │
│     the ONLY module that imports react-native-iap                   │
│     connection lifecycle · fetchProducts · requestPurchase          │
│     · purchaseUpdated/Error listeners · finishTransaction · restore │
└───────▲─────────────────────────────────────────────────────────────┘
┌───────┴─────────────────────────────────────────────────────────────┐
│ L0  Catalog           lib/subscriptions/catalog.ts                  │
│     tiers · SKUs · SKU↔tier map · ordering · display metadata       │
└─────────────────────────────────────────────────────────────────────┘
```

**Dependency rule:** each layer may import only downward. `react-native-iap` appears in exactly one
file (`purchase-manager.ts`) so the store SDK can be swapped, mocked in tests, and stubbed on
Android/web without touching anything above L1.

---

## 4. Module-by-module specification

### L0 — `lib/subscriptions/catalog.ts`

Single source of truth for the plan matrix. No other module hardcodes a SKU or a tier string.

```ts
export const SUBSCRIPTION_TIERS = ['free', 'pro', 'enterprise'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export type BillingInterval = 'monthly' | 'yearly';

export type PlanDescriptor = {
  id: PlanId;                        // 'free' | 'pro_monthly' | 'pro_yearly' | 'enterprise'
  tier: SubscriptionTier;
  interval: BillingInterval | null;
  rank: number;                      // total order for upgrade/downgrade comparison
  appleSku: string | null;           // null ⇒ not purchasable via IAP
  googleSku: string | null;
  subscriptionGroupIdIOS: string | null;
  purchasable: boolean;
  availability: 'live' | 'hidden';   // 'hidden' ⇒ resolvable but not rendered in the paywall
};
```

Registry:

| Plan | tier | interval | rank | Apple SKU | purchasable | availability |
|---|---|---|---|---|---|---|
| `free` | free | — | 0 | — | no | live |
| `pro_monthly` | pro | monthly | 10 | `com.wise.autocore.pro.monthly` | yes | live |
| `pro_yearly` | pro | yearly | 20 | `com.wise.autocore.pro.yearly` | yes | **hidden** (flip to `live` when the ASC product is approved) |
| `enterprise` | enterprise | yearly | 100 | — | no (sales contract / Stripe) | live, contact-sales CTA |

"Future Yearly" is therefore **fully modelled and code-complete from day one**; shipping it is a
one-word change (`hidden` → `live`) plus an App Store Connect product. `pro_monthly` and `pro_yearly`
share one iOS subscription group so StoreKit handles upgrade/downgrade/proration natively.

Helpers: `planForSku`, `planById`, `purchasablePlans()`, `comparePlans(a,b)`, `tierRank(tier)`.

### L1 — `lib/subscriptions/purchase-manager.ts` (PurchaseManager)

Imperative, stateless-as-possible, platform-facing. Owns nothing about entitlement.

Responsibilities:

- **Connection lifecycle** — `initConnection()` on first use, `endConnection()` on sign-out;
  reference-counted and idempotent; re-init on `AppState` `active` after a background kill.
- **Product catalog** — `fetchProducts({ skus, type: 'subs' })`, normalized into an internal
  `StoreProduct` (`{ planId, displayPrice, priceAmount, currency, period, introOffer }`) so no UI
  ever reads a raw `ProductSubscriptionIOS`.
- **Purchase** — `requestPurchase({ type: 'subs', request: { apple: { sku, appAccountToken, andDangerouslyFinishTransactionAutomatically: false }, google: {...} } })`.
- **Transaction queue** — `purchaseUpdatedListener` / `purchaseErrorListener` installed **once at app
  start, before any UI mounts**, so interrupted / Ask-to-Buy / renewed transactions are never dropped.
- **Finish** — `finishTransaction({ purchase, isConsumable: false })` is called **only after** the
  server confirms validation. Never optimistically.
- **Restore** — `getAvailablePurchases()` + `syncIOS()` when the user explicitly taps Restore.
- **Native manage sheet** — `showManageSubscriptionsIOS()` / `deepLinkToSubscriptions()`.
- **Trial eligibility** — `isEligibleForIntroOfferIOS({ groupID })`.
- **Error normalization** — `ErrorCode` enum → app-level `PurchaseFailure` union
  (`user_cancelled | network | already_owned | not_available | deferred | store_unavailable | unknown`),
  each with a localized, non-technical message. `user_cancelled` is never surfaced as an error toast.

Exposed as a singleton object, not a class with hidden state, matching the module style used in
`services/notifications/notification-service.ts`.

Android/web: the module compiles everywhere; `Platform.OS !== 'ios'` short-circuits to a no-op
implementation that reports `store_unavailable`, so nothing above L1 needs platform branches.

### L2a — `lib/subscriptions/receipt-validation.ts` + server (Receipt validation layer)

**The client never decides entitlement from a local receipt.** StoreKit 2 gives a signed JWS
(`purchase.purchaseToken` on iOS) — it is forwarded, not trusted.

Client side is a thin typed transport over the existing `mobilePost`:

```ts
verifyApplePurchase({ companyId, transactionId, jws, productId, appAccountToken })
  → { entitlement: RemoteEntitlement, accepted: boolean, reason?: VerificationRejection }
```

Server side (new, web repo — `src/app/api/mobile/billing/apple/*`):

1. `verifyAccountAccess(request)` → uid (existing helper).
2. Assert the caller may manage billing for `companyId` (owner, mirroring `verifyCompanyOwner`).
3. Verify the JWS signature chain against Apple's root CAs, then call the **App Store Server API**
   `GET /inApps/v1/transactions/{transactionId}` for the authoritative record. Never trust the
   client-supplied decode.
4. Assert `bundleId === com.wise.autocore.mobile` and record `environment` (Sandbox/Production);
   Sandbox transactions are accepted only in non-production Firebase projects.
5. Assert `appAccountToken` matches the token minted for `(uid, companyId)`.
6. Uniqueness check against `appleSubscriptions/{originalTransactionId}`; conflict → HTTP 409 with
   a typed body the app renders as "This Apple subscription is already used by another workspace".
7. Apply the provider-precedence rule (§2.2).
8. Write `companies/{companyId}/billing/subscription` + the index doc, both in one transaction.

Rejection reasons are a closed union so the UI can present each one distinctly:
`signature_invalid | bundle_mismatch | environment_mismatch | token_mismatch | bound_to_other_company | expired | revoked | superseded_by_stripe`.

### L2b — `lib/subscriptions/entitlement-sync.ts` (Server sync layer)

Two directions:

- **Pull (authoritative):** the existing Firestore `onSnapshot` on `companies/{id}/billing/subscription`,
  already implemented in `services/firestore/billing-repository.ts` and ref-counted by the registry.
  This is the primary channel — Apple renewals arrive here via App Store Server Notifications with no
  client involvement.
- **Push (reconcile):** on app foreground, after purchase, after restore, and on a 6-hour timer,
  send any locally-known unsynced transactions to `/apple/verify`, then `POST /api/billing/refresh`
  (existing endpoint) to force expiry evaluation.

**App Store Server Notifications V2** webhook (new, web repo):
`POST /api/webhooks/apple/app-store` — verifies the signed payload chain, then maps
`DID_RENEW`, `DID_CHANGE_RENEWAL_STATUS`, `EXPIRED`, `GRACE_PERIOD_EXPIRED`, `REFUND`, `REVOKE`,
`DID_FAIL_TO_RENEW`, `OFFER_REDEEMED` onto the subscription document. This is what makes renewals
and cancellations work when the app is never opened.

### L2c — `lib/subscriptions/entitlement-cache.ts` (Offline cache)

Extends the existing `lib/billing/subscription-cache.ts`. Same MMKV namespace strategy, same
serialize/deserialize discipline, plus:

- `cachedAt` + `schemaVersion` on every record (bump ⇒ discard, never migrate a guess).
- **Bounded trust.** A cached entitlement is honoured while
  `now < min(currentPeriodEnd + GRACE_DAYS, cachedAt + OFFLINE_MAX_DAYS)`.
  `GRACE_DAYS = 3`, `OFFLINE_MAX_DAYS = 14`. Past that the app degrades to `free` rather than
  granting paid features forever to a device that never reconnects.
- Cleared by the existing `lib/storage/clear-local-caches.ts` on sign-out — the cache is keyed by
  `companyId`, so switching workspaces cannot leak entitlement.

### L3 — `lib/subscriptions/subscription-manager.ts` (SubscriptionManager)

The orchestrator, and the only module that knows about all three sources.

**Entitlement resolution** — merges, in strict priority order:

| # | Source | Confidence | Used when |
|---|---|---|---|
| 1 | Firestore live snapshot | `authoritative` | online, listener attached |
| 2 | MMKV cache within TTL | `cached` | offline / listener not yet warm |
| 3 | StoreKit `getActiveSubscriptions()` | `local_unverified` | offline **and** cache expired, but the device itself holds an active Apple subscription |
| 4 | — | `unknown` → treated as `free` | nothing available |

Source 3 is deliberately last and never writes to the cache: it prevents the humiliating case of a
paying user being locked out on a plane, without ever letting a jailbroken client mint entitlement
(the server still decides for anything money-adjacent, and paid *server* APIs stay gated by
`assertCompanyPro`).

Resolved output — one immutable object consumed by everything above:

```ts
export type Entitlement = {
  tier: SubscriptionTier;
  planId: PlanId;
  status: BillingStatus;
  isActive: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  renewsAt: Date | null;
  willAutoRenew: boolean;
  inGracePeriod: boolean;
  provider: 'internal' | 'stripe' | 'apple' | 'google';
  managedExternally: boolean;   // true ⇒ hide in-app purchase CTAs, show "manage on <provider>"
  source: 'authoritative' | 'cached' | 'local_unverified' | 'unknown';
  companyId: string;
};
```

Also owns:

- **Pending-transaction drain** on boot: any unfinished transaction is validated then finished.
  Guarantees Ask-to-Buy approvals, SCA-deferred purchases and mid-purchase crashes all converge.
- **Restore flow** (§6.3).
- **Trial policy** (§6.4).
- **Reconcile scheduling** — foreground, post-purchase, timer; de-duplicated and single-flight.
- **Company switch** — tears down and re-resolves; entitlement is never carried across workspaces.

### L4 — `providers/subscription-provider.tsx` + hooks

Mounted inside `AuthGate`'s `MemoAppTree`, next to the existing heads
(`SessionRealtimeHead`, `NotificationProvider`) — the established pattern in this codebase.

It is a **head component**, not a context provider around the tree: state is published through the
extended registry and read via `useSyncExternalStore`, exactly like
`lib/billing/subscription-registry.ts` does today. This keeps a subscription change from re-rendering
the whole app.

Hooks (in `hooks/`, exported from `hooks/index.ts`):

| Hook | Returns |
|---|---|
| `useEntitlement()` | `Entitlement` — resolved, never null |
| `useSubscription()` | `{ entitlement, products, isLoading, error, purchase, restore, openManage, refresh }` |
| `useFeatureGate(feature)` | `{ allowed, reason, requiredTier, presentPaywall }` |
| `usePaywall()` | imperative `present(feature?)` for non-render-path triggers |

`useCompanySubscription()` is **kept as a thin adapter** over `useEntitlement()` so the 8 existing
call sites (`auth-gate`, `team-pro-gate`, `subscription-screen`, `workspace-screen`, …) compile
unchanged during the migration, then get migrated file-by-file. No duplicated state, no big-bang diff.

### L5 — `lib/subscriptions/feature-gate.ts` (FeatureGate service)

Two orthogonal axes that must **both** pass:

```
access(feature) = RBAC.can(permission)   AND   entitlement.tier >= requiredTier(feature)
```

RBAC answers "is this person allowed?", entitlement answers "does this company pay for it?".
Conflating them is how paywalls end up shown to mechanics who could never use the feature anyway.

```ts
export type GatedFeature =
  | 'team_management' | 'invites' | 'advanced_analytics' | 'document_export'
  | 'bulk_import' | 'motors_module' | 'accounting_module' | 'warehouse_multi_location'
  | 'api_access' | 'audit_log' | 'sso' | 'priority_support';

export type FeatureRule = {
  requiredTier: SubscriptionTier;
  permission: Permission | null;
  paywall: { title: string; body: string; icon: IconName };
};
```

`FEATURE_MATRIX: Record<GatedFeature, FeatureRule>` — one table, and the existing ad-hoc gates
(`team-pro-gate.tsx`, `use-module-enabled.ts`'s Pro checks) collapse into it.

Denial reasons are distinct so the UI can respond correctly:
`entitlement_required` → paywall; `permission_denied` → "ask your administrator";
`module_disabled` → link to module settings. Three different screens, never one generic wall.

Surfaces:

- `useFeatureGate(feature)` — hook.
- `<FeatureGate feature="…" fallback={…}>` — declarative wrapper (`components/subscription/feature-gate.tsx`),
  replacing `TeamProGate`.
- `assertFeature(feature)` — imperative guard for handlers, throws a typed `FeatureLockedError`
  the global error boundary turns into a paywall sheet.

### L6 — `features/subscription/*` (UI)

| File | Purpose |
|---|---|
| `paywall-screen.tsx` | Full-screen paywall, presented modally |
| `components/plan-card.tsx` | One purchasable plan; price, period, badge, savings |
| `components/plan-selector.tsx` | Monthly/Yearly `SegmentedControl` — renders 1 or 2 options from the catalog with no code change |
| `components/feature-comparison.tsx` | Tier × feature table driven by `FEATURE_MATRIX` |
| `components/purchase-button.tsx` | CTA with `pending`/`deferred`/`success` states |
| `components/restore-purchases-row.tsx` | Required by App Review; always visible |
| `components/legal-footer.tsx` | Terms + Privacy links, auto-renew disclosure |
| `components/subscription-status-card.tsx` | Replaces the hand-rolled card in `subscription-screen.tsx` |
| `components/upgrade-prompt-sheet.tsx` | Compact `BottomSheet` paywall for in-context upsells |
| `manage-subscription-screen.tsx` | Rewrite of `features/profile/screens/subscription-screen.tsx` |
| `enterprise-contact-card.tsx` | Contact-sales path for the Enterprise tier |

All built from the existing `components/ui` barrel and `theme/` tokens. **No new colour values** —
`packages/design-tokens` is the single source of truth per the repo's CLAUDE.md.

---

## 5. Data model changes

### 5.1 `types/billing.ts` (mobile) and `src/domain/billing.ts` (web) — kept in lockstep

```ts
export const BILLING_PLANS = ['free', 'pro', 'enterprise'] as const;

export type CompanySubscription = {
  plan: BillingPlan;
  status: BillingStatus;
  proActive: boolean;                       // retained — existing clients depend on it
  tier: SubscriptionTier;                   // new
  planId: PlanId;                           // new
  provider: 'internal' | 'stripe' | 'apple' | 'google';   // extended
  billingInterval?: BillingInterval | null;
  currentPeriodEnd?: Date | null;
  // new, Apple-specific
  appleOriginalTransactionId?: string | null;
  appleProductId?: string | null;
  appleEnvironment?: 'Sandbox' | 'Production' | null;
  willAutoRenew?: boolean | null;
  gracePeriodEnd?: Date | null;
  revokedAt?: Date | null;
  isTrial?: boolean;
  // existing Stripe fields unchanged
};
```

**Backwards compatibility is mandatory** (web, desktop and older mobile builds read this doc):
`proActive` stays the authoritative boolean; `tier` defaults to `plan === 'pro' ? 'pro' : 'free'`
when absent; an unknown `plan` value degrades to `free` rather than throwing. Cross-client schema
change → flagged as high-risk in CLAUDE.md, so it ships behind a reader-tolerant mapper first.

### 5.2 Firestore

| Path | Access | Purpose |
|---|---|---|
| `companies/{companyId}/billing/subscription` | client read (existing rule), server write | entitlement of record |
| `appleSubscriptions/{originalTransactionId}` | **no client access** | uniqueness index → `{ companyId, uid, productId, status, expiresAt, environment }` |
| `users/{uid}/billing/appAccountTokens/{companyId}` | client read own, server write | the UUID bound into each purchase |

Only the third rule is client-readable and it is per-user. `firestore.rules` needs one new block;
per CLAUDE.md this counts as a production database change and gets its own review.

---

## 6. Flows

### 6.1 Boot

```
app start
 └─ PurchaseManager.installListeners()      ← before any UI, so nothing is dropped
AuthGate: authenticated + company resolved
 └─ SubscriptionProvider (head) mounts
     ├─ entitlementCache.read(companyId)     → immediate paint, no spinner
     ├─ registry.acquire(companyId)          → Firestore onSnapshot (authoritative)
     ├─ PurchaseManager.connect()            → iOS only, lazy, non-blocking
     └─ SubscriptionManager.drainPending()   → validate + finish unfinished transactions
```

The app renders from cache on frame 1; the authoritative value replaces it when it lands. This
matches the existing `readSubscriptionCacheSync` behaviour, so startup does not regress.

### 6.2 Purchase

```
1  user taps a plan in the paywall
2  guard: entitlement.managedExternally → refuse, explain (never double-bill)
3  SubscriptionManager.purchase(planId)
4  ensure store connection; fetch product if cold
5  mint/fetch appAccountToken for (uid, companyId) via the server
6  PurchaseManager.requestPurchase({ sku, appAccountToken })   ← Apple UI takes over
7  purchaseUpdatedListener fires with the JWS
8  POST /api/mobile/billing/apple/verify        ← server validates, writes Firestore
9  on accepted → finishTransaction()            ← only now
10 Firestore listener pushes the new entitlement → UI updates itself
11 haptics.success() + dismiss paywall
```

Failure handling at each step: 6 → `user_cancelled` closes silently; 8 network failure → transaction
is **left unfinished** and retried on next foreground (StoreKit replays it — this is the correct
behaviour, not a leak); 8 conflict (409) → explicit "already used by another workspace" dialog with
a support link; 9 failure → retried on next drain.

### 6.3 Restore

Explicit user action only (a visible "Restore Purchases" row, required by App Review):

```
1  PurchaseManager.sync()                       → StoreKit refresh
2  getAvailablePurchases({ onlyIncludeActiveItemsIOS: true })
3  for each → POST /apple/verify
4  outcomes:
   • 1 accepted        → success toast, entitlement updates
   • 0 found           → "No purchases found for this Apple ID"
   • bound elsewhere   → named conflict dialog
   • all expired       → "Your subscription has expired" + upgrade CTA
```

Every branch produces a distinct, non-technical message. Silent no-ops on Restore are the single
most common App Review rejection for subscription apps.

### 6.4 Trial

Two independent trial mechanisms, and the app must never show both:

- **Apple introductory offer** (StoreKit-managed, per Apple ID per subscription group).
  Eligibility read via `isEligibleForIntroOfferIOS`. The paywall renders the real offer terms from
  the product (`introductoryPriceIOS`, period, payment mode) — never hardcoded copy.
- **Internal 14-day trial** (`POST /api/billing/start-trial`, `trialUsed` flag, already built).

Policy: if the company has never used the internal trial **and** the user is not intro-offer eligible,
offer the internal trial; otherwise show the Apple offer. `SubscriptionManager.trialPolicy()` returns
one of `apple_intro | internal | none`, so the decision lives in one function.

### 6.5 Cancellation, renewal, refund

All server-driven via App Store Server Notifications — the app has zero logic here beyond rendering
`willAutoRenew` and `renewsAt`. In-app "cancel" opens Apple's native manage sheet
(`showManageSubscriptionsIOS`); we never implement a cancel button of our own, per HIG.

---

## 7. HIG and App Review compliance checklist

Requirements baked into the design rather than bolted on:

- Price, billing period, and auto-renewal terms shown **adjacent to the purchase button**, from the
  StoreKit product — never hardcoded.
- Links to Terms of Use (EULA) and Privacy Policy on the paywall.
- Visible **Restore Purchases** control.
- Native manage-subscription sheet for cancellation.
- Paywall dismissible; the app is not held hostage mid-flow.
- No purchase UI while a StoreKit request is in flight (double-tap protection).
- `user_cancelled` never rendered as an error.
- Deferred / Ask-to-Buy purchases show a "pending approval" state, not a failure.
- Dynamic Type and VoiceOver: all plan cards use `Text` variants and carry
  `accessibilityRole="button"` + a full `accessibilityLabel` including price and period.
- Reduced-motion respected via the existing `useReducedMotion`.

**Open risk — 3.1.1 external purchase links.** `SubscriptionRequiredScreen`, `TeamProGate` and
`WorkspaceSubscriptionCard` currently show "Open website" buttons that route to Stripe checkout.
On iOS, those must be removed, or region-gated, or defended under the Enterprise-services exemption
(3.1.3(e)) given AutoCore is B2B. This is a decision I need from you (§10).

---

## 8. File manifest

New (mobile) — as built:

```
lib/subscriptions/
  catalog.ts                    L0  tiers, SKUs, plan registry
  types.ts                      L0  Entitlement, PlanId, PurchaseFailure, GateResult
  purchase-manager.ts           L1  the only react-native-iap importer
  purchase-errors.ts            L1  ErrorCode → PurchaseFailure, asPurchaseFailure()
  entitlement-cache.ts          L2c MMKV, TTL-bounded (absorbs lib/billing/subscription-cache.ts)
  entitlement-resolver.ts       L3  pure merge of the sources — no I/O, unit-testable
  entitlement-registry.ts       L4  useSyncExternalStore registry (fixes the old in-place-mutation bug)
  purchase-store.ts             L4  global paywall state (catalog, flow machine)
  subscription-manager.ts       L3  orchestrator
  trial-policy.ts               L3  apple_intro | internal | none
  feature-gate.ts               L5  FEATURE_MATRIX + evaluateGate
  status-presentation.ts        —   the single status → tone/icon/label table
  format.ts                     —   dates, countdowns, renewal lines (never prices)
  dev-mode.ts                   —   __DEV__ simulator: scenarios, fake catalog, offline

providers/subscription-provider.tsx        head component, renders null
hooks/  use-entitlement · use-subscription · use-feature-gate · use-paywall
        use-subscription-sync · use-company-subscription (compat adapter)
components/subscription/  feature-gate.tsx · premium-badge.tsx
features/subscription/
  paywall-screen.tsx · manage-subscription-screen.tsx
  components/  paywall-hero · feature-row · plan-card · purchase-cta
               purchase-status-banner · paywall-footer · subscription-status-card
               sync-indicator · subscription-skeletons · dev-subscription-panel
  animation/   paywall-motion.ts · use-paywall-enter.ts
  data/        pro-features.ts
services/api/subscriptions.ts              typed endpoints over mobileFetch
app/paywall.tsx                            modal route
```

Receipt validation and server sync did not need their own files: the transport
is `services/api/subscriptions.ts` and the pull side is the existing Firestore
listener, so a separate `receipt-validation.ts` / `entitlement-sync.ts` would
have been indirection with no content.

Modified (mobile): `types/billing.ts`, `hooks/use-company-subscription.ts` (adapter),
`hooks/index.ts`, `authentication/auth-gate.tsx`, `authentication/subscription-required-screen.tsx`,
`features/profile/components/team-pro-gate.tsx` (→ `FeatureGate`),
`features/settings/components/workspace-subscription-card.tsx`, `lib/storage/clear-local-caches.ts`,
`package.json`, `app.config.ts`.

Deleted after migration: `lib/billing/*` (contents absorbed above — nothing is duplicated).

New (web repo — required for this to function; separate PR):

```
src/app/api/mobile/billing/apple/link/route.ts
src/app/api/mobile/billing/apple/verify/route.ts
src/app/api/mobile/billing/apple/restore/route.ts
src/app/api/mobile/billing/entitlement/route.ts
src/app/api/webhooks/apple/app-store/route.ts
src/lib/billing/apple/{app-store-server-api,jws-verify,notification-handler,precedence}.server.ts
src/domain/billing.ts                 extended in lockstep with mobile
firestore.rules                       appleSubscriptions + appAccountTokens blocks
```

---

## 9. Native / store configuration

- `npm i react-native-iap@^16` — peer `react-native-nitro-modules@^0.36.1` is **already installed**
  (react-native-mmkv v4 pulls it), so no version conflict. No Expo config plugin exists or is needed;
  the module autolinks via Nitro and requires a `expo prebuild` + native rebuild — it will **not**
  work in Expo Go, only in the dev client / EAS builds this project already uses.
- App Store Connect: subscription group `AutoCore Pro`, products `com.wise.autocore.pro.monthly`
  (and `.yearly` when ready), localized metadata, review screenshot, plus an In-App Purchase key
  (issuer ID, key ID, .p8) for the App Store Server API, stored as Vercel env vars.
- Paid Applications Agreement must be active or `fetchProducts` returns empty — this is the #1 cause
  of "the paywall shows no plans".
- `.storekit` configuration file for local Simulator testing; sandbox tester accounts for device QA.
- Android is scaffolded but inert until Google Play products exist (`purchasable` flag per platform).

---

## 10. Decisions — resolved 2026-07-31

1. **iOS external-purchase links → removed on iOS.** The "Open website" Stripe CTAs are stripped from
   `subscription-required-screen.tsx`, `team-pro-gate.tsx` and `workspace-subscription-card.tsx` when
   `Platform.OS === 'ios'`; iOS purchases go through IAP only. Web and desktop keep the Stripe path
   unchanged. Consequence: a company whose subscription is *already* Stripe-managed still sees
   "managed on the web" (read-only status, no link-out) on iOS — `entitlement.managedExternally`
   drives that copy.

2. **Purchaser → company owner only.** Mirrors `verifyCompanyOwner` on the existing
   `start-trial` / `activate-pro` endpoints; the new `/apple/verify` and `/apple/link` routes enforce
   the same check. Non-owners get `permission_denied` from the FeatureGate, rendering
   "ask your administrator" rather than a paywall. No RBAC or server-side permission changes needed.

3. **Enterprise → sales contract only.** `purchasable: false` in the catalog, provisioned via internal
   tooling / Stripe, surfaced in-app as a contact-sales card. Never offered through IAP.

4. **Scope → both repos.** Mobile implementation plus the web-repo endpoints, the App Store Server
   Notifications V2 webhook, and the `firestore.rules` additions. The rules change is a production
   database change and is isolated into its own commit for review, per CLAUDE.md.

5. **SKU identifiers** default to `com.wise.autocore.pro.monthly` / `.yearly` (matching the
   `com.wise.autocore.mobile` bundle ID). These live only in `catalog.ts` — changing them later is a
   one-file edit plus the App Store Connect product.

---

## 10a. Review finding — the app is all-or-nothing gated

`AuthGate` blocks the **entire app** for any workspace without an active
subscription (`needsSubscription` → the paywall gate). A free user therefore
never reaches a screen where a per-feature gate could fire.

Consequence: `FEATURE_MATRIX`'s `entitlement_required` branch is currently
unreachable for every `pro`-tier feature. The gates still do useful work —
`permission_denied` and `module_disabled` fire today, and the `enterprise`-tier
rows (`audit_log`) resolve correctly — but the paywall-on-locked-feature path
only becomes live if there is a real free tier.

This is a product decision, not a bug, so it has been left as-is. Two coherent
options:

1. **Keep all-or-nothing.** The matrix is future-proofing plus Enterprise
   gating. Nothing to change.
2. **Introduce a real free tier.** Remove the `needsSubscription` block in
   `authentication/auth-gate.tsx`, let free users into the app, and the existing
   gates start doing the work they were written for — with no changes to the
   gate layer itself.

## 11. Implementation order (once approved)

| Phase | Content | Status |
|---|---|---|
| 1 | Dependency install, catalog, types, reader-tolerant `types/billing.ts` mapper | **done** |
| 2 | `PurchaseManager` + error normalization + connection lifecycle | **done** |
| 3 | Cache, registry, resolver, `SubscriptionManager` | **done** |
| 4 | Provider + hooks + `useCompanySubscription` adapter | **done** |
| 5 | `services/api/subscriptions.ts` + **web endpoints + webhook** | client done, **server pending** |
| 6 | FeatureGate service + `TeamProGate` migrated to it | **done** |
| 7 | Paywall + manage screen + restore + trial UI | **done** |
| 8 | Yearly flip-on, Enterprise card, Android scaffold | catalog change only |

`react-native-iap@16` autolinks through Nitro and needs `expo prebuild` + a
native rebuild. It will **not** run in Expo Go — only in the dev client and EAS
builds this project already uses. No Expo config plugin exists or is required.

Not yet verified on device: the sandbox purchase round-trip, which needs both the
server endpoints and App Store Connect products before it can run at all.
