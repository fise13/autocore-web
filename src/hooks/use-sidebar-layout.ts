"use client";

import { useCallback, useState } from "react";

export const SIDEBAR_DEFAULT_WIDTH = 240;
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 420;

const VISIBLE_KEY = "autocore-sidebar-visible";
const WIDTH_KEY = "autocore-sidebar-width";

function readInitialVisible() {
  if (typeof window === "undefined") return true;
  const storedVisible = localStorage.getItem(VISIBLE_KEY);
  return storedVisible === null ? true : storedVisible === "true";
}

function readInitialWidth() {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
  const storedWidth = localStorage.getItem(WIDTH_KEY);
  if (!storedWidth) return SIDEBAR_DEFAULT_WIDTH;
  const parsed = Number(storedWidth);
  if (!Number.isFinite(parsed)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsed));
}

export function useSidebarLayout() {
  const [visible, setVisibleState] = useState(readInitialVisible);
  const [width, setWidthState] = useState(readInitialWidth);

  const setVisible = useCallback((next: boolean) => {
    setVisibleState(next);
    localStorage.setItem(VISIBLE_KEY, String(next));
  }, []);

  const setWidth = useCallback((next: number) => {
    const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, next));
    setWidthState(clamped);
    localStorage.setItem(WIDTH_KEY, String(clamped));
  }, []);

  const toggleVisible = useCallback(() => {
    setVisibleState((current) => {
      const next = !current;
      localStorage.setItem(VISIBLE_KEY, String(next));
      return next;
    });
  }, []);

  return {
    visible,
    width,
    hydrated: true,
    setVisible,
    setWidth,
    toggleVisible,
  };
}
