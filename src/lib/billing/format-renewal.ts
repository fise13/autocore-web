export function formatNextBillingDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
}
