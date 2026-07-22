"use client";

import { landingDemoMotorsAtmosphere } from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "row", label: "#" },
  { id: "brand", label: "Бренд" },
  { id: "engine", label: "Двигатель" },
  { id: "serial", label: "Номер двигателя" },
  { id: "config", label: "Комплектация" },
  { id: "qty", label: "Кол-во" },
  { id: "place", label: "Место" },
  { id: "box", label: "Коробка" },
  { id: "reserve", label: "Резерв" },
  { id: "status", label: "Статус" },
  { id: "action", label: "Последнее действие" },
] as const;

/** Dense Motors grid as calm atmospheric background — not an interactive demo. */
export function OutcomeMotorsAtmosphere({ className }: { className?: string }) {
  return (
    <div className={cn("exp-outcome-atmosphere", className)} aria-hidden>
      <div className="exp-outcome-atmosphere-toolbar">
        <div className="exp-outcome-atmosphere-search">
          <span>Двигатели</span>
          <span className="exp-outcome-atmosphere-count">
            {landingDemoMotorsAtmosphere.length} строк
          </span>
        </div>
        <div className="exp-outcome-atmosphere-tools">
          <span>Фильтры</span>
          <span>Экспорт</span>
        </div>
      </div>

      <div className="exp-outcome-atmosphere-grid">
        <div className="exp-outcome-atmosphere-header" role="presentation">
          {COLUMNS.map((column) => (
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
                {motor.status === "reserved" ? "Резерв" : "В наличии"}
              </div>
              <div className="exp-outcome-atmosphere-td">{motor.lastAction}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
