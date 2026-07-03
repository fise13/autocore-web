import { aggregateScanMetrics, exportScanEvents } from "@/lib/mobile/scan-learning.server";

export { aggregateScanMetrics, exportScanEvents };

/**
 * Weekly learning loop entrypoint.
 * Run via cron or manually: `npm run scan:export-events -- <companyId>`
 */
export async function runWeeklyScanLearningExport(companyId: string) {
  const rows = await exportScanEvents(companyId, { sinceDays: 7, limit: 10_000 });
  const metrics = aggregateScanMetrics(rows);
  return { rows, metrics };
}
