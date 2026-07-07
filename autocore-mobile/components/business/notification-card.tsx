import { memo, type ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  ActivityIcon,
  BellIcon,
  ClipboardListIcon,
  DownloadIcon,
  FileStackIcon,
  FileTextIcon,
  PackageIcon,
  ReceiptIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
  type IconProps,
} from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import type { NotificationPriority } from '@/types/notifications';
import type { AppNotificationCategory } from '@/services/notifications';
import { haptics, rhythm } from '@/theme';

const ICON_BOX = 30;
const DIVIDER_INSET = rhythm.cardPadX + ICON_BOX + 10;

type CategoryIcon = ComponentType<IconProps>;

const CATEGORY_ICONS: Record<AppNotificationCategory, CategoryIcon> = {
  order: ClipboardListIcon,
  inventory: PackageIcon,
  finance: ReceiptIcon,
  subscription: BellIcon,
  import: FileStackIcon,
  export: DownloadIcon,
  documents: FileTextIcon,
  team: UsersIcon,
  sync: ActivityIcon,
  system: SettingsIcon,
  ai: SparklesIcon,
  security: SettingsIcon,
};

export type NotificationCardProps = {
  title: string;
  body: string;
  time: string;
  read?: boolean;
  priority?: NotificationPriority;
  category?: AppNotificationCategory;
  showDivider?: boolean;
  onPress?: () => void;
};

export const NOTIFICATION_ROW_DIVIDER_INSET = DIVIDER_INSET;

export const NotificationCard = memo(function NotificationCard({
  title,
  body,
  time,
  read = false,
  priority = 'medium',
  category,
  showDivider = false,
  onPress,
}: NotificationCardProps) {
  const { colors } = useTheme();
  const Icon = category ? CATEGORY_ICONS[category] : BellIcon;
  const accent = priority === 'critical' ? colors.destructive : colors.primary;
  const interactive = Boolean(onPress);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        disabled={!interactive}
        onPress={() => {
          if (!onPress) return;
          haptics.selection();
          onPress();
        }}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.row,
              {
                paddingHorizontal: rhythm.cardPadX,
                backgroundColor: pressed && interactive ? colors.muted : 'transparent',
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: `${accent}14` },
              ]}
            >
              <Icon size="sm" color={accent} strokeWidth={2} />
            </View>

            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text
                  variant="body"
                  numberOfLines={1}
                  style={[
                    styles.title,
                    {
                      color: colors.foreground,
                      fontWeight: read ? '500' : '600',
                    },
                  ]}
                >
                  {title}
                </Text>
                <View style={styles.meta}>
                  {!read ? (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  ) : null}
                  <Text variant="caption" numberOfLines={1} style={[styles.time, { color: colors.mutedForeground }]}>
                    {time}
                  </Text>
                </View>
              </View>

              <Text
                variant="caption"
                numberOfLines={2}
                style={[
                  styles.body,
                  { color: read ? colors.mutedForeground : colors.textSecondary },
                ]}
              >
                {body}
              </Text>
            </View>
          </View>
        )}
      </Pressable>

      {showDivider ? (
        <View
          style={{
            height: rhythm.hairline,
            marginLeft: DIVIDER_INSET,
            backgroundColor: colors.border,
          }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    minHeight: 58,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingTop: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    maxWidth: '42%',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  time: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  body: {
    fontSize: 13,
    lineHeight: 17,
  },
});
