type Listener = () => void;

let shellReady = false;
const listeners = new Set<Listener>();

export function getAppShellReady(): boolean {
  return shellReady;
}

export function setAppShellReady(ready: boolean): void {
  if (shellReady === ready) return;
  shellReady = ready;
  for (const listener of listeners) listener();
}

export function subscribeAppShellReady(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Call on sign-out / company switch so the next session waits again. */
export function resetAppShellReady(): void {
  setAppShellReady(false);
}
