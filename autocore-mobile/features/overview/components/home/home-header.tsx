import { useCallback } from 'react';
import { View } from 'react-native';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/account/user-avatar';
import { NotificationBellButton } from '@/components/notifications';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui/text';
import {
  useActiveCompanyName,
  useSession,
  useTheme,
  useUserPhotoUrl,
} from '@/hooks';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import { McPressable } from '../../animation';
import { home } from '../../layout';
import { resolveGreetingHeadline } from '../../utils/greeting';

/** Health Summary–style large title + profile. */
export function HomeHeader({ offline }: { offline?: boolean }) {
  const navigateTab = useNavigateTab();
  const insets = useSafeAreaInsets();
  const { profile } = useSession();
  const { companyName } = useActiveCompanyName();
  const photoURL = useUserPhotoUrl();
  const displayName = profile?.displayName?.trim() || null;
  const headline = resolveGreetingHeadline(displayName);
  const { colors } = useTheme();
  const dateLine = format(new Date(), 'EEEE, d MMMM', { locale: enUS });

  const handleProfilePress = useCallback(() => {
    haptics.light();
    navigateTab('/(tabs)/profile');
  }, [navigateTab]);

  return (
    <View
      style={{
        paddingTop: insets.top + tokens.space[1],
        paddingBottom: tokens.space[2],
        paddingHorizontal: home.pad,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: tokens.space[3] }}>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 34,
              lineHeight: 41,
              fontWeight: '700',
              letterSpacing: -0.6,
              color: colors.foreground,
            }}
            numberOfLines={1}
          >
            {headline}
          </Text>
          {companyName?.trim() ? (
            <Text variant="subheadline" numberOfLines={1} style={{ fontWeight: '500' }}>
              {companyName.trim()}
            </Text>
          ) : null}
          <Text variant="footnote" color="muted" numberOfLines={1}>
            {offline ? `Offline · ${dateLine}` : dateLine}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[2],
            paddingBottom: 2,
          }}
        >
          <NotificationBellButton size="sm" />
          <McPressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={handleProfilePress}
            hitSlop={8}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                overflow: 'hidden',
              }}
            >
              <UserAvatar
                photoURL={photoURL}
                displayName={displayName}
                seed={profile?.id}
                size="sm"
              />
            </View>
          </McPressable>
        </View>
      </View>
    </View>
  );
}
