"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Barcode,
  Check,
  Package,
  ScanSearch,
  Search,
  Warehouse,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { IPhoneSimulatorFrame } from "@/components/marketing/experience/devices/iphone-simulator-frame";
import {
  formatKzt,
  landingDemoMotorsSale,
  type LandingSaleMotor,
} from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

type TabId = "warehouse" | "scan";
type ScanPhase = "idle" | "scanning" | "found";

type StockMap = Record<string, number>;

function buildInitialStock(): StockMap {
  const map: StockMap = {};
  for (const motor of landingDemoMotorsSale) {
    map[motor.id] = motor.quantity;
  }
  return map;
}

/** Pixel-faithful interactive AutoCore mobile: warehouse + scan from autocore-mobile. */
export function ProductMobilePhone({ className }: { className?: string }) {
  const chrome = useDemoChrome();
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<TabId>("warehouse");
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState<StockMap>(buildInitialStock);
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [selected, setSelected] = useState<LandingSaleMotor | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return landingDemoMotorsSale.filter((motor) => {
      if (!q) return true;
      return [motor.brandName, motor.engineCode, motor.serialCode, motor.location]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [query]);

  const stats = useMemo(() => {
    let units = 0;
    for (const motor of landingDemoMotorsSale) {
      units += stock[motor.id] ?? 0;
    }
    return { total: landingDemoMotorsSale.length, units };
  }, [stock]);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (scanPhase !== "scanning") return;
    const done = window.setTimeout(
      () => {
        const motor = landingDemoMotorsSale[0];
        setSelected(motor);
        setScanPhase("found");
      },
      reduced ? 200 : 1300,
    );
    return () => window.clearTimeout(done);
  }, [scanPhase, reduced]);

  const adjust = useCallback((id: string, delta: 1 | -1) => {
    setStock((current) => {
      const next = Math.max(0, (current[id] ?? 0) + delta);
      return { ...current, [id]: next };
    });
  }, []);

  const openItem = useCallback((motor: LandingSaleMotor) => {
    setSelected(motor);
    setTab("scan");
    setScanPhase("found");
  }, []);

  const startScan = useCallback(() => {
    setSelected(null);
    setScanPhase("scanning");
  }, []);

  const reserve = useCallback(() => {
    if (!selected) return;
    setStock((current) => ({
      ...current,
      [selected.id]: Math.max(0, (current[selected.id] ?? 0) - 1),
    }));
    showToast(chrome.mobile.reserveToast(selected.engineCode, selected.location));
    setScanPhase("idle");
    setSelected(null);
    setTab("warehouse");
  }, [selected, showToast, chrome.mobile]);

  return (
    <div className={cn("product-mobile-phone", className)}>
      <IPhoneSimulatorFrame className="product-mobile-sim">
        <div className="ac-mobile-app">
          <AnimatePresence mode="wait">
            {tab === "warehouse" ? (
              <motion.div
                key="warehouse"
                className="ac-mobile-screen"
                initial={reduced ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.28 }}
              >
                <header className="ac-mobile-header">
                  <div>
                    <h3 className="ac-mobile-title">{chrome.mobile.warehouse}</h3>
                    <p className="ac-mobile-sub">
                      {chrome.mobile.positionsSummary(stats.total, stats.units)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ac-mobile-scan-fab"
                    aria-label={chrome.mobile.scanAria}
                    onClick={() => {
                      setTab("scan");
                      startScan();
                    }}
                  >
                    <ScanSearch className="size-4" />
                  </button>
                </header>

                <div className="ac-mobile-stats">
                  <div className="ac-mobile-stat">
                    <p className="ac-mobile-stat-label">{chrome.mobile.onHand}</p>
                    <p className="ac-mobile-stat-value">{stats.units}</p>
                  </div>
                  <div className="ac-mobile-stat">
                    <p className="ac-mobile-stat-label">{chrome.mobile.positions}</p>
                    <p className="ac-mobile-stat-value">{stats.total}</p>
                  </div>
                </div>

                <label className="ac-mobile-search">
                  <Search className="size-3.5 opacity-55" aria-hidden />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={chrome.mobile.searchPlaceholder}
                    aria-label={chrome.mobile.searchAria}
                  />
                </label>

                <ul className="ac-mobile-list">
                  {items.map((motor) => {
                    const available = stock[motor.id] ?? 0;
                    return (
                      <li key={motor.id} className="ac-mobile-row">
                        <button
                          type="button"
                          className="ac-mobile-row-main"
                          onClick={() => openItem(motor)}
                        >
                          <span className="ac-mobile-row-icon">
                            <Package className="size-4" />
                          </span>
                          <span className="ac-mobile-row-copy">
                            <span className="ac-mobile-row-title">
                              {motor.brandName} {motor.engineCode}
                            </span>
                            <span className="ac-mobile-row-meta">
                              {motor.serialCode} · {chrome.mobile.bin} {motor.location}
                            </span>
                          </span>
                        </button>
                        <div className="ac-mobile-row-stock">
                          <div className="ac-mobile-stepper">
                            <button
                              type="button"
                              aria-label={chrome.mobile.minus}
                              disabled={available <= 0}
                              onClick={() => adjust(motor.id, -1)}
                            >
                              −
                            </button>
                            <span>{available}</span>
                            <button type="button" aria-label={chrome.mobile.plus} onClick={() => adjust(motor.id, 1)}>
                              +
                            </button>
                          </div>
                          <span className="ac-mobile-row-price">{formatKzt(motor.price)} ₸</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            ) : (
              <motion.div
                key="scan"
                className="ac-mobile-screen ac-mobile-scan"
                initial={reduced ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.28 }}
              >
                <header className="ac-mobile-header">
                  <div>
                    <h3 className="ac-mobile-title">{chrome.mobile.scan}</h3>
                    <p className="ac-mobile-sub">{chrome.mobile.scanHint}</p>
                  </div>
                </header>

                <button
                  type="button"
                  className={cn(
                    "ac-mobile-viewfinder",
                    scanPhase === "scanning" && "is-scanning",
                    scanPhase === "found" && "is-found",
                  )}
                  onClick={scanPhase === "idle" || scanPhase === "found" ? startScan : undefined}
                  disabled={scanPhase === "scanning"}
                >
                  {scanPhase === "scanning" && !reduced ? (
                    <motion.span
                      className="ac-mobile-scan-line"
                      aria-hidden
                      animate={{ top: ["16%", "82%", "16%"] }}
                      transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity }}
                    />
                  ) : null}
                  <Barcode className="size-7 opacity-70" aria-hidden />
                  <p>
                    {scanPhase === "scanning"
                      ? chrome.mobile.scanning
                      : scanPhase === "found"
                        ? chrome.mobile.tapScanAgain
                        : chrome.mobile.tapScan}
                  </p>
                </button>

                <AnimatePresence>
                  {scanPhase === "found" && selected ? (
                    <motion.div
                      className="ac-mobile-sheet"
                      initial={reduced ? false : { y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 24, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="ac-mobile-sheet-handle" aria-hidden />
                      <div className="ac-mobile-sheet-head">
                        <span className="ac-mobile-sheet-thumb">
                          <Package className="size-5" />
                        </span>
                        <div>
                          <p className="ac-mobile-sheet-title">
                            {selected.brandName} {selected.engineCode}
                          </p>
                          <p className="ac-mobile-sheet-sub">
                            {selected.serialCode} · {selected.configuration}
                          </p>
                          <p className="ac-mobile-sheet-match">{chrome.mobile.exactMatch}</p>
                        </div>
                      </div>

                      <div className="ac-mobile-sheet-stats">
                        <div>
                          <span>{chrome.mobile.balance}</span>
                          <strong>{stock[selected.id] ?? 0}</strong>
                        </div>
                        <div>
                          <span>{chrome.mobile.warehouse}</span>
                          <strong>{chrome.mobile.warehouseName}</strong>
                        </div>
                        <div>
                          <span>{chrome.mobile.location}</span>
                          <strong>{selected.location}</strong>
                        </div>
                      </div>

                      <div className="ac-mobile-sheet-price-row">
                        <div className="ac-mobile-sheet-price">
                          <span>{chrome.mobile.price}</span>
                          <strong>{formatKzt(selected.price)} ₸</strong>
                        </div>
                        <span className="ac-mobile-sheet-status">{chrome.status.inStock}</span>
                      </div>

                      <div className="ac-mobile-sheet-actions">
                        <button type="button" className="is-primary" onClick={reserve}>
                          {chrome.status.reserved}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTab("warehouse");
                            setScanPhase("idle");
                            setSelected(null);
                          }}
                        >
                          {chrome.mobile.openCard}
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <nav className="ac-mobile-tabbar" aria-label={chrome.mobile.tabsAria}>
            <button
              type="button"
              className={cn(tab === "warehouse" && "is-active")}
              onClick={() => setTab("warehouse")}
            >
              <Warehouse className="size-4" />
              <span>{chrome.mobile.warehouse}</span>
            </button>
            <button
              type="button"
              className={cn("ac-mobile-tab-scan", tab === "scan" && "is-active")}
              onClick={() => {
                setTab("scan");
                if (scanPhase === "idle") startScan();
              }}
            >
              <ScanSearch className="size-4" />
              <span>{chrome.mobile.scan}</span>
            </button>
          </nav>

          <AnimatePresence>
            {toast ? (
              <motion.div
                className="ac-mobile-toast"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
              >
                <Check className="size-3.5" aria-hidden />
                {toast}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </IPhoneSimulatorFrame>
    </div>
  );
}
