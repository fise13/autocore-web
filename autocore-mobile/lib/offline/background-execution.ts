/**
 * iOS `beginBackgroundTask` wrapper.
 *
 * Killing the app is fast because the process dies and the background
 * URLSession daemon keeps the PUTs going. Leaving only *suspends* JS — prepare
 * and finalize are ordinary fetches, so they die with the runtime. Asking iOS
 * for the extra ~30s of JS time is what lets a leave finish the same wave a
 * kill would have handed to the daemon.
 *
 * `begin` is synchronous on purpose. An `AsyncFunction` hop is how an instant
 * Home swipe froze JS before the assertion existed: the AppState handler
 * awaited a Promise, iOS throttled the runtime, and no URLSession task was
 * created. The native AppDelegate also begins on `willResignActive`.
 *
 * No-op on Android and when the native module is not in this binary yet.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

type BackgroundExecutionNative = {
  begin(name: string): number | Promise<number>;
  end(): Promise<void>;
};

const native = requireOptionalNativeModule<BackgroundExecutionNative>('BackgroundExecution');

export function beginBackgroundExecution(name: string): void {
  if (!native) return;
  try {
    const result = native.begin(name);
    if (result != null && typeof (result as Promise<number>).then === 'function') {
      void (result as Promise<number>).catch(() => undefined);
    }
  } catch {
    // Best-effort — foreground drain still owns the queue.
  }
}

export async function endBackgroundExecution(): Promise<void> {
  if (!native) return;
  try {
    await native.end();
  } catch {
    // Expiration / foreground already ended it.
  }
}
