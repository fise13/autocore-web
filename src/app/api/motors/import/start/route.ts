import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

import {
  createQueuedMotorImportJob,
  uploadMotorImportFile,
} from "@/infrastructure/firestore/admin/motor-import-admin";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { processMotorImportJobOnServer } from "@/application/use-cases/motors/process-motor-import-job.server";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";
import { isStorageBucketMissingError } from "@/lib/company/upload-company-logo-utils";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const jobId = getAdminFirestore().collection("motorImports").doc().id;
    const storagePath = await uploadMotorImportFile({
      companyId: access.companyId,
      jobId,
      fileName: file.name,
      buffer,
    });

    const firestoreJobId = await createQueuedMotorImportJob({
      jobId,
      companyId: access.companyId,
      sourceFileName: file.name,
      storagePath,
      createdByUserId: access.uid,
      autoApply: true,
    });

    after(async () => {
      try {
        await processMotorImportJobOnServer({
          companyId: access.companyId,
          uid: access.uid,
          jobId: firestoreJobId,
        });
      } catch (error) {
        console.error("[motors/import/start]", error);
      }
    });

    return NextResponse.json({ jobId: firestoreJobId }, { status: 202 });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[motors/import/start]", error);
    if (isStorageBucketMissingError(error)) {
      return NextResponse.json(
        {
          error:
            "Firebase Storage не настроен. Включите Storage в Firebase Console (Build → Storage) или укажите FIREBASE_STORAGE_BUCKET в .env.local. Правила Storage (if false) не мешают серверному импорту — нужен включённый bucket.",
        },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : "Не удалось начать импорт";
    const isStoragePermission =
      message.includes("storage") ||
      message.includes("Storage") ||
      message.includes("403") ||
      message.includes("Permission");
    return NextResponse.json(
      {
        error: isStoragePermission
          ? `${message}. Серверный импорт использует Admin SDK (не client Storage rules). Проверьте bucket и FIREBASE_STORAGE_BUCKET.`
          : message,
      },
      { status: 500 },
    );
  }
}
