import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PackageIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { rhythm } from '@/theme';

type ScanOrderContextBannerProps = {
  orderLabel?: string;
};

export function ScanOrderContextBanner({ orderLabel }: ScanOrderContextBannerProps) {
  const insets = useSafeAreaInsets();
  const target = orderLabel?.trim() || 'новый заказ-наряд';

  return (
    <View
      pointerEvents="none"
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
          backgroundColor: 'rgba(0,0,0,0.52)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.14)',
        }}
      >
        <PackageIcon size="sm" color="#fff" strokeWidth={1.85} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
            Добавление в заказ-наряд
          </Text>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.78)' }}>
            Отсканированная запчасть попадёт в {target}
          </Text>
        </View>
      </View>
    </View>
  );
}
