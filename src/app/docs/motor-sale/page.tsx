import type { Metadata } from "next";
import Image from "next/image";

import { SaleDocumentBuilder } from "@/components/motor-land/sale-document-builder";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/motor-land/sale-document";

export const metadata: Metadata = {
  title: "Motor Land — документы",
  description:
    "Товарная накладная с гарантией и диагностический лист Motor Land.",
  robots: { index: false, follow: false },
};

/**
 * Standalone document desk for Motor Land (docs.myautocore.com).
 *
 * Behind the desk's one shared login (see `lib/motor-land/desk-login.ts`) and
 * outside the workspace shell: the counter staff
 * type the engine and its serial, and get a one-page Word file — waybill with
 * the warranty terms under it, always. Issued documents go to a shared server
 * history that every counter sees.
 */
export default function MotorSaleDocumentPage() {
  return (
    <div className="motor-land-shell min-h-screen bg-muted/40 print:bg-white">
      <style
        // The preview sheets are the print layout: A4, edge to edge, one page each.
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page { size: A4; margin: 0; }
  /* Without this the 100vh shell keeps its height and prints a blank second page. */
  html, body { background: #fff !important; margin: 0 !important; height: auto !important; min-height: 0 !important; }
  .motor-land-shell { min-height: 0 !important; background: #fff !important; }
  .motor-land-page { background: #fff !important; padding: 0 !important; }
  .motor-land-sheet { width: 210mm !important; box-shadow: none !important; break-inside: avoid; }
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
              Документы Motor Land
            </h1>
            <p className="truncate text-xs text-muted-foreground">{COMPANY.legalName}</p>
          </div>
          <form action="/api/motor-land/logout" method="post" className="ml-auto">
            <Button type="submit" variant="ghost" size="sm">
              Выйти
            </Button>
          </form>
        </div>
      </header>

      <main className="motor-land-page mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <p className="mb-5 max-w-3xl text-sm text-muted-foreground print:hidden">
          Номер и дата подставляются автоматически. Каждый документ — накладная или диагностический
          лист — сохраняется в общую историю при скачивании, печати и переходе к новому; там же по
          ним работает поиск.
        </p>

        <SaleDocumentBuilder />
      </main>
    </div>
  );
}
