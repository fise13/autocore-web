import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { CameraIcon, ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { openEngineIntakeBay } from '@/features/engine-intake/lib/open-engine-intake';
import { useSession, useTheme } from '@/hooks';
import { haptics, minTouchTarget, spacing, tokens } from '@/theme';

/**
 * Overview launch card — opens Engine intake bay.
 * Mirrors bay language: serial → free photos → review.
 */
export function IntakeLaunchCard() {
  const router = useRouter();
  const { can, companyId, uid } = useSession();
  const { colors } = useTheme();
  const { jobs } = useEngineIntakeJobs(
    can('engine_intake_view') ? companyId : null,
  );

  if (!can('engine_intake_view')) return null;

  const activeCount = jobs.filter((job) => {
    if (!['open', 'in_session', 'paused', 'rework'].includes(job.state)) return false;
    return (
      job.assignment.assigneeUid === uid ||
      job.assignment.claimedByUid === uid ||
      (!job.assignment.assigneeUid && (job.state === 'open' || job.state === 'rework'))
    );
  }).length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open engine intake"
      onPress={() => {
        haptics.selection();
        openEngineIntakeBay(router);
      }}
    >
      {({ pressed }) => (
        <View
          style={{
            minHeight: minTouchTarget + spacing[8],
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[4],
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[4],
            borderRadius: tokens.radius.group,
            backgroundColor: pressed ? colors.primary : colors.primarySubtle,
            borderWidth: 1,
            borderColor: pressed ? colors.primary : colors.primaryBorder,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: tokens.radius.control,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.primaryForeground : colors.primary,
            }}
          >
            <CameraIcon
              size={22}
              color={pressed ? colors.primary : colors.primaryForeground}
            />
          </View>
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text
              variant="heading"
              style={{
                color: pressed ? colors.primaryForeground : colors.primaryOnSubtle,
                fontWeight: '800',
              }}
            >
              Engine intake
            </Text>
            <Text
              variant="caption"
              style={{
                color: pressed ? colors.primaryForeground : colors.mutedForeground,
                fontWeight: '500',
              }}
            >
              Photograph engine condition
              {activeCount > 0
                ? ` · ${activeCount} active`
                : ''}
            </Text>
          </View>
          <ChevronRightIcon
            size={20}
            color={pressed ? colors.primaryForeground : colors.primaryOnSubtle}
          />
        </View>
      )}
    </Pressable>
  );
}

/** @deprecated Prefer IntakeLaunchCard — kept for overview import stability. */
export function EngineIntakeLaunch() {
  return <IntakeLaunchCard />;
}
