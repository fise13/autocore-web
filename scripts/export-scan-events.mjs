#!/usr/bin/env node
import { runWeeklyScanLearningExport } from "../src/lib/mobile/scan-learning-export.server";

const companyId = process.argv[2]?.trim();
if (!companyId) {
  console.error("Usage: npm run scan:export-events -- <companyId>");
  process.exit(1);
}

const result = await runWeeklyScanLearningExport(companyId);
console.log(JSON.stringify({ metrics: result.metrics, rowCount: result.rows.length }, null, 2));
