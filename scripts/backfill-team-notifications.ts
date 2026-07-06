/**
 * Backfill inbox notifications for employees who joined before the notification pipeline existed.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json tsx scripts/backfill-team-notifications.ts
 *   GOOGLE_APPLICATION_CREDENTIALS=... tsx scripts/backfill-team-notifications.ts --company-id=abc123
 *   GOOGLE_APPLICATION_CREDENTIALS=... tsx scripts/backfill-team-notifications.ts --dry-run
 */

import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";

function initAdmin() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

function readCompanyIdArg(): string | null {
  const match = process.argv.find((arg) => arg.startsWith("--company-id="));
  return match ? match.slice("--company-id=".length).trim() || null : null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const companyIdArg = readCompanyIdArg();
  initAdmin();

  const { getFirestore } = await import("firebase-admin/firestore");
  const { backfillTeamJoinNotificationsForCompany } = await import(
    "../src/lib/notifications/team-events.server"
  );

  const db = getFirestore();
  const companyIds = companyIdArg
    ? [companyIdArg]
    : (await db.collection("companies").get()).docs.map((doc) => doc.id);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const companyId of companyIds) {
    const result = await backfillTeamJoinNotificationsForCompany({ companyId, dryRun });
    totalCreated += result.created;
    totalSkipped += result.skipped;
    console.log(
      `[${companyId}] employees=${result.employees} created=${result.created} skipped=${result.skipped}${dryRun ? " (dry-run)" : ""}`,
    );
  }

  console.log(`Done. created=${totalCreated} skipped=${totalSkipped}${dryRun ? " (dry-run)" : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
