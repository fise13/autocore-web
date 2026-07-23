"use client";

import { useMemo } from "react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { landingDemoMotorsAtmosphere } from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

/** Dense Motors grid as calm atmospheric background — not an interactive demo. */
export function OutcomeMotorsAtmosphere({ className }: { className?: string }) {
  const chrome = useDemoChrome();

  const columns = useMemo(
    () =>
      [
        { id: "row", label: "#" },
        { id: "brand", label: chrome.columns.brand },
        { id: "engine", label: chrome.columns.engine },
        { id: "serial", label: chrome.columns.serial },
        { id: "config", label: chrome.columns.config },
        { id: "qty", label: chrome.columns.qty },
        { id: "place", label: chrome.columns.place },
        { id: "box", label: chrome.columns.box },
        { id: "reserve", label: chrome.columns.reserve },
        { id: "status", label: chrome.columns.status },
        { id: "action", label: chrome.columns.action },
      ] as const,
    [chrome.columns],
  );

  return (
    <div className={cn("exp-outcome-atmosphere", className)} aria-hidden>
      <div className="exp-outcome-atmosphere-toolbar">
        <div className="exp-outcome-atmosphere-search">
          <span>{chrome.grid.motorsSection}</span>
          <span className="exp-outcome-atmosphere-count">
            {landingDemoMotorsAtmosphere.length} {chrome.filters.rows}
          </span>
        </div>
        <div className="exp-outcome-atmosphere-tools">
          <span>{chrome.filters.filters}</span>
          <span>{chrome.filters.export}</span>
        </div>
      </div>

      <div className="exp-outcome-atmosphere-grid">
        <div className="exp-outcome-atmosphere-header" role="presentation">
          {columns.map((column) => (
            <div key={column.id} className="exp-outcome-atmosphere-th">
              {column.label}
            </div>
          ))}
        </div>

        <div className="exp-outcome-atmosphere-body">
          {landingDemoMotorsAtmosphere.map((motor, index) => (
            <div key={`${motor.serialCode}-${index}`} className="exp-outcome-atmosphere-row">
              <div className="exp-outcome-atmosphere-td is-num">{index + 1}</div>
              <div className="exp-outcome-atmosphere-td">{motor.brandName}</div>
              <div className="exp-outcome-atmosphere-td">{motor.engineCode}</div>
              <div className="exp-outcome-atmosphere-td is-mono">{motor.serialCode}</div>
              <div className="exp-outcome-atmosphere-td">{motor.configuration}</div>
              <div className="exp-outcome-atmosphere-td is-num">{motor.quantity}</div>
              <div className="exp-outcome-atmosphere-td">{motor.location}</div>
              <div className="exp-outcome-atmosphere-td is-num">{motor.transmission}</div>
              <div className="exp-outcome-atmosphere-td">{motor.reservedFor ?? "—"}</div>
              <div className="exp-outcome-atmosphere-td">
                {chrome.status.label(motor.status)}
              </div>
              <div className="exp-outcome-atmosphere-td">{motor.lastAction}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
