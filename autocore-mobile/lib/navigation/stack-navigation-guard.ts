/**
 * Stack push guard — blocks duplicate pushes until the destination screen focuses.
 * Tracks pending route key so a second tap on the same row cannot enqueue another push.
 */
export function createStackNavigationGuard() {
  let locked = false;
  let pendingKey: string | null = null;

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
      fn();
      return true;
    },
    release() {
      locked = false;
      pendingKey = null;
    },
  };
}

export const stackNavigationGuard = createStackNavigationGuard();
