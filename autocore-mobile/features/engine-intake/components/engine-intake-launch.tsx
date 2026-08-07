import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { CameraIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useSession, useTheme } from '@/hooks';
import { haptics, minTouchTarget, spacing, tokens } from '@/theme';

export function EngineIntakeLaunch() {
  const router = useRouter();
  const { can } = useSession();
  const { colors } = useTheme();

  if (!can('engine_intake_view')) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open engine intake"
      onPress={() => {
        haptics.selection();
        router.push('/intake' as Href);
      }}
    >
      {({ pressed }) => (
        <View
          style={{
            minHeight: minTouchTarget + spacing[6],
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[4],
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[4],
            borderRadius: tokens.radius.group,
            backgroundColor: colors.primarySubtle,
            borderWidth: 1,
            borderColor: colors.primaryBorder,
            opacity: pressed ? 0.82 : 1,
          }}
        >
          <CameraIcon size={24} color={colors.primaryOnSubtle} />
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text variant="heading" style={{ color: colors.primaryOnSubtle }}>
              Warehouse
            </Text>
            <Text variant="caption" style={{ color: colors.mutedForeground }}>
              Serial, free photos, sync — then managers release to Motors
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
