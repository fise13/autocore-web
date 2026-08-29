/**
 * Dev-only routes that must not bounce to login.
 * Keep the matcher in one place — AuthRedirect and the playground share it.
 */
export function isDevSandboxPath(pathname: string): boolean {
  return (
    pathname === '/design-system' ||
    pathname === '/playground' ||
    pathname.startsWith('/playground/')
  );
}

/** Expo web first paint — unauthenticated `__DEV__` lands on the playground. */
export function isWebDevEntryPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/index' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/index'
  );
}
