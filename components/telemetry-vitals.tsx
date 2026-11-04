"use client";

import { useReportWebVitals } from "next/web-vitals";
import { report } from "@/lib/telemetry";

/**
 * Core Web Vitals from real sessions (CHROMIQ-1005).
 *
 * A local Lighthouse run measures one machine on one network. These are the
 * numbers from the devices people actually use, which is the only place a
 * regression in LCP or INP shows up honestly.
 *
 * `useReportWebVitals` fires per metric as it settles, so this mounts once in
 * the root layout and renders nothing. `report` batches, and the batch is
 * flushed when the tab is hidden -- which is when the last metrics arrive.
 */
export function TelemetryVitals() {
  useReportWebVitals((metric) => {
    report({
      kind: "vital",
      name: metric.name,
      // CLS is a unitless score; the rest are milliseconds. Rounding to one
      // decimal keeps CLS meaningful without storing microsecond noise.
      value: Math.round(metric.value * 10) / 10,
      // Next distinguishes a cold navigation from a back/forward-cache
      // restore, and the two have very different numbers. Without this the
      // medians are a blend of two populations.
      reason: metric.navigationType,
    });
  });
  return null;
}
