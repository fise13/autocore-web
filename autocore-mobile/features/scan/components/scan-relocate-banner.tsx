import { Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { autocoreEase, duration, haptics } from '@/theme';

import { scanLayout } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanRelocateBannerProps = {
  title: string;
  subtitle: string;
  onCancel: () => void;
};

/** Relocate notice with Cancel. */
export function ScanRelocateBanner({ title, subtitle, onCancel }: ScanRelocateBannerProps) {
  const chrome = useScanChromeColors();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? undefined
    : FadeIn.duration(duration.normal).easing(autocoreEase);

  return (
    <Animated.View
      entering={entering}
      style={{
        position: 'absolute',
        top: insets.top + scanLayout.noticeTopOffset,
        left: scanLayout.pad,
        right: scanLayout.pad,
        zIndex: 2,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: chrome.bannerBg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: chrome.bannerBorder,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            variant="caption"
            style={{ color: chrome.bannerTitle, fontWeight: '600', fontSize: 13 }}
          >
            {title}
          </Text>
          <Text
            variant="caption"
            style={{ color: chrome.bannerMeta, fontSize: 12 }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={() => {
            haptics.selection();
            onCancel();
          }}
          hitSlop={8}
          style={{ paddingHorizontal: 4, paddingVertical: 6 }}
        >
          <Text
            variant="caption"
            style={{ color: chrome.bannerAction, fontWeight: '600', fontSize: 14 }}
          >
            Cancel
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
