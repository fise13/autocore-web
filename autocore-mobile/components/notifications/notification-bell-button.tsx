import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { BellIcon } from '@/assets/icons';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import { useNotificationStore } from '@/stores/notification-store';
import { haptics, radius } from '@/theme';

type NotificationBellButtonProps = {
  size?: 'sm' | 'default';
  href?: string;
};

export function NotificationBellButton({
  size = 'default',
  href = '/(tabs)/profile/inbox',
}: NotificationBellButtonProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const buttonSize = size === 'sm' ? 'sm' : 'default';

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
          router.push(href as never);
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
