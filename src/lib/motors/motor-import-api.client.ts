import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { MotorImportPreviewResult, MotorImportPreviewRow, MotorSheetMappingResult } from "@/lib/motors/import/types";
import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";
import { SheetImportConfig } from "@/lib/motors/excel-sheet-config";

async function readAuthToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  return (await auth.currentUser?.getIdToken()) ?? null;
}

export async function startMotorImportJob(file: File): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  try {
    const token = await readAuthToken();
    if (!token) return { ok: false, error: "Требуется авторизация" };

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/motors/import/start", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = (await response.json().catch(() => ({}))) as { jobId?: string; error?: string };
    if (!response.ok) {
      return { ok: false, error: data.error ?? "Не удалось начать импорт" };
    }
    if (!data.jobId) {
      return { ok: false, error: "Сервер не вернул jobId" };
    }

    return { ok: true, jobId: data.jobId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось начать импорт",
    };
  }
}

export async function retryMotorImportJob(jobId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await readAuthToken();
    if (!token) return { ok: false, error: "Требуется авторизация" };

    const response = await fetch("/api/motors/import/process", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      return { ok: false, error: data.error ?? "Не удалось возобновить импорт" };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось возобновить импорт",
    };
  }
}

export async function cancelMotorImportJobRemote(
  jobId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await readAuthToken();
    if (!token) return { ok: false, error: "Требуется авторизация" };

    const response = await fetch("/api/motors/import/cancel", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      return { ok: false, error: data.error ?? "Не удалось отменить импорт" };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось отменить импорт",
    };
  }
}

export async function fetchMotorImportPreviewRemote(jobId: string): Promise<
  | { ok: true; preview: MotorImportPreviewResult; rowCount: number }
  | { ok: false; error: string }
> {
  try {
    const token = await readAuthToken();
    if (!token) return { ok: false, error: "Требуется авторизация" };

    const response = await fetch(`/api/motors/import/preview?jobId=${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      preview?: MotorImportPreviewResult;
      rowCount?: number;
    };

    if (!response.ok) {
      return { ok: false, error: data.error ?? "Не удалось загрузить preview" };
    }

    if (!data.preview) {
      return { ok: false, error: "Некорректный ответ сервера" };
    }

    return { ok: true, preview: data.preview, rowCount: data.rowCount ?? data.preview.engineRows.length };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось загрузить preview",
    };
  }
}

export async function applyMotorImportJobRemote(input: {
  jobId: string;
  sheetConfigs: SheetImportConfig[];
  columnMappings: Record<string, SheetColumnMapping>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await readAuthToken();
    if (!token) return { ok: false, error: "Требуется авторизация" };

    const response = await fetch("/api/motors/import/apply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: input.jobId,
        sheetConfigs: input.sheetConfigs,
        columnMappings: input.columnMappings,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      return { ok: false, error: data.error ?? "Не удалось запустить загрузку" };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось запустить загрузку",
    };
  }
}

export async function reanalyzeMotorImportJobRemote(input: {
  jobId: string;
  manualSheetMappings: Record<string, MotorSheetMappingResult>;
}): Promise<
  | {
      ok: true;
      jobId: string;
      engineRows: MotorImportPreviewRow[];
      sheetMappings: Record<string, MotorSheetMappingResult>;
      stats: {
        totalEngineRows: number;
        validEngineRows: number;
        duplicates: number;
        errors: number;
        warnings: number;
        specificSheets: number;
      };
      quickImport: boolean;
    }
  | { ok: false; error: string }
> {
  try {
    const token = await readAuthToken();
    if (!token) return { ok: false, error: "Требуется авторизация" };

    const response = await fetch("/api/motors/import/reanalyze", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      jobId?: string;
      engineRows?: MotorImportPreviewRow[];
      sheetMappings?: Record<string, MotorSheetMappingResult>;
      stats?: {
        totalEngineRows: number;
        validEngineRows: number;
        duplicates: number;
        errors: number;
        warnings: number;
        specificSheets: number;
      };
      quickImport?: boolean;
    };

    if (!response.ok) {
      return { ok: false, error: data.error ?? "Не удалось пересчитать листы" };
    }

    if (!data.jobId || !data.engineRows || !data.sheetMappings || !data.stats) {
      return { ok: false, error: "Некорректный ответ сервера" };
    }

    return {
      ok: true,
      jobId: data.jobId,
      engineRows: data.engineRows,
      sheetMappings: data.sheetMappings,
      stats: data.stats,
      quickImport: data.quickImport ?? false,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось пересчитать листы",
    };
  }
}
