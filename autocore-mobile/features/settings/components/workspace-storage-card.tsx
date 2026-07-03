import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CloudIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { useProfileEnter } from '@/features/profile/animation/use-profile-enter';

import { settingsLayout } from '../layout';

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
  const enterStyle = useProfileEnter({ delay: 130, translateY: 10, duration: 320 });
  const clampedPct = Math.min(100, Math.max(0, usedPct));

  return (
    <Animated.View
      style={[
        {
          borderRadius: settingsLayout.cardRadius,
          borderWidth: settingsLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 18,
          gap: 16,
        },
        enterStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="body" style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.15 }}>
          Хранилище и облако
        </Text>
        <Text variant="caption" color="muted" style={{ fontSize: 12, fontVariant: ['tabular-nums'] }}>
          {Math.round(clampedPct)}%
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="body" style={{ fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {usedLabel}
        </Text>
        <View
          style={{
            height: 6,
            borderRadius: 999,
            backgroundColor: toneBackground(colors.primary, 0.08),
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

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: 4,
          borderTopWidth: settingsLayout.hairline,
          borderTopColor: colors.border,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.success, 0.12),
          }}
        >
          <CloudIcon size="sm" color={colors.success} strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                backgroundColor: colors.success,
              }}
            />
            <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
              {syncStatus}
            </Text>
          </View>
          <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
            {syncMeta}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
