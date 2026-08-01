import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { autocoreEase, duration } from '@/theme';

import { scanLayout } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanOrderContextBannerProps = {
  orderLabel?: string;
};

/** Order-context notice on brand surfaces. */
export function ScanOrderContextBanner({ orderLabel }: ScanOrderContextBannerProps) {
  const chrome = useScanChromeColors();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const target = orderLabel?.trim() || 'new work order';
  const entering = reducedMotion
    ? undefined
    : FadeInDown.duration(duration.normal).easing(autocoreEase);

  return (
    <Animated.View
      entering={entering}
      pointerEvents="none"
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
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: chrome.bannerBg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: chrome.bannerBorder,
          gap: 2,
        }}
      >
        <Text
          variant="caption"
          style={{ color: chrome.bannerTitle, fontWeight: '600', fontSize: 13 }}
        >
          Adding to {target}
        </Text>
        <Text variant="caption" style={{ color: chrome.bannerMeta, fontSize: 12 }}>
          Scan a barcode to add the part
        </Text>
      </View>
    </Animated.View>
  );
}
