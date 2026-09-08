# Vercel Deployment

## Scope

Vercel deploys:

- the Next.js marketing site;
- the authenticated web dashboard;
- Next.js route handlers;
- server-side document and PDF routes.

Vercel does not deploy Firebase Auth, Firestore rules, Firestore indexes, Storage configuration, or Firebase Functions.

## Project configuration

- Framework: Next.js.
- Root directory: repository root.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Node.js: 20 or newer.
- Region: `fra1`, configured in `vercel.json`.

Document and PDF routes receive 60 seconds and 1 GB memory through `vercel.json`.

## Domains

Attach both production domains to the same Vercel project:

- `myautocore.com` for marketing and public SEO pages;
- `app.myautocore.com` for authenticated application routes.

The `www` variants redirect to their canonical hosts.

Required URL variables:

```text
NEXT_PUBLIC_MARKETING_URL=https://myautocore.com
NEXT_PUBLIC_APP_URL=https://app.myautocore.com
```

Also configure:

- Firebase Authentication authorized domains for both hosts.
- Apple Services ID domain and return URL for the application host.
- Stripe return URLs and webhook/callable configuration for production.

## Required environment variables

Use `.env.vercel.example` as the source checklist. Store values in Vercel Project Settings, never in Git.

### Firebase client

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

### Firebase Admin

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

Set the complete service-account JSON value. Do not set a local filesystem path on Vercel.

### Documents

```text
DOCUMENT_RENDER_SECRET
DOCUMENT_WORKER_SECRET
```

Use independent random values with at least 32 characters. Keep production and preview values separate.

### Engine intake photos

```text
INTAKE_PHOTO_WORKER_SECRET
```

Authorizes `/api/engine-intake/photos/auto-finalize`, which the `onIntakePhotoUploaded` Storage trigger calls to finish a photo whose bytes arrived after the mobile app was closed. The same value must be set on Firebase Functions (`firebase/functions/.env`) or the trigger logs a warning and photos stay `syncing` until the worker reopens the app. Same rules as above: 32+ random characters, separate per environment.

### Application URLs

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_MARKETING_URL
```

### Email

```text
RESEND_API_KEY
RESEND_NOREPLY_EMAIL
RESEND_FROM_EMAIL
```

### AI

```text
SCAN_AI_MODEL
IMPORT_AI_MODEL
DOCUMENT_AI_MODEL
```

All optional. Every AI surface runs on Gemini and falls back to the single default
in `src/infrastructure/openrouter/gemini-models.ts` when these are unset.

The OpenRouter API key is **not** a Vercel variable. It lives only in
`firebase/functions/.env` (`OPENROUTER_API_KEY`). Every web/API caller reaches
OpenRouter through the deployed `openrouterProxy` Cloud Function.

Magic Import (motors and warehouse) calls `POST /api/import-ai`, which verifies the
user with the Admin SDK and then talks to OpenRouter through the same transport. If
neither a key nor the proxy is reachable the route answers `503` and both importers
continue rules-only rather than failing the import.

- Proxy URL is derived automatically from `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  (`https://europe-west1-<project>.cloudfunctions.net/openrouterProxy`).
- Auth uses the existing Firebase Admin service account (Google ID token for
  that function URL). No `AI_PROXY_*` or `OPENROUTER_*` vars on Vercel.
- Optional overrides: `AI_PROXY_URL`, `AI_PROXY_SECRET` (same secret as
  Functions). Direct `OPENROUTER_API_KEY` remains a local-only fallback when
  the proxy URL cannot be resolved.

### Test and review accounts

Granting Pro without payment is off in production. To prepare an App Store
review or QA login, set both:

```text
ALLOW_INTERNAL_PRO_ACTIVATION=true
INTERNAL_PRO_ALLOWED_EMAILS=reviewer@example.com
```

`ALLOW_INTERNAL_PRO_ACTIVATION` alone would let **any** company owner grant
themselves Pro for free — always pair it with the allow-list in production, and
unset both once the account exists. The entitlement is written to
`companies/{companyId}/billing/subscription`, so web and mobile both pick it up.

Only configure models used by the enabled product workflows.

### Billing

Public price identifiers:

```text
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY
NEXT_PUBLIC_STRIPE_PRICE_FREE
```

Google Ads conversion tracking for Pro checkout embeds GA4 `G-QEVTMP0BYB` and Ads `AW-18344172044` in the document `<head>` on Vercel production (Consent Mode v2: storage denied until the cookie banner is accepted). The "Подписка" conversion (`AW-18344172044/FsM2CKqomuscEIy0l6tE`) fires on Paddle checkout completion and on the thank-you pages (`/welcome`, `?checkout=success`) after consent. Override with `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, and `NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIPTION_SEND_TO` if the account changes. Localhost and preview stay silent unless those env vars are set.

Stripe secret keys belong in Firebase Functions configuration, not public Next.js variables.

Apple in-app purchases — **required for the iOS app to record a subscription at all**:

```text
APPLE_APP_STORE_KEY_ID
APPLE_APP_STORE_ISSUER_ID
APPLE_APP_STORE_PRIVATE_KEY
```

From App Store Connect → Users and Access → Integrations → In-App Purchase. The
private key is the `.p8` contents; paste it with literal `\n` between lines, which
is the form `readAppStoreCredentials()` expects.

These are not optional in the way most entries on this page are. Without them
`/api/mobile/billing/apple/verify` answers `503` for every purchase: StoreKit
still takes the customer's money, the entitlement is never written, and the app
retries on a backoff that reaches twelve hours. Nothing on the web shows the
subscription, because there is no document to show. `/api/mobile/billing/apple/link`
keeps working throughout — it only mints a UUID — so the workspace looks
half-configured rather than unconfigured.

Verify after deploy: buy in a TestFlight build and confirm a document appears at
`appleTransactionLinks/{originalTransactionId}`. An empty collection means no
purchase has ever been honoured.

To repair purchases taken while the keys were missing, run — from the repository
root, with the credentials in `.env.local` — a dry run first:

```bash
node --conditions=react-server --import tsx scripts/recover-apple-subscription.ts --transaction <transactionId>
```

Add `--apply` once the printed transaction looks right. It reuses the route's own
validation and writer, so a recovered subscription is indistinguishable from one
that verified normally.

`ALLOW_INTERNAL_PRO_ACTIVATION` must be absent or `false` in normal production. Enable it only for a controlled internal licensing environment.

## Environment separation

Configure Production, Preview, and Development independently.

- Production must use production Firebase, email, domain, and billing values.
- Preview should use isolated or restricted backend resources.
- Development values belong in local `.env.local`.
- Never expose server-only values through a `NEXT_PUBLIC_` prefix.

## Pre-deploy verification

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:scan
npm run i18n:check
npm run build
```

If a change touches other surfaces:

```bash
cd autocore-mobile && npm ci && npm run typecheck
cd ../firebase/functions && npm ci && npm run build
```

## Deployment procedure

1. Merge a reviewed commit into the production branch.
2. Confirm Vercel uses the expected environment scope.
3. Review the build output for missing variables and serverless size warnings.
4. Wait for deployment health checks.
5. Run the post-deploy smoke test.
6. Promote or retain the deployment only after verification.

## Post-deploy smoke test

Verify:

- marketing home, product, pricing, sitemap, and robots;
- login with each enabled provider;
- company selection and dashboard load;
- inventory and work-order realtime updates;
- one non-destructive API read;
- PDF/document generation;
- file download from Firebase Storage;
- billing portal or checkout initiation;
- mobile API authentication if mobile routes changed.

Do not use production customer records for destructive tests.

## Rollback

For a web/API regression:

1. open the previous healthy Vercel deployment;
2. promote it to production;
3. verify both domains;
4. record the failed deployment and affected commit.

Vercel rollback does not revert:

- Firestore writes or migrations;
- Firestore rules and indexes;
- Firebase Function deployments;
- Storage changes;
- Stripe or Firebase Console configuration.

Those systems require their own rollback plan.

## Firebase release coordination

When a release includes Firebase changes, deploy in compatibility order:

1. additive rules/indexes or backward-compatible server changes;
2. Vercel application;
3. mobile/desktop clients;
4. cleanup of legacy fields only after all clients have migrated.

Avoid deploying a web client that depends on an index or rule not yet active.

## Troubleshooting

### Firebase Admin initialization fails

- Confirm `FIREBASE_SERVICE_ACCOUNT_JSON` is valid complete JSON.
- Confirm escaped newlines in the private key are preserved.
- Confirm the service account belongs to the expected Firebase project.

### PDF generation fails

- Confirm document secrets exist.
- Confirm the route has the configured duration and memory.
- Inspect Chromium bundle tracing in `next.config.ts`.
- Check Storage permissions and bucket configuration.

### Demo (`/demo`) fails or times out

Marketing CTAs open `https://app.myautocore.com/demo`, which POSTs `/api/demo/token`, mints a Firebase custom token for `demo@autocore.app`, and seeds company `demo-autocore`.

- Confirm `FIREBASE_SERVICE_ACCOUNT_JSON` is valid production JSON. Without Admin, the route returns 503.
- `DEMO_ACCOUNT_PASSWORD` is optional. The live path uses a custom token, not email/password.
- The token route must not wipe Firestore on every visit. Reset runs on logout (`/api/demo/reset`) and has a 60s budget.
- Confirm `app.myautocore.com` is a Firebase Auth authorized domain (required for `signInWithCustomToken`).

### Authentication redirect fails

- Confirm the deployed host is authorized in Firebase.
- Confirm Apple/Google redirect URLs exactly match the canonical application host.
- Confirm `NEXT_PUBLIC_APP_URL` is not a preview or local URL in production.

### Realtime data is empty

- Confirm the signed-in user has an active company membership.
- Confirm Firestore rules and indexes were deployed.
- Confirm the client points to the expected Firebase project.
