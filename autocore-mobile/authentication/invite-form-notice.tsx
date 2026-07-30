import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { form, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

type InviteFormNoticeProps = {
  companyName: string | null;
};

export function InviteFormNotice({ companyName }: InviteFormNoticeProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: rhythm.radius,
        borderWidth: form.controlBorderWidth,
        borderColor: toneBackground(colors.primary, 0.15),
        backgroundColor: toneBackground(colors.primary, 0.05),
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text variant="caption" color="muted" style={{ lineHeight: 20 }}>
        {companyName ? (
          <>
            You'll join the company{' '}
            <Text variant="caption" style={{ fontWeight: '600', color: colors.foreground }}>
              "{companyName}"
            </Text>
          </>
        ) : (
          "Once signed in, you'll join the team via the invite."
        )}
      </Text>
    </View>
  );
}
