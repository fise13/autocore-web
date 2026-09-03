/**
 * Publish the current screen as an Apple Handoff activity.
 *
 * No-op on Android and in binaries that do not yet include the native module.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type AppleContinuityNative = {
  setWebpageURL(url: string | null): void;
};

const native = requireOptionalNativeModule<AppleContinuityNative>('AppleContinuity');

let warnedMissing = false;

export function setHandoffWebpageUrl(url: string | null): void {
  if (!native) {
    if (!warnedMissing && Platform.OS === 'ios') {
      warnedMissing = true;
      console.warn(
        '[handoff] AppleContinuity is not in this binary — Handoff will not appear in the Mac Dock. Rebuild iOS after adding modules/apple-continuity/ios/AppleContinuity.podspec.',
      );
    }
    return;
  }
  try {
    native.setWebpageURL(url);
  } catch {
    // Handoff is additive — a missing native module must not affect navigation.
  }
}
