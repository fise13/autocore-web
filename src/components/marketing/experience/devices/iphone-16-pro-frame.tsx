"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type IPhone16ProFrameProps = {
  children: ReactNode;
  className?: string;
  time?: string;
};

export function IPhone16ProFrame({ children, className, time = "9:41" }: IPhone16ProFrameProps) {
  return (
    <div className={cn("device-iphone", className)}>
      <div className="device-iphone-shell">
        <div className="device-iphone-bezel">
          <div className="device-iphone-screen">
            <div className="device-iphone-status" aria-hidden>
              <span className="device-iphone-time">{time}</span>
              <span className="device-iphone-island" />
              <span className="device-iphone-status-icons">
                <SignalIcon />
                <WifiIcon />
                <BatteryIcon />
              </span>
            </div>
            <div className="device-iphone-content">{children}</div>
            <div className="device-iphone-home-indicator" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 18 12" className="device-iphone-status-icon" aria-hidden>
      <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
      <rect x="5" y="5" width="3" height="7" rx="0.5" fill="currentColor" />
      <rect x="10" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
      <rect x="15" y="0" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 16 12" className="device-iphone-status-icon" aria-hidden>
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
    <svg viewBox="0 0 26 12" className="device-iphone-status-icon device-iphone-battery" aria-hidden>
      <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="2.5" y="2.5" width="16" height="7" rx="1.5" fill="currentColor" />
      <path d="M23 4.5v3a1.5 1.5 0 0 0 0-3Z" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
