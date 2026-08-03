import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChevronRightIcon } from '@/assets/icons';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

import { Text } from './text';

type ListRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
};

/** Standard settings / navigation row — flat, web-like, no press scale. */
export const ListRow = memo(function ListRow({
  title,
  subtitle,
  value,
  icon: Icon,
  tone = 'default',
  showChevron = true,
  onPress,
  trailing,
}: ListRowProps) {
  const { colors } = useTheme();
  const isDanger = tone === 'danger';
  const interactive = Boolean(onPress);
  const chevron = showChevron && interactive;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
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
              opacity: pressed && interactive ? 0.92 : 1,
            },
          ]}
        >
          {Icon ? (
            <View style={styles.icon}>
              <Icon
                size="sm"
                color={isDanger ? colors.destructive : colors.mutedForeground}
                strokeWidth={1.85}
              />
            </View>
          ) : null}

          <View style={styles.labelBlock}>
            <Text
              variant="body"
              numberOfLines={1}
              style={[styles.title, { color: isDanger ? colors.destructive : colors.foreground }]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                variant="caption"
                numberOfLines={2}
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {value ? (
            <Text
              variant="caption"
              numberOfLines={1}
              style={[styles.value, { color: colors.mutedForeground }]}
            >
              {value}
            </Text>
          ) : null}

          {trailing}

          {chevron ? (
            <View style={styles.chevron}>
              <ChevronRightIcon size={16} color={colors.mutedForeground} strokeWidth={2} />
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: rhythm.rowMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  icon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  labelBlock: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  value: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: '40%',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
  },
  chevron: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
