import { View } from 'react-native';

import { MailIcon, UsersIcon } from '@/assets/icons';
import { SettingsSectionCard, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { radius } from '@/theme/radius';

type TeamSummaryCardProps = {
  activeEmployees: number;
  totalEmployees: number;
  pendingInvites: number;
};

function SummaryMetric({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: typeof UsersIcon;
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'primary';
}) {
  const { colors } = useTheme();
  const accent = tone === 'primary' ? colors.primary : colors.foreground;

  return (
    <View
      style={{
        flex: 1,
        gap: rhythm.tight,
        padding: rhythm.stack,
        borderRadius: radius['2xl'],
        backgroundColor: toneBackground(colors.foreground, 0.04),
        borderWidth: rhythm.hairline,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="meta" color="muted" style={{ fontWeight: '500' }}>
          {label}
        </Text>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(accent, 0.12),
          }}
        >
          <Icon size="sm" color={accent} strokeWidth={1.75} />
        </View>
      </View>
      <Text variant="title" style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.5, color: accent }}>
        {value}
      </Text>
      <Text variant="caption" color="muted">
        {hint}
      </Text>
    </View>
  );
}

export function TeamSummaryCard({
  activeEmployees,
  totalEmployees,
  pendingInvites,
}: TeamSummaryCardProps) {
  return (
    <SettingsSectionCard title="Обзор команды" description="Сотрудники и приглашения в одном месте">
      <View
        style={{
          flexDirection: 'row',
          gap: rhythm.stack,
          paddingHorizontal: rhythm.cardPadX,
          paddingBottom: rhythm.cardPadX,
        }}
      >
        <SummaryMetric
          icon={UsersIcon}
          label="Сотрудники"
          value={`${activeEmployees}`}
          hint={`${totalEmployees} в команде`}
          tone="primary"
        />
        <SummaryMetric
          icon={MailIcon}
          label="Приглашения"
          value={`${pendingInvites}`}
          hint="ожидают вступления"
        />
      </View>
    </SettingsSectionCard>
  );
}
