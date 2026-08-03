import { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { autocoreEase, duration, haptics } from '@/theme';

import type { ScanCaptureMode } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanModeControlProps = {
  mode: ScanCaptureMode;
  onChange: (mode: ScanCaptureMode) => void;
};

const MODES: Array<{ id: ScanCaptureMode; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'vin', label: 'VIN' },
  { id: 'document', label: 'Document' },
];

const PADDING = 3;
const HEIGHT = 36;

function RnSegmentedScanMode({ mode, onChange }: ScanModeControlProps) {
  const chrome = useScanChromeColors();
  const reducedMotion = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(
    0,
    MODES.findIndex((entry) => entry.id === mode),
  );
  const segmentWidth = trackWidth > 0 ? (trackWidth - PADDING * 2) / MODES.length : 0;

  const thumbStyle = useAnimatedStyle(() => {
    const target = index * segmentWidth;
    return {
      transform: [
        {
          translateX: reducedMotion
            ? target
            : withTiming(target, { duration: duration.normal, easing: autocoreEase }),
        },
      ],
    };
  });

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Scan mode"
      onLayout={(event: LayoutChangeEvent) => {
        const next = event.nativeEvent.layout.width;
        setTrackWidth((current) => (Math.abs(current - next) < 0.5 ? current : next));
      }}
      style={{
        alignSelf: 'center',
        flexDirection: 'row',
        height: HEIGHT,
        minWidth: 260,
        maxWidth: 320,
        width: '100%',
        borderRadius: 999,
        backgroundColor: chrome.track,
        padding: PADDING,
        position: 'relative',
      }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PADDING,
              left: PADDING,
              width: segmentWidth,
              height: HEIGHT - PADDING * 2,
              borderRadius: 999,
              backgroundColor: chrome.thumb,
            },
            thumbStyle,
          ]}
        />
      ) : null}

      {MODES.map((entry) => {
        const active = entry.id === mode;
        return (
          <Pressable
            key={entry.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(entry.id);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 13,
                fontWeight: active ? '700' : '500',
                color: active ? chrome.thumbLabel : chrome.trackLabel,
              }}
            >
              {entry.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Mode strip — RN only. `@expo/ui` SegmentedControl Host froze sibling taps. */
export function ScanModeControl({ mode, onChange }: ScanModeControlProps) {
  return <RnSegmentedScanMode mode={mode} onChange={onChange} />;
}
