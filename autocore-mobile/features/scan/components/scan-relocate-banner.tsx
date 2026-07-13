import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { haptics, rhythm } from '@/theme';

type ScanRelocateBannerProps = {
  title: string;
  subtitle: string;
  onCancel: () => void;
};

export function ScanRelocateBanner({ title, subtitle, onCancel }: ScanRelocateBannerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 76,
        left: rhythm.pad,
        right: rhythm.pad,
        zIndex: 2,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 14,
          backgroundColor: 'rgba(0,0,0,0.58)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.16)',
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
            {title}
          </Text>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.78)' }} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Отменить"
          onPress={() => {
            haptics.selection();
            onCancel();
          }}
          hitSlop={8}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
            Отмена
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
