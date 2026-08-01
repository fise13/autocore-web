# Subscription server contract

The mobile IAP layer is implemented and compiles, but **it cannot complete a
purchase until these server pieces exist**. Client-side receipt validation is
not validation; every entitlement decision below is made by the server.

Bundle id: `com.wise.autocore.mobile`. Products: `com.wise.autocore.pro.monthly`,
`com.wise.autocore.pro.yearly` (subscription group `autocore_pro`).

---

## 1. `POST /api/mobile/billing/apple/link`

Mints (or returns) the stable UUID that binds a StoreKit transaction to a
`(uid, companyId)` pair. Called before every purchase.

```jsonc
// request
{ "companyId": "acme" }
// 200
{ "appAccountToken": "550e8400-e29b-41d4-a716-446655440000" }
```

Rules:
- `verifyAccountAccess(request)` → uid.
- Caller must be the company **owner** (mirror `verifyCompanyOwner`); otherwise `403`.
- Store at `users/{uid}/billing/appAccountTokens/{companyId}`. Must be stable —
  regenerating it breaks the binding of transactions already in flight.

## 2. `POST /api/mobile/billing/apple/verify`

The core of the receipt-validation layer.

```jsonc
// request
{
  "companyId": "acme",
  "transactionId": "2000000123456789",
  "jws": "eyJhbGciOiJFUzI1NiIs...",     // may be null; server must not depend on it
  "productId": "com.wise.autocore.pro.monthly",
  "appAccountToken": "550e8400-..."      // may be null on replayed transactions
}
// 200
{ "accepted": true, "proActive": true, "planId": "pro_monthly" }
// 200 (rejected — still 200, the client reads `accepted`)
{ "accepted": false, "reason": "bound_to_other_company" }
```

`reason` is a closed union; the client renders each one differently:
`signature_invalid | bundle_mismatch | environment_mismatch | token_mismatch |
bound_to_other_company | expired | revoked | superseded_by_stripe`.

Required steps, in order:

1. `verifyAccountAccess` → uid; assert company owner → else `403`.
2. Verify the JWS signature chain against Apple's root CAs.
3. **Re-fetch from the App Store Server API** —
   `GET /inApps/v1/transactions/{transactionId}` — and use *that* as the record.
   Never trust the client's decode, even after signature verification.
4. Assert `bundleId === com.wise.autocore.mobile`.
5. Assert `environment` matches the deployment (Sandbox only outside production).
6. Assert `appAccountToken` matches the stored token for `(uid, companyId)`.
7. Uniqueness: look up `appleSubscriptions/{originalTransactionId}`. If it is
   bound to a different company → `bound_to_other_company`. One Apple
   subscription entitles exactly one workspace.
8. Apply provider precedence: `enterprise > stripe > apple > internal > free`.
   If Stripe is active for this company → `superseded_by_stripe` (do **not**
   overwrite; the user would be double-billed).
9. In one transaction, write `companies/{companyId}/billing/subscription` and the
   `appleSubscriptions/{originalTransactionId}` index doc.

Subscription document fields the client already reads:

```ts
plan: 'pro'
status: 'active' | 'trialing' | 'past_due' | ...
proActive: boolean            // authoritative
provider: 'apple'
billingInterval: 'monthly' | 'yearly'
currentPeriodEnd: Timestamp
appleOriginalTransactionId: string
appleProductId: string
appleEnvironment: 'Sandbox' | 'Production'
willAutoRenew: boolean
gracePeriodEnd: Timestamp | null
revokedAt: Timestamp | null
trialUsed: boolean
```

## 3. `POST /api/mobile/billing/apple/restore`

Same validation as `/verify`, but accepts the full set of restorable
transactions and picks the highest-ranked active one.

```jsonc
// request
{ "companyId": "acme", "transactions": [{ "transactionId": "…", "jws": "…", "productId": "…" }] }
// 200
{ "restored": true, "planId": "pro_monthly", "proActive": true }
{ "restored": false, "reason": "expired" }
```

## 4. `POST /api/webhooks/apple/app-store` — App Store Server Notifications V2

**Without this, renewals and cancellations never propagate.** The app can be
closed for a month; this is what keeps the entitlement correct.

Verify the signed payload chain, then map:

| Notification | Effect |
|---|---|
| `DID_RENEW` | extend `currentPeriodEnd`, `proActive: true` |
| `DID_CHANGE_RENEWAL_STATUS` | set `willAutoRenew` |
| `EXPIRED` | `proActive: false`, `status: 'canceled'` |
| `GRACE_PERIOD_EXPIRED` | `proActive: false`, clear `gracePeriodEnd` |
| `DID_FAIL_TO_RENEW` | `status: 'past_due'`, set `gracePeriodEnd` |
| `REFUND` / `REVOKE` | `proActive: false`, set `revokedAt` |
| `OFFER_REDEEMED` | `status: 'trialing'`, set `trialUsed: true` |
| `SUBSCRIBED` (resubscribe) | `proActive: true`, refresh all fields |

## 5. Firestore rules

Two new blocks (production database change — isolate in its own commit):

```
match /appleSubscriptions/{originalTransactionId} {
  allow read, write: if false;          // server (Admin SDK) only
}

match /users/{uid}/billing/appAccountTokens/{companyId} {
  allow read: if request.auth.uid == uid;
  allow write: if false;                // server only
}
```

The existing `companies/{companyId}/billing/{docId}` block already denies client
writes and needs no change.

## 6. App Store Connect / environment

- Subscription group `autocore_pro` with the two products above, localized
  metadata, and a review screenshot.
- In-App Purchase key (issuer id, key id, `.p8`) as Vercel env vars for the
  App Store Server API.
- **Paid Applications Agreement must be active**, or `fetchProducts` returns an
  empty array and the paywall shows no plans. This is the single most common
  cause of "the paywall is blank".
- A `.storekit` configuration file for Simulator testing; sandbox tester accounts
  for on-device QA.
