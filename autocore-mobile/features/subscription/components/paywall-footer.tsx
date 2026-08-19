import { Linking, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { haptics, tokens } from '@/theme';

import { LEGAL_URLS } from '../data/pro-features';

type PaywallFooterProps = {
  disclosure?: string;
};

export function PaywallFooter({ disclosure }: PaywallFooterProps) {
  const open = (url: string) => {
    haptics.light();
    void Linking.openURL(url);
  };

  return (
    <View style={{ alignItems: 'center', gap: tokens.space.inline }}>
      {disclosure ? (
        <Text
          variant="caption"
          color="muted"
          style={{ textAlign: 'center', lineHeight: 16, paddingHorizontal: tokens.space.inline }}
        >
          {disclosure}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.space.stack,
          minHeight: tokens.control.hitTarget,
        }}
      >
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Terms of Service"
          onPress={() => open(LEGAL_URLS.terms)}
          hitSlop={10}
        >
          <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
            Terms
          </Text>
        </Pressable>

        <Text variant="caption" color="muted">
          ·
        </Text>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy"
          onPress={() => open(LEGAL_URLS.privacy)}
          hitSlop={10}
        >
          <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
            Privacy
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
