"use client";

import { useEffect, useState } from "react";

import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { cn } from "@/lib/utils";

export function SidebarEditBlur() {
  const { isEditing } = useSidebarCustomization();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 720);
    return () => window.clearTimeout(timer);
  }, [isEditing]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 z-20 transition-[opacity,backdrop-filter] duration-700 ease-out motion-reduce:transition-none",
        visible
          ? "pointer-events-auto bg-background/18 opacity-100 backdrop-blur-md"
          : "pointer-events-none opacity-0 backdrop-blur-none",
      )}
    />
  );
}
