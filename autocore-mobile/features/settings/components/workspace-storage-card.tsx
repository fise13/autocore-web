import { View } from 'react-native';

import { SettingsSectionCard, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

type WorkspaceStorageCardProps = {
  usedLabel: string;
  usedPct: number;
  syncStatus: string;
  syncMeta: string;
};

export function WorkspaceStorageCard({
  usedLabel,
  usedPct,
  syncStatus,
  syncMeta,
}: WorkspaceStorageCardProps) {
  const { colors } = useTheme();
  const clampedPct = Math.min(100, Math.max(0, usedPct));

  return (
    <SettingsSectionCard title="Storage" description={`${syncStatus} · ${syncMeta}`}>
      <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" color="muted">
            {usedLabel}
          </Text>
          <Text variant="caption" color="muted">
            {Math.round(clampedPct)}%
          </Text>
        </View>
        <View
          style={{
            height: 4,
            borderRadius: 999,
            backgroundColor: colors.muted,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${clampedPct}%`,
              height: '100%',
              borderRadius: 999,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>
    </SettingsSectionCard>
  );
}
