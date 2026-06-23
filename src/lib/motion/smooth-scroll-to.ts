const DEFAULT_DURATION_MS = 720;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function smoothScrollToY(targetY: number, durationMs = DEFAULT_DURATION_MS): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const startY = window.scrollY;
  const distance = targetY - startY;

  if (Math.abs(distance) < 2) {
    window.scrollTo(0, targetY);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const startTime = performance.now();
    const duration = Math.min(durationMs, Math.max(380, Math.abs(distance) * 0.55));

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

export function smoothScrollToElement(
  element: HTMLElement,
  offsetTop = 0,
  durationMs = DEFAULT_DURATION_MS,
): Promise<void> {
  const targetY = element.getBoundingClientRect().top + window.scrollY - offsetTop;
  return smoothScrollToY(targetY, durationMs);
}
