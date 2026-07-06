import { View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

import { BellIcon } from '@/assets/icons';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import {
  notificationInboxHref,
  openNotificationInbox,
  resolveInboxReturnToFromTab,
} from '@/lib/navigation/open-notification-inbox';
import { useNotificationStore } from '@/stores/notification-store';
import { haptics, radius } from '@/theme';

type NotificationBellButtonProps = {
  size?: 'sm' | 'default';
};

export function NotificationBellButton({ size = 'default' }: NotificationBellButtonProps) {
  const router = useRouter();
  const navigateTab = useNavigateTab();
  const segments = useSegments();
  const { colors } = useTheme();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const onProfileTab = segments.some((segment) => segment === 'profile');
  const returnTo = resolveInboxReturnToFromTab(undefined);
  const inboxHref = notificationInboxHref(returnTo);

  return (
    <View>
      <IconButton
        size={buttonSize}
        variant="ghost"
        accessibilityLabel={
          unreadCount > 0 ? `Уведомления, ${unreadCount} непрочитанных` : 'Уведомления'
        }
        onPress={() => {
          haptics.light();
          if (onProfileTab) {
            openNotificationInbox(router, { returnTo });
            return;
          }
          navigateTab(inboxHref as string);
        }}
      >
        <BellIcon
          size={size === 'sm' ? 'sm' : 'md'}
          color={colors.foreground}
          strokeWidth={1.75}
        />
      </IconButton>
      {unreadCount > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: radius.full,
            backgroundColor: colors.destructive,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: colors.destructiveForeground ?? '#fff',
              lineHeight: 12,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
