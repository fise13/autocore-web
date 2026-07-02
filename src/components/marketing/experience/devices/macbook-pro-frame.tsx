"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MacBookProFrameProps = {
  children: ReactNode;
  className?: string;
  windowTitle?: string;
};

export function MacBookProFrame({
  children,
  className,
  windowTitle = "AutoCore — Mission Control",
}: MacBookProFrameProps) {
  return (
    <div className={cn("device-macbook", className)}>
      <div className="device-macbook-lid">
        <div className="device-macbook-screen-rim">
          <div className="device-macbook-display">
            <div className="device-macos-window">
              <div className="device-macos-titlebar">
                <div className="device-macos-traffic" aria-hidden>
                  <span className="device-macos-dot device-macos-dot-red" />
                  <span className="device-macos-dot device-macos-dot-yellow" />
                  <span className="device-macos-dot device-macos-dot-green" />
                </div>
                <span className="device-macos-title">{windowTitle}</span>
              </div>
              <div className="device-macos-content">{children}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="device-macbook-hinge" aria-hidden />
      <div className="device-macbook-base" aria-hidden>
        <div className="device-macbook-trackpad" />
      </div>
    </div>
  );
}
