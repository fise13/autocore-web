"use client";

import { useMemo } from "react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import {
  landingDemoMotor,
  landingDemoMotorEntity,
  landingDemoMotorsAtmosphere,
  landingDemoMotorsHero,
  landingDemoMotorsSale,
  landingDemoSaleClient,
} from "@/lib/marketing/landing-demo-snapshot";

type MotorsSnapshot = ReturnType<typeof useDemoChrome>["motorsSnapshot"];

/**
 * The snapshot in `landing-demo-snapshot.ts` is authored in English; these
 * matchers parse that source shape and re-render it through the active
 * locale's messages, so the Russian bundle still works if `ru` is re-enabled.
 */
function localizeLastAction(value: string, snap: MotorsSnapshot): string {
  const today = value.match(/^Today,\s*(.+)$/);
  if (today) return snap.today(today[1]);
  const yesterday = value.match(/^Yesterday,\s*(.+)$/);
  if (yesterday) return snap.yesterday(yesterday[1]);
  const mon = value.match(/^Mon,\s*(.+)$/);
  if (mon) return snap.mon(mon[1]);
  return value;
}

function localizeNotes(value: string, snap: MotorsSnapshot): string {
  const contract = value.match(/^([\d\s]+)\s*km\s*·\s*imported$/);
  if (contract) return snap.noteContract(contract[1].trim());
  const parts = value.match(/^([\d\s]+)\s*km\s*·\s*for teardown$/);
  if (parts) return snap.noteParts(parts[1].trim());
  const kmOnly = value.match(/^([\d\s]+)\s*km$/);
  if (kmOnly) return snap.noteKm(kmOnly[1].trim());
  return value.replace(/\bkm\b/g, snap.kmSuffix);
}

function localizeReservedFor(value: string | null, snap: MotorsSnapshot): string | null {
  if (!value) return null;
  if (value.startsWith(snap.orderPrefixSource)) {
    return `${snap.orderPrefixLocalized}${value.slice(snap.orderPrefixSource.length)}`;
  }
  return value;
}

/** Locale-aware soft strings for marketing motor grids (lastAction / notes / reservedFor). */
export function useLandingDemoSnapshot() {
  const chrome = useDemoChrome();
  const snap = chrome.motorsSnapshot;
  const demo = chrome.workOrderUi.demo;
  const documentDemo = chrome.documentDemo;

  return useMemo(() => {
    const localizeMotor = <
      T extends {
        notes: string;
        lastAction?: string;
        reservedFor?: string | null;
      },
    >(
      motor: T,
    ): T => ({
      ...motor,
      notes: localizeNotes(motor.notes, snap),
      ...(motor.lastAction != null
        ? { lastAction: localizeLastAction(motor.lastAction, snap) }
        : {}),
      ...(motor.reservedFor !== undefined
        ? { reservedFor: localizeReservedFor(motor.reservedFor, snap) }
        : {}),
    });

    return {
      landingDemoMotor: localizeMotor({ ...landingDemoMotor }),
      landingDemoMotorEntity: {
        ...landingDemoMotorEntity,
        notes: documentDemo.motorNotes,
      },
      landingDemoMotorsHero: landingDemoMotorsHero.map((motor) => localizeMotor({ ...motor })),
      landingDemoMotorsSale: landingDemoMotorsSale.map((motor) => localizeMotor({ ...motor })),
      landingDemoMotorsAtmosphere: landingDemoMotorsAtmosphere.map((motor) =>
        localizeMotor({ ...motor }),
      ),
      landingDemoSaleClient: {
        ...landingDemoSaleClient,
        fullName: documentDemo.saleClientName || demo.clientName,
      },
    };
  }, [demo.clientName, documentDemo.motorNotes, documentDemo.saleClientName, snap]);
}
