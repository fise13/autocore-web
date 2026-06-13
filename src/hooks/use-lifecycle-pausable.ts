"use client";

import { useEffect, useRef } from "react";

type LifecyclePausableOptions = {
  onSuspend?: () => void;
  onResume?: () => void;
  enabled?: boolean;
};

export function useLifecyclePausable({
  onSuspend,
  onResume,
  enabled = true,
}: LifecyclePausableOptions): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    node.setAttribute("data-lifecycle-pausable", "");

    const handleSuspend = () => onSuspend?.();
    const handleResume = () => onResume?.();

    node.addEventListener("panel:suspend", handleSuspend);
    node.addEventListener("panel:resume", handleResume);

    return () => {
      node.removeEventListener("panel:suspend", handleSuspend);
      node.removeEventListener("panel:resume", handleResume);
    };
  }, [enabled, onResume, onSuspend]);

  return ref;
}
