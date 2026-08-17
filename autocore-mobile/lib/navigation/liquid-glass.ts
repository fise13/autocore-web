import { Platform } from 'react-native';
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

/** Same tint as the floating dock — one glass family for shell chrome. */
export const LIQUID_GLASS_TINT = 'rgba(25, 28, 34, 0.45)';

/** True UIGlassEffect path — iOS 26+ with API present at runtime. */
export function canUseLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}
