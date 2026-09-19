import type { Metadata } from "next";
import Image from "next/image";

import { SaleDocumentBuilder } from "@/components/motor-land/sale-document-builder";
import { COMPANY } from "@/lib/motor-land/sale-document";

export const metadata: Metadata = {
  title: "Motor Land — товарная накладная",
  description:
    "Заполните данные о двигателе и покупателе — товарная накладная и условия гарантии на обороте выгружаются одним файлом Word.",
  robots: { index: false, follow: false },
};

/**
 * Standalone document desk for Motor Land (docs.myautocore.com).
 *
 * Open without a sign-in and outside the workspace shell: the counter staff
 * type the engine and its serial, and get a two-page Word file — waybill on the
 * front, warranty on the back, always. Issued documents stay searchable in the
 * browser that printed them.
 */
export default function MotorSaleDocumentPage() {
  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      <style
        // The preview sheets are the print layout: A4, edge to edge, one page each.
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff !important; }
  .motor-land-page { background: #fff !important; padding: 0 !important; }
  .motor-land-sheet { width: 210mm !important; box-shadow: none !important; break-after: page; }
  .motor-land-sheet:last-of-type { break-after: auto; }
}`,
        }}
      />

      <header className="border-b border-border bg-background print:hidden">
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Image
            src="/motor-land/logo.png"
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0"
            priority
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Товарная накладная на двигатель
            </h1>
            <p className="truncate text-xs text-muted-foreground">{COMPANY.legalName}</p>
          </div>
        </div>
      </header>

      <main className="motor-land-page mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <p className="mb-5 max-w-3xl text-sm text-muted-foreground print:hidden">
          Номер и дата подставляются автоматически. Условия гарантии печатаются на обороте каждого
          документа — отдельно включать их не нужно. Выданные документы остаются в истории, там же по
          ним работает поиск.
        </p>

        <SaleDocumentBuilder />
      </main>
    </div>
  );
}
