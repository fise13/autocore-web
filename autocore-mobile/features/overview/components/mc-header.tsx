import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationBellButton } from '@/components/notifications';
import { Text } from '@/components/ui';
import { useActiveCompanyName, useTheme } from '@/hooks';
import { rhythm, tokens } from '@/theme';
import { radius } from '@/theme/radius';

import { mc } from '../layout';
import { resolveTimeOfDayGreeting } from '../utils/greeting';

/**
 * Home header — quiet greeting, company as hero, notifications.
 * Matches Mission Control composition (greeting · brand · bell).
 */
export function McHeader() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { companyName } = useActiveCompanyName();
  const greeting = resolveTimeOfDayGreeting();
  const brand = companyName?.trim() || 'Autocore';

  return (
    <View
      style={{
        paddingTop: insets.top + rhythm.headerTop,
        paddingBottom: rhythm.stack,
        paddingHorizontal: mc.pad,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: rhythm.stack }}>
        <View style={{ flex: 1, gap: tokens.space.micro, minWidth: 0 }}>
          <Text variant="subheadline" color="muted" numberOfLines={1}>
            {greeting}
          </Text>
          <Text
            variant="largeTitle"
            numberOfLines={2}
            style={{
              fontSize: 32,
              lineHeight: 38,
              fontWeight: '700',
              letterSpacing: -0.55,
            }}
          >
            {brand}
          </Text>
        </View>

        <View
          style={{
            width: tokens.control.hitTarget,
            height: tokens.control.hitTarget,
            borderRadius: radius.full,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: tokens.space.micro,
            overflow: 'hidden',
          }}
        >
          <NotificationBellButton size="sm" />
        </View>
      </View>
    </View>
  );
}
