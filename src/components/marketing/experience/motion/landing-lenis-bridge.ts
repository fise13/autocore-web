import type Lenis from "lenis";

let lenisInstance: Lenis | null = null;

export function setLandingLenis(instance: Lenis | null): void {
  lenisInstance = instance;
}

export function getLandingLenis(): Lenis | null {
  return lenisInstance;
}

export function resizeLandingLenis(): void {
  lenisInstance?.resize();
}
