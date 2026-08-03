import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChevronRightIcon } from '@/assets/icons';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

import { Text } from './text';

type SettingsLinkRowProps = {
  title: string;
  value?: string;
  subtitle?: string;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  /** Draw top hairline (for rows after the first) */
  bordered?: boolean;
  onPress?: () => void;
};

/**
 * Compact link row for use inside SettingsSectionCard only.
 * Anatomy: title (left) | value (trailing) | chevron (far right).
 */
export const SettingsLinkRow = memo(function SettingsLinkRow({
  title,
  value,
  subtitle,
  tone = 'default',
  showChevron = true,
  bordered = false,
  onPress,
}: SettingsLinkRowProps) {
  const { colors } = useTheme();
  const isDanger = tone === 'danger';
  const meta = value ?? subtitle;
  const interactive = Boolean(onPress);
  const chevron = showChevron && interactive;

  return (
    <View>
      {bordered ? (
        <View
          style={[styles.divider, { backgroundColor: colors.border, marginLeft: rhythm.cardPadX }]}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={meta ? `${title}, ${meta}` : title}
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
            <View style={styles.titleWrap}>
              <Text
                variant="body"
                numberOfLines={1}
                style={{
                  fontSize: 15,
                  fontWeight: '500',
                  lineHeight: 20,
                  color: isDanger ? colors.destructive : colors.foreground,
                }}
              >
                {title}
              </Text>
            </View>

            {meta ? (
              <View style={styles.valueWrap}>
                <Text
                  variant="caption"
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    lineHeight: 18,
                    textAlign: 'right',
                    color: colors.mutedForeground,
                  }}
                >
                  {meta}
                </Text>
              </View>
            ) : null}

            {chevron ? (
              <View style={styles.chevron}>
                <ChevronRightIcon size={16} color={colors.mutedForeground} strokeWidth={2} />
              </View>
            ) : null}
          </View>
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  valueWrap: {
    flexShrink: 1,
    maxWidth: '46%',
    marginRight: 4,
  },
  chevron: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
