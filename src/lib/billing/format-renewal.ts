export function formatNextBillingDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(date);
}
