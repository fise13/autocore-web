"use client";

import { useSyncExternalStore } from "react";

import {
  AppLoadingLogoDrawable,
  AppLoadingLogoStatic,
} from "@/components/brand/app-loading-logo-drawable";

type AppLoadingLogoProps = {
  size?: number;
  className?: string;
};

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function AppLoadingLogo({ size = 80, className }: AppLoadingLogoProps) {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  if (reduceMotion) {
    return <AppLoadingLogoStatic size={size} className={className} />;
  }

  return <AppLoadingLogoDrawable size={size} className={className} />;
}
