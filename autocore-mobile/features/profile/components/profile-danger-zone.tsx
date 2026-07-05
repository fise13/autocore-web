import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

import { ProfileNavCard, ProfileSettingsGroup } from './profile-nav-card';
import type { ProfileDangerAction } from '../types';

type ProfileDangerZoneProps = {
  items: ProfileDangerAction[];
  onAction?: (id: string) => void;
};

export function ProfileDangerZone({ items, onAction }: ProfileDangerZoneProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: rhythm.tight }}>
      <Text
        variant="caption"
        style={{
          paddingHorizontal: rhythm.pad,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: colors.mutedForeground,
        }}
      >
        Опасная зона
      </Text>
      <ProfileSettingsGroup>
        {items.map((item) => (
          <ProfileNavCard
            key={item.id}
            title={item.title}
            tone="danger"
            showChevron={false}
            onPress={() => onAction?.(item.id)}
          />
        ))}
      </ProfileSettingsGroup>
    </View>
  );
}
