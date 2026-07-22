"use client";

import type { ReactNode } from "react";
import { Home, RotateCw, SquareArrowOutUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

type IPhoneSimulatorFrameProps = {
  children: ReactNode;
  className?: string;
  deviceName?: string;
  osLabel?: string;
  time?: string;
};

/** Simulator chrome matching Xcode/Simulator look — iPhone 17 Pro style. */
export function IPhoneSimulatorFrame({
  children,
  className,
  deviceName = "iPhone 17 Pro",
  osLabel = "iOS 26.4",
  time = "20:58",
}: IPhoneSimulatorFrameProps) {
  return (
    <div className={cn("iphone-sim", className)}>
      <div className="iphone-sim-chrome" aria-hidden>
        <div className="iphone-sim-traffic">
          <span className="is-close" />
          <span className="is-min" />
          <span className="is-max" />
        </div>
        <div className="iphone-sim-title">
          <p className="iphone-sim-device">{deviceName}</p>
          <p className="iphone-sim-os">{osLabel}</p>
        </div>
        <div className="iphone-sim-actions">
          <Home className="size-3.5" />
          <RotateCw className="size-3.5" />
          <SquareArrowOutUpRight className="size-3.5" />
        </div>
      </div>

      <div className="iphone-sim-body">
        <div className="iphone-sim-side is-left" aria-hidden>
          <span className="iphone-sim-btn is-silent" />
          <span className="iphone-sim-btn is-vol-up" />
          <span className="iphone-sim-btn is-vol-down" />
        </div>
        <div className="iphone-sim-side is-right" aria-hidden>
          <span className="iphone-sim-btn is-power" />
        </div>

        <div className="iphone-sim-shell">
          <div className="iphone-sim-bezel">
            <div className="iphone-sim-screen">
              <div className="iphone-sim-status" aria-hidden>
                <span className="iphone-sim-time">{time}</span>
                <span className="iphone-sim-island" />
                <span className="iphone-sim-status-icons">
                  <SignalIcon />
                  <WifiIcon />
                  <BatteryIcon />
                </span>
              </div>
              <div className="iphone-sim-content">{children}</div>
              <div className="iphone-sim-home-indicator" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 18 12" className="iphone-sim-status-icon" aria-hidden>
      <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
      <rect x="5" y="5" width="3" height="7" rx="0.5" fill="currentColor" />
      <rect x="10" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
      <rect x="15" y="0" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 16 12" className="iphone-sim-status-icon" aria-hidden>
      <path
        d="M8 11.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM3.2 5.8a6.8 6.8 0 0 1 9.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M1 3.2a10.5 10.5 0 0 1 14 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg viewBox="0 0 26 12" className="iphone-sim-status-icon iphone-sim-battery" aria-hidden>
      <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="2.5" y="2.5" width="16" height="7" rx="1.5" fill="currentColor" />
      <path d="M23 4.5v3a1.5 1.5 0 0 0 0-3Z" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
