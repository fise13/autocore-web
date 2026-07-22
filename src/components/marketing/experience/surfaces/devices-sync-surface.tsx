"use client";

import { Barcode, MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { IPhone16ProFrame } from "@/components/marketing/experience/devices/iphone-16-pro-frame";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { Badge } from "@/components/ui/badge";
import { landingDemoMotor } from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const m = landingDemoMotor;

type DevicesSyncSurfaceProps = {
  className?: string;
};

export function DevicesSyncSurface({ className }: DevicesSyncSurfaceProps) {
  const reduced = useReducedMotion();

  return (
    <div className={cn("exp-devices-sync grid items-center gap-6 lg:grid-cols-[minmax(0,14rem)_1fr]", className)}>
      <div className="mx-auto w-[min(100%,14rem)]">
        <IPhone16ProFrame>
          <div className="flex h-full flex-col gap-3 bg-background p-3 text-foreground">
            <p className="text-[10px] font-medium text-muted-foreground">Скан · склад</p>
            <div className="rounded-lg border border-dashed border-primary/35 bg-primary/5 px-3 py-4 text-center">
              <Barcode className="mx-auto size-5 text-primary" aria-hidden />
              <p className="mt-2 text-[11px] font-medium">{m.engineCode} распознан</p>
            </div>
            <div className="rounded-lg border border-border/70 p-2.5">
              <p className="text-[11px] font-semibold">{m.engineCode} · {m.configuration}</p>
              <p className="mt-1 exp-mock-mono text-[10px] text-muted-foreground">{m.serialCode}</p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="size-3" aria-hidden />
                {m.location}
              </div>
            </div>
          </div>
        </IPhone16ProFrame>
      </div>

      <ProductWindow title="AutoCore · Офис" contentClassName="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Тот же объект</p>
          <motion.div
            initial={reduced ? false : { opacity: 0.4 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Badge variant="outline" className="font-normal">
              Только что
            </Badge>
          </motion.div>
        </div>
        <div className="rounded-lg border border-border/70 bg-primary/[0.04] p-3 ring-1 ring-inset ring-primary/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                {m.brandName} {m.engineCode}
              </p>
              <p className="mt-0.5 exp-mock-mono text-xs text-muted-foreground">{m.serialCode}</p>
            </div>
            <Badge variant="outline" className="font-normal">
              Резерв · {m.reservedFor}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Полка {m.location} · видно офису и складу</p>
        </div>
      </ProductWindow>
    </div>
  );
}
