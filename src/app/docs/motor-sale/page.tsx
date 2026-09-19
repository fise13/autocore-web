import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { SaleDocumentBuilder } from "@/components/motor-land/sale-document-builder";

export const metadata: Metadata = {
  title: "Motor Land — товарная накладная",
  description:
    "Заполните данные о двигателе и покупателе — товарная накладная и условия гарантии на обороте выгружаются одним файлом Word.",
  robots: { index: false, follow: false },
};

/**
 * Standalone document desk for Motor Land (docs.myautocore.com).
 *
 * Outside the workspace shell but behind the ordinary AutoCore sign-in: the
 * waybills an account issues are kept under that account, so the same history
 * is there on the counter PC and on a phone. Filling the form produces a
 * two-page Word file — waybill on the front, warranty on the back, always.
 */
export default function MotorSaleDocumentPage() {
  return (
    <RequireAuth>
      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <style
          // The preview sheets are the print layout: A4, edge to edge, one page each.
          dangerouslySetInnerHTML={{
            __html: `
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff !important; }
  main { max-width: none !important; padding: 0 !important; }
  .motor-land-sheet { width: 210mm !important; box-shadow: none !important; break-after: page; }
  .motor-land-sheet:last-of-type { break-after: auto; }
}`,
          }}
        />

        <SaleDocumentBuilder />
      </main>
    </RequireAuth>
  );
}
