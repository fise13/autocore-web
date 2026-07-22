/**
 * Synchronous navigation/action mutex — not debounce.
 * Prevents duplicate router calls before React re-renders with loading/disabled state.
 */
const TAB_GUARD_RELEASE_MS = 80;

export function createNavigationGuard() {
  let locked = false;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleRelease = () => {
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      locked = false;
      releaseTimer = null;
    }, TAB_GUARD_RELEASE_MS);
  };

  return {
    get isLocked() {
      return locked;
    },
    tryNavigate(fn: () => void): boolean {
      if (locked) return false;
      locked = true;
      fn();
      scheduleRelease();
      return true;
    },
    tryAction(fn: () => void): boolean {
      if (locked) return false;
      locked = true;
      fn();
      scheduleRelease();
      return true;
    },
    release() {
      if (releaseTimer) {
        clearTimeout(releaseTimer);
        releaseTimer = null;
      }
      locked = false;
    },
  };
}

/** Process-wide tab switch guard (custom tab bar). */
export const tabNavigationGuard = createNavigationGuard();

/** Process-wide order detail open guard. */
export const orderOpenGuard = createNavigationGuard();

/** Process-wide scan result navigation guard. */
export const scanNavigationGuard = createNavigationGuard();
