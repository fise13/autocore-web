export function printPreviewInBrowser(): void {
  document.body.classList.add("doc-preview-printing");
  const cleanup = () => {
    document.body.classList.remove("doc-preview-printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, 60_000);
  window.print();
}
