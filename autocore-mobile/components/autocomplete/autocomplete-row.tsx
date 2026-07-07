import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { AUTOCOMPLETE_ROW_HEIGHT } from '@/lib/autocomplete/constants';
import { formatAutocompleteOption } from '@/lib/autocomplete/format-option';
import type { AutocompleteOption } from '@/lib/autocomplete/types';

type AutocompleteRowProps = {
  option: AutocompleteOption;
  highlighted: boolean;
  isLast?: boolean;
  onPress: () => void;
};

export const AutocompleteRow = memo(function AutocompleteRow({
  option,
  highlighted,
  isLast = false,
  onPress,
}: AutocompleteRowProps) {
  const { colors, isDark } = useTheme();
  const { primary, secondary } = formatAutocompleteOption(option);

  const highlightBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <>
      <Pressable
        onPressIn={onPress}
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => ({
          minHeight: AUTOCOMPLETE_ROW_HEIGHT,
          justifyContent: 'center',
          paddingHorizontal: 12,
          backgroundColor: highlighted || pressed ? highlightBg : 'transparent',
        })}
      >
        <View style={styles.row}>
          <Text
            variant="body"
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 15,
              lineHeight: 20,
              fontWeight: highlighted ? '600' : '400',
              letterSpacing: -0.24,
            }}
          >
            {primary}
          </Text>
          {secondary ? (
            <Text
              variant="caption"
              color="muted"
              numberOfLines={1}
              style={{
                flexShrink: 1,
                maxWidth: '42%',
                fontSize: 13,
                lineHeight: 18,
                textAlign: 'right',
                letterSpacing: -0.08,
              }}
            >
              {secondary}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {!isLast ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            marginLeft: 12,
            backgroundColor: colors.borderMuted,
          }}
        />
      ) : null}
    </>
  );
});

export function AutocompletePanel({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();

  const panelBody = (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.borderMuted,
      }}
    >
      {children}
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={isDark ? 26 : 68}
        tint={isDark ? 'dark' : 'light'}
        style={{
          overflow: 'hidden',
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.76)' : 'rgba(249, 249, 249, 0.84)',
        }}
      >
        {panelBody}
      </BlurView>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.borderMuted,
      }}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    minHeight: AUTOCOMPLETE_ROW_HEIGHT - 2,
  },
});
