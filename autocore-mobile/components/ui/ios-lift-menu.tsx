import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useMotion, useTheme } from '@/hooks';
import { haptics, zIndex } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';

export type IosLiftMenuItem = {
  label: string;
  systemImage?: SFSymbol;
  destructive?: boolean;
  disabled?: boolean;
  selected?: boolean;
  onPress: () => void;
};

export type IosLiftMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type IosLiftMenuProps = {
  visible: boolean;
  onClose: () => void;
  anchor: IosLiftMenuAnchor | null;
  preview: ReactNode;
  items: IosLiftMenuItem[];
  previewStyle?: StyleProp<ViewStyle>;
  menuPlacement?: 'auto' | 'above' | 'below';
};

const MENU_WIDTH = 254;
const MENU_GAP = 10;
const EDGE = 14;
/** Ignore backdrop taps until the opening finger is gone. */
const DISMISS_ARM_MS = 480;
const PREVIEW_LIFT_SCALE = 1.035;

/**
 * iOS Notes / Mail-style lift context menu.
 * Host at screen level — never mount inside FlashList rows.
 */
export function IosLiftMenu({
  visible,
  onClose,
  anchor,
  preview,
  items,
  previewStyle,
  menuPlacement = 'auto',
}: IosLiftMenuProps) {
  const { colors, isDark, shadows } = useTheme();
  const motion = useMotion();
  const insets = useSafeAreaInsets();
  const [hosted, setHosted] = useState(visible);
  const [presented, setPresented] = useState(visible);
  const [dismissArmed, setDismissArmed] = useState(false);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const frozenAnchor = useRef<IosLiftMenuAnchor | null>(anchor);
  const pendingAction = useRef<(() => void) | null>(null);
  const visibleRef = useRef(visible);
  const dismissFallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(visible ? 1 : 0);
  const menuProgress = useSharedValue(visible ? 1 : 0);

  visibleRef.current = visible;

  if (visible && anchor) {
    frozenAnchor.current = anchor;
  }

  const flushPending = useCallback(() => {
    if (dismissFallback.current) {
      clearTimeout(dismissFallback.current);
      dismissFallback.current = null;
    }
    if (!visibleRef.current) setHosted(false);
    const action = pendingAction.current;
    if (!action) return;
    pendingAction.current = null;
    // Next macrotask: UIKit has torn down this Modal's window. Navigating in
    // the same turn leaves an invisible overlay on the camera.
    setTimeout(action, 0);
  }, []);

  useEffect(() => {
    if (visible) {
      setHosted(true);
      setPresented(true);
      setDismissArmed(false);
      progress.value = withSpring(1, {
        ...motion.springs.settle,
        damping: Math.max(motion.springs.settle.damping, 32),
        stiffness: Math.max(motion.springs.settle.stiffness ?? 180, 220),
      });
      menuProgress.value = withDelay(
        40,
        withSpring(1, {
          ...motion.springs.settle,
          damping: Math.max(motion.springs.settle.damping, 30),
        }),
      );
      const arm = setTimeout(() => setDismissArmed(true), DISMISS_ARM_MS);
      return () => clearTimeout(arm);
    }

    // Keep the Modal mounted with visible=false until UIKit dismisses it.
    // Unmounting while visible, or navigating in the same frame as onClose,
    // leaves a full-screen window over the camera — nothing is tappable.
    setDismissArmed(false);
    progress.value = 0;
    menuProgress.value = 0;
    setPresented(false);
  }, [menuProgress, motion.springs.settle, progress, visible]);

  useEffect(() => {
    if (presented || !hosted) return;
    if (Platform.OS !== 'ios') {
      flushPending();
      return;
    }
    dismissFallback.current = setTimeout(flushPending, 400);
    return () => {
      if (dismissFallback.current) {
        clearTimeout(dismissFallback.current);
        dismissFallback.current = null;
      }
    };
  }, [flushPending, hosted, presented]);

  const activeAnchor = visible ? anchor : frozenAnchor.current;

  const layout = useMemo(() => {
    if (!activeAnchor) return null;
    const { width: screenW, height: screenH } = Dimensions.get('window');
    const topSafe = insets.top + EDGE;
    const bottomSafe = screenH - insets.bottom - EDGE;

    const previewW = Math.min(Math.max(activeAnchor.width, 120), screenW - EDGE * 2);
    const previewX = Math.min(Math.max(EDGE, activeAnchor.x), screenW - EDGE - previewW);
    let previewY = Math.min(Math.max(topSafe, activeAnchor.y), bottomSafe - activeAnchor.height);

    const estimatedMenuH = Math.max(items.length, 1) * 44 + 2;
    const spaceAbove = previewY - topSafe;
    const spaceBelow = bottomSafe - (previewY + activeAnchor.height);

    let placeMenuAbove =
      menuPlacement === 'above'
        ? true
        : menuPlacement === 'below'
          ? false
          : spaceAbove >= estimatedMenuH + MENU_GAP && spaceAbove >= spaceBelow;

    if (menuPlacement === 'auto' && spaceBelow < estimatedMenuH + MENU_GAP && spaceAbove > spaceBelow) {
      placeMenuAbove = true;
    }
    if (menuPlacement === 'auto' && spaceAbove < estimatedMenuH + MENU_GAP) {
      placeMenuAbove = false;
    }

    let menuY = placeMenuAbove
      ? previewY - MENU_GAP - estimatedMenuH
      : previewY + activeAnchor.height + MENU_GAP;

    if (placeMenuAbove && menuY < topSafe) {
      const shift = topSafe - menuY;
      menuY += shift;
      previewY = Math.min(previewY + shift, bottomSafe - activeAnchor.height);
    }
    if (!placeMenuAbove && menuY + estimatedMenuH > bottomSafe) {
      const overflow = menuY + estimatedMenuH - bottomSafe;
      menuY -= overflow;
      previewY = Math.max(topSafe, previewY - overflow);
    }

    const menuX = Math.min(
      Math.max(EDGE, previewX + previewW - MENU_WIDTH),
      screenW - EDGE - MENU_WIDTH,
    );

    return {
      previewX,
      previewY,
      previewW,
      previewH: activeAnchor.height,
      menuX,
      menuY,
      placeMenuAbove,
    };
  }, [activeAnchor, insets.bottom, insets.top, items.length, menuPlacement]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const previewMotion = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t,
      transform: [
        { scale: 0.97 + t * (PREVIEW_LIFT_SCALE - 0.97) },
        { translateY: (1 - t) * 8 },
      ],
    };
  });

  const menuMotion = useAnimatedStyle(() => {
    const t = menuProgress.value;
    const fromBelow = layout && !layout.placeMenuAbove;
    return {
      opacity: t,
      transform: [
        { scale: 0.9 + t * 0.1 },
        { translateY: (1 - t) * (fromBelow ? -10 : 10) },
      ],
    };
  });

  if (!hosted || !layout) return null;

  const dismiss = () => {
    if (!dismissArmed) return;
    haptics.selection();
    onClose();
  };

  return (
    <Modal
      visible={presented}
      transparent
      animationType="none"
      statusBarTranslucent
      onDismiss={flushPending}
      onRequestClose={() => {
        if (dismissArmed) onClose();
      }}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            disabled={!dismissArmed}
            onPress={dismiss}
            style={StyleSheet.absoluteFill}
          >
            <BlurView
              intensity={isDark ? 48 : 64}
              tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: withAlpha(colors.foreground, isDark ? 0.28 : 0.14) },
              ]}
            />
          </Pressable>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: layout.previewX,
              top: layout.previewY,
              width: layout.previewW,
              zIndex: zIndex.modal + 1,
            },
            previewMotion,
          ]}
        >
          <View
            style={[
              {
                backgroundColor: colors.card,
                borderRadius: tokens.radius.group,
                overflow: 'hidden',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: withAlpha(colors.foreground, isDark ? 0.12 : 0.08),
                ...shadows.elevated,
              },
              previewStyle,
            ]}
          >
            {preview}
          </View>
        </Animated.View>

        <Animated.View
          style={[
            {
              position: 'absolute',
              left: layout.menuX,
              top: layout.menuY,
              width: MENU_WIDTH,
              borderRadius: 14,
              overflow: 'hidden',
              zIndex: zIndex.modal + 2,
              ...shadows.elevated,
            },
            menuMotion,
          ]}
        >
          <BlurView
            intensity={isDark ? 80 : 90}
            tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? withAlpha(colors.card, 0.55)
                  : withAlpha('#F2F2F7', 0.72),
              },
            ]}
          />
          {items.map((item, index) => {
            const tint = item.destructive
              ? colors.destructive
              : item.selected
                ? colors.primary
                : colors.foreground;
            const muted = Boolean(item.disabled);
            const isLast = index === items.length - 1;
            return (
              <Pressable
                key={`${item.label}-${index}`}
                accessibilityRole="menuitem"
                accessibilityState={{ disabled: muted, selected: Boolean(item.selected) }}
                disabled={muted || !dismissArmed}
                onPress={() => {
                  if (muted || !dismissArmed) return;
                  haptics.selection();
                  pendingAction.current = item.onPress;
                  onClose();
                }}
                onPressIn={() => setPressedIndex(index)}
                onPressOut={() => setPressedIndex(null)}
                // Static object: `Pressable`'s function-form `style` is silently
                // dropped by this RN version, which was collapsing every menu row
                // into a stack (label above its own icon).
                style={{
                  minHeight: 44,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  opacity: muted ? tokens.opacity.disabled : 1,
                  backgroundColor:
                    pressedIndex === index
                      ? withAlpha(colors.foreground, isDark ? 0.14 : 0.07)
                      : 'transparent',
                }}
              >
                <Text
                  variant="body"
                  style={{
                    flex: 1,
                    fontSize: 17,
                    lineHeight: 22,
                    fontWeight: item.selected ? '600' : '400',
                    letterSpacing: -0.24,
                    color: tint,
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {item.systemImage ? (
                  <SymbolView
                    name={item.systemImage}
                    size={20}
                    weight={item.selected ? 'semibold' : 'regular'}
                    tintColor={tint}
                    resizeMode="scaleAspectFit"
                  />
                ) : null}
                {!isLast ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 16,
                      right: 0,
                      bottom: 0,
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: withAlpha(colors.foreground, isDark ? 0.22 : 0.14),
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
