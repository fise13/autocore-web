/**
 * Stack push guard — blocks duplicate pushes until the destination screen focuses.
 * Tracks pending route key so a second tap on the same row cannot enqueue another push.
 *
 * Auto-releases after a short timeout so a missed focus event can never freeze
 * every settings/collection row for the rest of the session.
 */
const AUTO_RELEASE_MS = 900;

export function createStackNavigationGuard() {
  let locked = false;
  let pendingKey: string | null = null;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (releaseTimer) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }
  };

  return {
    get isLocked() {
      return locked;
    },
    get pendingKey() {
      return pendingKey;
    },
    tryPush(key: string, fn: () => void): boolean {
      if (locked || pendingKey === key) return false;
      locked = true;
      pendingKey = key;
      clearTimer();
      releaseTimer = setTimeout(() => {
        locked = false;
        pendingKey = null;
        releaseTimer = null;
      }, AUTO_RELEASE_MS);
      fn();
      return true;
    },
    release() {
      clearTimer();
      locked = false;
      pendingKey = null;
    },
  };
}

export const stackNavigationGuard = createStackNavigationGuard();
