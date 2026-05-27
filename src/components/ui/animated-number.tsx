"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  format?: (value: number) => string;
  durationMs?: number;
  className?: string;
};

export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString("ru-RU"),
  durationMs = 650,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className={className}>{format(Math.round(display))}</span>;
}
