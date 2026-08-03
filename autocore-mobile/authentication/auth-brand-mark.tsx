import { Image, Platform, Text, useColorScheme, View } from 'react-native';

type AuthBrandMarkProps = {
  /** `loading` — splash lockup. Login uses `default` (scaled-down splash). */
  size?: 'default' | 'loading';
};

/** App-scheme ink — splash bg matches `colors.background`. */
const INK_LIGHT = '#11131a';
const INK_DARK = '#f5f5f7';

/**
 * Full brand mark from web `assets/icons/app-icon.png` (red A on black).
 * The bitmap already includes the complete teardrop + arched feet.
 */
const APP_ICON = require('../assets/branding/app-icon.png');

/**
 * Splash lockup — optically balanced unit.
 * Text +4%, icon +8%, tighter gap, icon raised for optical midline.
 */
const SPLASH_FONT = 40;
const SPLASH_ICON = 52;
const SPLASH_GAP = 3;
const SPLASH_LETTER_SPACING = -0.7;
const SPLASH_MARK_NUDGE_Y = -2.5;

/** Login = exact splash composition at 75% — rise exit scales into this. */
const LOGIN_SCALE = 0.75;
const LOGIN_FONT = Math.round(SPLASH_FONT * LOGIN_SCALE); // 30
const LOGIN_ICON = Math.round(SPLASH_ICON * LOGIN_SCALE); // 39
const LOGIN_GAP = Math.max(2, Math.round(SPLASH_GAP * LOGIN_SCALE)); // 2
const LOGIN_LETTER_SPACING = SPLASH_LETTER_SPACING * LOGIN_SCALE;
const LOGIN_MARK_NUDGE_Y = SPLASH_MARK_NUDGE_Y * LOGIN_SCALE;

/**
 * Splash lockup — SF Pro Display Semibold.
 * `icon` is the Image box; markNudgeY raises the A for optical align.
 */
export const SPLASH_LOCKUP = {
  icon: SPLASH_ICON,
  fontSize: SPLASH_FONT,
  gap: SPLASH_GAP,
  letterSpacing: SPLASH_LETTER_SPACING,
  fontWeight: '600' as const,
  markNudgeY: SPLASH_MARK_NUDGE_Y,
} as const;

/** Reduced splash lockup — same rhythm, smaller for login header. */
export const LOGIN_LOCKUP = {
  icon: LOGIN_ICON,
  fontSize: LOGIN_FONT,
  gap: LOGIN_GAP,
  letterSpacing: LOGIN_LETTER_SPACING,
  fontWeight: '600' as const,
  markNudgeY: LOGIN_MARK_NUDGE_Y,
} as const;

const LOCKUP = {
  loading: SPLASH_LOCKUP,
  default: LOGIN_LOCKUP,
} as const;

/** Scale factor: splash lockup → login mark (rise exit). */
export const SPLASH_TO_LOGIN_SCALE = LOGIN_SCALE;

/** Half the login icon — for splash rise targeting into AuthHeroShell. */
export const LOGIN_BRAND_HALF_HEIGHT = LOGIN_ICON / 2;

/** Top padding inside safe area (8pt system) — keep in sync with AuthHeroShell. */
export const AUTH_HERO_BRAND_PAD_TOP = 8;

/** Distance from safe-area top to login brand optical center. */
export const LOGIN_BRAND_CENTER_FROM_TOP = AUTH_HERO_BRAND_PAD_TOP + LOGIN_BRAND_HALF_HEIGHT;

/**
 * Login / splash wordmark — full app icon + AutoCore.
 *
 * Kept free of `@/hooks` and `@/components/ui` barrels so the boot splash
 * can mount without a circular require.
 */
export function AuthBrandMark({ size = 'default' }: AuthBrandMarkProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const ink = isDark ? INK_DARK : INK_LIGHT;
  const lockup = LOCKUP[size];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="AutoCore"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: lockup.gap,
      }}
    >
      <Image
        source={APP_ICON}
        style={{
          width: lockup.icon,
          height: lockup.icon,
          transform: [{ translateY: lockup.markNudgeY }],
        }}
        resizeMode="contain"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
          fontSize: lockup.fontSize,
          lineHeight: lockup.fontSize + (size === 'loading' ? 2 : 1),
          fontWeight: lockup.fontWeight,
          letterSpacing: lockup.letterSpacing,
          color: ink,
          ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
        }}
      >
        AutoCore
      </Text>
    </View>
  );
}
