/**
 * Publish the current screen as an Apple Handoff activity.
 *
 * No-op on Android and in binaries that do not yet include the native module.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

type AppleContinuityNative = {
  setWebpageURL(url: string | null): void;
};

const native = requireOptionalNativeModule<AppleContinuityNative>('AppleContinuity');

export function setHandoffWebpageUrl(url: string | null): void {
  if (!native) return;
  try {
    native.setWebpageURL(url);
  } catch {
    // Handoff is additive — a missing native module must not affect navigation.
  }
}
