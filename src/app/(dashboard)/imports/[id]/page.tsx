import { DocumentImportWorkspace } from "@/components/document-import/document-import-workspace";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DocumentImportPage({ params }: PageProps) {
  const { id } = await params;
  return <DocumentImportWorkspace jobId={id} />;
}
