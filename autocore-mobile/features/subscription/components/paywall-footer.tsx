import { Linking, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { haptics, spacing } from '@/theme';

import { LEGAL_URLS } from '../data/pro-features';

export function PaywallFooter() {
  const open = (url: string) => {
    haptics.light();
    void Linking.openURL(url);
  };

  return (
    <View style={{ alignItems: 'center', gap: spacing[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Terms of Service"
          onPress={() => open(LEGAL_URLS.terms)}
          hitSlop={10}
        >
          <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
            Terms & Conditions
          </Text>
        </Pressable>

        <Text variant="caption" color="muted">
          {' · '}
        </Text>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy"
          onPress={() => open(LEGAL_URLS.privacy)}
          hitSlop={10}
        >
          <Text variant="caption" color="muted">
            Privacy
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
