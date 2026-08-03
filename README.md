# AutoCore

AutoCore is a multi-tenant operations platform for automotive dismantlers, engine sellers, parts warehouses, and repair businesses. It combines inventory, serialized motors, warehouse movements, work orders, documents, accounting, team access, and mobile scanning in one Firebase-backed product.

The production web application and API routes run on Vercel. Firebase remains the managed backend for authentication, Firestore, Storage, and Cloud Functions.

## Product surfaces

- Web dashboard and marketing site: Next.js 16, React 19, TypeScript, Tailwind CSS.
- Mobile application: Expo Router and React Native under `autocore-mobile/`.
- Desktop client: Tauri shell under `src-tauri/`, loading the hosted application.
- Backend jobs: Firebase Functions under `firebase/functions/`.
- Shared contracts: RBAC, organization, search, avatars, and i18n packages under `packages/`.

## Core modules

- Overview: operational overview, alerts, activity, and search.
- Warehouse: stock balances, locations, receipts, issues, and relocations.
- Motors: serialized engine inventory, sales, returns, and warranty workflows.
- Work orders: customers, vehicles, labor, parts, statuses, and documents.
- Documents: queued PDF generation and public warranty verification.
- Imports: spreadsheet, document, photo, and AI-assisted ingestion.
- Accounting: financial operations, advances, payroll, and reporting.
- Team management: multi-company membership, roles, invitations, and permissions.
- Mobile scanning: barcode/QR lookup, inventory movement, and floor workflows.

## Repository map

```text
src/
  app/                    Next.js pages, layouts, and route handlers
  application/use-cases/  Business operations and orchestration
  components/             Product and UI components
  domain/                 Domain entities, schemas, and state machines
  hooks/                  Client subscriptions and application hooks
  infrastructure/         Firebase, Firestore, Stripe, and external adapters
  lib/                    Server services and shared implementation utilities
autocore-mobile/          Expo mobile application
firebase/functions/       Firebase Functions TypeScript sources
packages/                 Shared cross-client packages
src-tauri/                Desktop shell
docs/                     Architecture and operations documentation
```

See [Architecture](docs/ARCHITECTURE.md) for boundaries, data flow, and deployment responsibilities.

## Requirements

- Node.js 20 or newer.
- npm with the committed lockfile.
- A Firebase project with Auth, Firestore, and Storage enabled.
- A Vercel project for production web and API deployment.
- Chrome/Chromium for local PDF generation.

## Local setup

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Populate `.env.local` with the Firebase web configuration at minimum:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MARKETING_URL=http://localhost:3000
```

For server-side API routes, provide a Firebase Admin credential through one of these mechanisms:

- Local: `FIREBASE_SERVICE_ACCOUNT_PATH` pointing to a gitignored JSON file.
- Vercel: `FIREBASE_SERVICE_ACCOUNT_JSON` containing the complete JSON value.

Never commit `.env`, `.env.local`, service-account files, generated function output, or presentation artifacts.

## Verification

Run these checks before opening a pull request or deploying:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:scan
npm run i18n:check
npm run build
```

Additional surfaces:

```bash
cd autocore-mobile && npm run typecheck
cd firebase/functions && npm run build
```

## Vercel deployment

1. Import this repository into Vercel and select Next.js.
2. Keep the repository root as the project root.
3. Configure environment variables from `.env.vercel.example`.
4. Add `myautocore.com` and `app.myautocore.com` to the same Vercel project.
5. Add both hosts to Firebase Authentication authorized domains.
6. Register the production Apple return URL for the application host.
7. deploy only after local typecheck, tests, and production build pass.

Production domain responsibilities:

- `myautocore.com`: public marketing, product, pricing, and SEO pages.
- `app.myautocore.com`: authenticated product routes and account flows.

`vercel.json` selects region `fra1` and grants PDF/document routes 60 seconds and 1 GB memory.

Detailed setup, required variables, rollback steps, and post-deploy checks are in [Vercel Deployment](docs/VERCEL-DEPLOYMENT.md).

## Firebase deployment

Vercel does not deploy Firestore rules, indexes, or Firebase Functions. Deploy those separately:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
cd firebase/functions
npm ci
npm run build
cd ../..
npx -y firebase-tools@latest deploy --only functions
```

Treat Firestore rule and index changes as production database changes. Validate them before deployment and never remove an index without confirming that no production query depends on it.

## Environment groups

- Public Firebase client configuration: `NEXT_PUBLIC_FIREBASE_*`.
- Public application URLs and contacts: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MARKETING_URL`, support variables.
- Firebase Admin: `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel.
- Documents: render and worker secrets plus Chromium configuration.
- Email: Resend API key and sender identities.
- AI: OpenRouter key and model selection.
- Billing: Stripe price IDs for the web client; Stripe secrets belong in Firebase Functions.
- Optional internal licensing: `ALLOW_INTERNAL_PRO_ACTIVATION=true` only in controlled environments.

Use `.env.local.example` for local guidance and `.env.vercel.example` as the production checklist. Example files must contain placeholders or non-production values only.

## Operational notes

- Firestore is the system of record and realtime transport.
- API authorization must bind every operation to the authenticated user's company.
- Warehouse movements and document jobs are business-critical write paths.
- PDF generation uses Chromium in Vercel serverless functions.
- The mobile and web clients share collections; schema changes require cross-client compatibility.
- Generated artifacts belong in CI/release storage, not Git.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Vercel Deployment](docs/VERCEL-DEPLOYMENT.md)
- [Repository Hygiene](docs/REPOSITORY-HYGIENE.md)
- [Native/Web Differences](docs/NATIVE-WEB-DIFF.md)
- [Mobile Scanner Design](docs/MOBILE-SCANNER-DESIGN.md)
- [Notification Engine](docs/NOTIFICATION-ENGINE.md)
- [Performance Checklist](docs/performance-checklist.md)

## Repository policy

This repository is private product source code. Do not add credentials, customer exports, generated screenshots, local build trees, compiled dependency folders, or binary release artifacts unless they are intentionally managed through a documented release process.
