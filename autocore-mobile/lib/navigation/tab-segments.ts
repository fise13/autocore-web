/** Expo Router may expose the mission tab as `index` at runtime. */
export const MISSION_TAB_SEGMENT = 'index';

export function isTabRootEntry(segments: readonly string[]): boolean {
  if (segments[0] !== '(tabs)') return false;
  if (segments.length === 1) return true;
  return segments.length === 2 && segments[1] === MISSION_TAB_SEGMENT;
}

export function isMissionControlIndexRoute(segments: readonly string[]): boolean {
  return (
    segments.length === 2 &&
    segments[0] === '(tabs)' &&
    segments[1] === MISSION_TAB_SEGMENT
  );
}
