import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { XIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { rhythm, spacing } from '@/theme';

import { paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';

type PaywallChromeProps = {
  showClose: boolean;
  onClose: () => void;
  signOutLabel?: string;
  onSignOut?: () => void;
};

export function PaywallChrome({ showClose, onClose, signOutLabel = 'Sign out', onSignOut }: PaywallChromeProps) {
  const { colors } = useTheme();
  const style = usePaywallEnter({ delay: paywallTimeline.chrome, duration: 280, translateY: 0 });

  return (
    <Animated.View
      style={[
        style,
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: rhythm.pad,
          paddingTop: spacing[1],
          minHeight: 44,
        },
      ]}
    >
      {showClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={14}
          onPress={onClose}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <XIcon size="md" color={colors.foreground} />
        </Pressable>
      ) : (
        <View style={{ width: 44, height: 44 }} />
      )}
      {onSignOut ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={signOutLabel}
          hitSlop={10}
          onPress={onSignOut}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[2] }}
        >
          <Text variant="body" style={{ fontSize: 16, fontWeight: '500', color: colors.primary }}>
            {signOutLabel}
          </Text>
        </Pressable>
      ) : (
        <View style={{ width: 44, height: 44 }} />
      )}
    </Animated.View>
  );
}
