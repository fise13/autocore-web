import type { DocumentImportJob } from "@/domain/document-import";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";

type DocumentImportJobDto = Omit<DocumentImportJob, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

function mapJob(dto: DocumentImportJobDto): DocumentImportJob {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export async function fetchDocumentImports(): Promise<DocumentImportJob[]> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Требуется авторизация");
  }

  const token = await user.getIdToken();
  const response = await fetch("/api/imports", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    jobs?: DocumentImportJobDto[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }

  return (payload.jobs ?? []).map(mapJob);
}
