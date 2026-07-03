import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';

import { useProfileEnter } from '../animation/use-profile-enter';
import { ProfileNavCard, ProfileSettingsGroup } from './profile-nav-card';
import { profileLayout } from '../layout';
import type { ProfileDangerAction } from '../types';

type ProfileDangerZoneProps = {
  items: ProfileDangerAction[];
  onAction?: (id: string) => void;
};

export function ProfileDangerZone({ items, onAction }: ProfileDangerZoneProps) {
  const enterStyle = useProfileEnter({ delay: 780, translateY: 12, duration: 350 });

  return (
    <Animated.View style={[{ gap: 10 }, enterStyle]}>
      <Text
        variant="body"
        style={{
          fontSize: profileLayout.sectionTitle,
          fontWeight: '600',
          paddingHorizontal: profileLayout.pad,
          letterSpacing: -0.2,
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
    </Animated.View>
  );
}
