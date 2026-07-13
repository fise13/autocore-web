import { ImportBatchWorkspace } from "@/components/import-batch/import-batch-workspace";

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function ImportBatchPage({ params }: PageProps) {
  const { batchId } = await params;
  return <ImportBatchWorkspace batchId={batchId} />;
}
