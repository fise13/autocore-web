"use client";

import { useEffect } from "react";
import { onCLS, onINP, onLCP, type Metric } from "web-vitals";

function reportMetric(metric: Metric) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[web-vitals] ${metric.name}`, {
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });
  }
}

export function WebVitalsReporter() {
  useEffect(() => {
    onLCP(reportMetric);
    onINP(reportMetric);
    onCLS(reportMetric);
  }, []);

  return null;
}
