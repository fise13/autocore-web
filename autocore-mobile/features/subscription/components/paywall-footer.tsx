import { Linking, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { haptics, spacing } from '@/theme';

import { paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';
import { LEGAL_URLS } from '../data/pro-features';

type PaywallFooterProps = {
  onRestore: () => void;
  restoring: boolean;
};

/**
 * Restore + legal.
 *
 * All three are App Review requirements, not decoration: a subscription paywall
 * without a visible Restore control and links to the EULA and privacy policy is
 * rejected under 3.1.2.
 */
export function PaywallFooter({ onRestore, restoring }: PaywallFooterProps) {
  const { colors } = useTheme();
  const style = usePaywallEnter({ delay: paywallTimeline.footer });

  const open = (url: string) => {
    haptics.light();
    void Linking.openURL(url);
  };

  return (
    <Animated.View style={[style, { gap: spacing[4], alignItems: 'center' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Restore purchases"
        accessibilityState={{ busy: restoring }}
        disabled={restoring}
        onPress={onRestore}
        hitSlop={12}
      >
        <Text
          variant="body"
          style={{
            color: colors.primary,
            fontWeight: '600',
            opacity: restoring ? 0.5 : 1,
          }}
        >
          {restoring ? 'Restoring…' : 'Restore Purchases'}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy"
          onPress={() => open(LEGAL_URLS.privacy)}
          hitSlop={10}
        >
          <Text variant="caption" color="muted">
            Privacy Policy
          </Text>
        </Pressable>

        <View
          style={{
            width: 3,
            height: 3,
            borderRadius: 999,
            backgroundColor: colors.mutedForeground,
            opacity: 0.5,
          }}
        />

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Terms of Service"
          onPress={() => open(LEGAL_URLS.terms)}
          hitSlop={10}
        >
          <Text variant="caption" color="muted">
            Terms of Service
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
