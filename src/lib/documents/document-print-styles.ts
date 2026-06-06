/** Fallback print CSS used when compiled Tailwind bundle is unavailable (e.g. first dev run). */
export const DOCUMENT_PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #171717; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .documents-root { background: #fff; }
  .doc-page { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .doc-page-a4 { width: 210mm; min-height: 297mm; padding: 40px 48px; }
  .doc-page-tag { width: 70mm; height: 100mm; padding: 12px; }
  .font-serif { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .text-\\[11px\\] { font-size: 11px; }
  .text-\\[10px\\] { font-size: 10px; }
  .text-\\[9px\\] { font-size: 9px; }
  .text-\\[8px\\] { font-size: 8px; }
  .text-\\[7px\\] { font-size: 7px; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .uppercase { text-transform: uppercase; }
  .tracking-tight { letter-spacing: -0.025em; }
  .tracking-wider { letter-spacing: 0.05em; }
  .tracking-\\[0\\.2em\\] { letter-spacing: 0.2em; }
  .tracking-\\[0\\.18em\\] { letter-spacing: 0.18em; }
  .tracking-\\[0\\.16em\\] { letter-spacing: 0.16em; }
  .tracking-\\[0\\.14em\\] { letter-spacing: 0.14em; }
  .leading-relaxed { line-height: 1.625; }
  .leading-tight { line-height: 1.25; }
  .text-neutral-900 { color: #171717; }
  .text-neutral-800 { color: #262626; }
  .text-neutral-700 { color: #404040; }
  .text-neutral-600 { color: #525252; }
  .text-neutral-500 { color: #737373; }
  .bg-white { background-color: #fff; }
  .bg-neutral-200 { background-color: #e5e5e5; }
  .border { border-width: 1px; border-style: solid; }
  .border-neutral-200 { border-color: #e5e5e5; }
  .border-neutral-100 { border-color: #f5f5f5; }
  .border-neutral-300 { border-color: #d4d4d4; }
  .border-neutral-400 { border-color: #a3a3a3; }
  .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
  .border-t { border-top-width: 1px; border-top-style: solid; }
  .rounded-lg { border-radius: 0.5rem; }
  .rounded-xl { border-radius: 0.75rem; }
  .flex { display: flex; }
  .grid { display: grid; }
  .inline-flex { display: inline-flex; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .flex-col { flex-direction: column; }
  .gap-2 { gap: 0.5rem; }
  .gap-4 { gap: 1rem; }
  .gap-6 { gap: 1.5rem; }
  .gap-10 { gap: 2.5rem; }
  .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }
  .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem; }
  .mt-1 { margin-top: 0.25rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-3 { margin-top: 0.75rem; }
  .mt-4 { margin-top: 1rem; }
  .mt-6 { margin-top: 1.5rem; }
  .mt-8 { margin-top: 2rem; }
  .mt-10 { margin-top: 2.5rem; }
  .my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
  .mb-3 { margin-bottom: 0.75rem; }
  .ml-auto { margin-left: auto; }
  .p-3 { padding: 0.75rem; }
  .p-5 { padding: 1.25rem; }
  .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
  .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
  .pt-3 { padding-top: 0.75rem; }
  .pl-4 { padding-left: 1rem; }
  .h-7 { height: 1.75rem; }
  .w-7 { width: 1.75rem; }
  .h-12 { height: 3rem; }
  .w-12 { width: 3rem; }
  .h-full { height: 100%; }
  .w-full { width: 100%; }
  .max-w-sm { max-width: 24rem; }
  .min-w-0 { min-width: 0; }
  .shrink-0 { flex-shrink: 0; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .align-top { vertical-align: top; }
  .object-contain { object-fit: contain; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
  .border-collapse { border-collapse: collapse; }
  .doc-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .doc-table th { border-bottom: 1px solid #e5e5e5; padding: 0.5rem 0.75rem; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #737373; }
  .doc-table td { border-bottom: 1px solid #f5f5f5; padding: 0.625rem 0.75rem; vertical-align: top; color: #262626; }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .col-span-2 { grid-column: span 2 / span 2; }
  @page { size: A4; margin: 12mm; }
`;
