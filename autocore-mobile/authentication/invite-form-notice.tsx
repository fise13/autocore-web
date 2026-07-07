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
            Вы войдёте в компанию{' '}
            <Text variant="caption" style={{ fontWeight: '600', color: colors.foreground }}>
              «{companyName}»
            </Text>
          </>
        ) : (
          'После входа вы присоединитесь к команде по приглашению.'
        )}
      </Text>
    </View>
  );
}
