"use client";

import { memo, type ReactNode } from "react";
import { Package } from "lucide-react";

import { MotorEntity } from "@/domain/motor";
import { McModuleHeader } from "@/components/mission-control/mc-module-header";

type InventoryModuleProps = {
  latestMotors: MotorEntity[];
  recentlyModified: MotorEntity[];
  isLoading: boolean;
};

export const InventoryModule = memo(function InventoryModule({
  latestMotors,
  recentlyModified,
  isLoading,
}: InventoryModuleProps) {
  return (
    <article className="mc-module-card">
      <McModuleHeader icon={Package} title="Моторы" href="/motors" accent="green" />
      <div className="mc-module-body grid gap-4 md:grid-cols-2">
        <Section title="Новые" empty="Нет новых моторов" isLoading={isLoading}>
          {latestMotors.map((motor) => (
            <Row
              key={motor.id}
              primary={motor.serialCode || "—"}
              secondary={`${motor.brandName ?? ""} ${motor.engineCode ?? ""}`.trim() || "Без бренда"}
            />
          ))}
        </Section>
        <Section title="Недавно изменены" empty="Изменений пока нет" isLoading={isLoading}>
          {recentlyModified.map((motor) => (
            <Row
              key={`mod-${motor.id}`}
              primary={motor.serialCode || "—"}
              secondary={motor.updatedAt?.toLocaleString("ru-RU") ?? "—"}
            />
          ))}
        </Section>
      </div>
    </article>
  );
});

function Section({
  title,
  empty,
  isLoading,
  children,
}: {
  title: string;
  empty: string;
  isLoading: boolean;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean) && items.length > 0 && !isLoading;

  return (
    <div className="space-y-2.5">
      <p className="mc-section-label">{title}</p>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : hasItems ? (
        <div className="space-y-2">{children}</div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function Row({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="mc-list-row">
      <p className="truncate text-sm font-medium">{primary}</p>
      <p className="truncate text-xs text-muted-foreground">{secondary}</p>
    </div>
  );
}
