import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { spacing, tokens } from '@/theme';

import { paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';

type PaywallChromeProps = {
  skipLabel?: string;
  onSkip: () => void;
  signOutLabel?: string;
  onSignOut?: () => void;
};

export function PaywallChrome({
  skipLabel = 'Not now',
  onSkip,
  signOutLabel = 'Sign out',
  onSignOut,
}: PaywallChromeProps) {
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
          gap: spacing[3],
          paddingHorizontal: tokens.space.screenX,
          paddingTop: spacing[1],
          minHeight: 44,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue without a subscription"
        accessibilityHint="Closes this screen and continues on the free plan"
        hitSlop={10}
        onPress={onSkip}
        style={{ flex: 1, minHeight: 44, justifyContent: 'center', paddingVertical: spacing[1] }}
      >
        <Text
          variant="body"
          numberOfLines={2}
          style={{ fontSize: 15, fontWeight: '500', color: colors.mutedForeground }}
        >
          {skipLabel}
        </Text>
      </Pressable>
      {onSignOut ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={signOutLabel}
          hitSlop={10}
          onPress={onSignOut}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[1] }}
        >
          <Text variant="body" style={{ fontSize: 16, fontWeight: '500', color: colors.primary }}>
            {signOutLabel}
          </Text>
        </Pressable>
      ) : (
        <View style={{ width: 12 }} />
      )}
    </Animated.View>
  );
}
