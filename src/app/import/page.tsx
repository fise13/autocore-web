import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ batchId?: string }>;
};

/**
 * Universal-link landing for mobile: /import?batchId=…
 * Authenticated web users are sent into the batch review; phones open the app via AASA.
 */
export default async function ImportUniversalLinkPage({ searchParams }: PageProps) {
  const { batchId } = await searchParams;
  if (batchId?.trim()) {
    redirect(`/imports/batch/${encodeURIComponent(batchId.trim())}`);
  }
  redirect("/imports");
}
