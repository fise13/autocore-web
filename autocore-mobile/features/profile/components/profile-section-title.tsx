import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';

import { useProfileEnter } from '../animation/use-profile-enter';
import { profileLayout } from '../layout';

export function SectionTitle({ title, delay }: { title: string; delay: number }) {
  const style = useProfileEnter({ delay, translateY: 8, duration: 320 });

  return (
    <Animated.View style={[{ paddingHorizontal: profileLayout.pad, marginBottom: 10, marginTop: 4 }, style]}>
      <Text
        variant="caption"
        color="muted"
        style={{
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>
    </Animated.View>
  );
}
