import "server-only";

export { generateDocumentPdf, generatePdfFromRenderUrl } from "@/lib/documents/generate-pdf";
export type { PdfFromUrlOptions } from "@/lib/documents/generate-pdf";

export async function generateDocumentPdfWithRetry(
  slug: Parameters<typeof import("@/lib/documents/generate-pdf").generateDocumentPdf>[0],
  companyId: string,
  orderId: string,
  options?: { theme?: import("@/domain/company-branding").DocumentTheme; maxAttempts?: number },
): Promise<Buffer> {
  const { generateDocumentPdf } = await import("@/lib/documents/generate-pdf");
  const maxAttempts = options?.maxAttempts ?? 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generateDocumentPdf(slug, companyId, orderId, { theme: options?.theme });
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("PDF generation failed");
}
