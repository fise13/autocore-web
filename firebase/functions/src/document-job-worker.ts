import * as functions from "firebase-functions/v1";

const documentFunctions = functions.region("us-central1").runWith({
  timeoutSeconds: 30,
  memory: "256MB",
});

function appOrigin(): string {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.myautocore.com").replace(
    /\/$/,
    "",
  );
}

function workerSecret(): string | null {
  const secret = process.env.DOCUMENT_WORKER_SECRET?.trim();
  return secret || null;
}

async function kickQueue(companyId: string, jobId: string): Promise<void> {
  const secret = workerSecret();
  if (!secret) {
    console.warn("[onDocumentGenerationJobWrite] DOCUMENT_WORKER_SECRET is not set");
    return;
  }

  const response = await fetch(`${appOrigin()}/api/documents/process-queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-document-worker-key": secret,
    },
    body: JSON.stringify({ companyId, jobId, chain: true }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`process-queue failed (${response.status}): ${text}`);
  }
}

export const onDocumentGenerationJobWrite = documentFunctions.firestore
  .document("companies/{companyId}/documentGenerationJobs/{jobId}")
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return;

    const status = String(after.status ?? "");
    if (status !== "pending") return;

    const companyId = String(context.params.companyId ?? after.companyId ?? "");
    const jobId = String(context.params.jobId ?? change.after.id);
    if (!companyId || !jobId) return;

    await kickQueue(companyId, jobId);
  });
