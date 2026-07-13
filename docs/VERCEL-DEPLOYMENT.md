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
OPENROUTER_API_KEY
OPENROUTER_MODEL
SCAN_AI_MODEL
IMPORT_AI_MODEL
DOCUMENT_AI_MODEL
```

Only configure models used by the enabled product workflows.

### Billing

Public price identifiers:

```text
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY
NEXT_PUBLIC_STRIPE_PRICE_FREE
```

Stripe secret keys belong in Firebase Functions configuration, not public Next.js variables.

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

### Authentication redirect fails

- Confirm the deployed host is authorized in Firebase.
- Confirm Apple/Google redirect URLs exactly match the canonical application host.
- Confirm `NEXT_PUBLIC_APP_URL` is not a preview or local URL in production.

### Realtime data is empty

- Confirm the signed-in user has an active company membership.
- Confirm Firestore rules and indexes were deployed.
- Confirm the client points to the expected Firebase project.
