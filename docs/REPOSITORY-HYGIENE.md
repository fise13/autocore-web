# Repository Hygiene

## Purpose

The Git repository contains source code, configuration templates, migrations, and durable documentation. Local credentials, generated output, customer data, build caches, and presentation working files do not belong in version control.

## Commit

- application and package source;
- lockfiles;
- Firestore rules and indexes;
- Firebase Function TypeScript sources;
- deterministic build scripts;
- sanitized environment examples;
- durable architecture and operations documentation;
- intentionally versioned static product assets.

## Do not commit

- `.env`, `.env.local`, or real environment exports;
- Firebase service-account JSON;
- Stripe, Resend, OpenRouter, Apple, or worker secrets;
- `node_modules/`;
- generated Firebase Function `lib/`;
- `.next/`, coverage, Tauri targets, or Expo caches;
- customer spreadsheets, PDFs, images, exports, or database dumps;
- investor-deck renders, contact sheets, and temporary screenshots;
- local binary installers unless managed by an explicit release policy;
- terminal output, debug captures, or forensic token payloads.

## Environment files

Allowed:

- `.env.local.example`
- `.env.vercel.example`
- `.env.desktop.example`

Example files must:

- contain placeholders or clearly non-production values;
- explain whether a variable is public or server-only;
- avoid copied credentials, even if expired;
- avoid default production passwords.

Local runtime values belong in `.env.local`, which is ignored.

## Generated code

Firebase Functions compile from:

```text
firebase/functions/src/
```

The generated directory is:

```text
firebase/functions/lib/
```

Build generated output in CI or immediately before deployment. Do not edit or commit it.

## Dependency folders

No `node_modules/` directory should be tracked at any depth. Reproduce dependencies from the relevant lockfile:

```bash
npm ci
cd autocore-mobile && npm ci
cd ../firebase/functions && npm ci
```

## Binary assets

Prefer release storage for desktop installers and acquisition materials.

If a binary must be versioned:

1. document why Git is the source of truth;
2. record who produces and signs it;
3. use Git LFS when appropriate;
4. provide a replacement and rollback procedure;
5. verify the binary contains no credentials or private customer data.

## Customer data

Never use real customer records as fixtures. Sanitized fixtures must remove:

- names and contact information;
- VINs, plates, serials, and warranty identifiers;
- access tokens and signed URLs;
- company identifiers;
- financial values that identify a customer.

## Before committing

```bash
node scripts/check-tracked-secrets.mjs
npm run typecheck
npm run test
git diff --check
```

Review the staged file list before every commit. A commit should contain one understandable change and must not absorb unrelated local work.

## Before an acquisition handoff

- rotate all production secrets;
- audit Git history for previously committed credentials;
- export Vercel and Firebase configuration inventories without secret values;
- document domain ownership and external service accounts;
- identify release binaries stored outside Git;
- archive customer data separately under the transaction's security process;
- provide an IP ownership and license schedule through legal counsel.

## Cleanup rule

Delete a file only when its lack of runtime, build, test, migration, documentation, and release references has been verified. Do not use an unused-export tool as the sole basis for deleting dynamic routes or reflection-based modules.
