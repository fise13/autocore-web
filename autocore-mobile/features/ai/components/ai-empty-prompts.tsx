import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import type { AiCapability } from '@/lib/shell/types';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

type Props = {
  capabilities: AiCapability[];
  onSelect: (example: string) => void;
};

export const AiEmptyPrompts = memo(function AiEmptyPrompts({ capabilities, onSelect }: Props) {
  const { colors } = useTheme();

  if (capabilities.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="sectionLabel" color="muted" style={styles.label}>
        Try
      </Text>
      <View style={styles.chips}>
        {capabilities.map((cap) => (
          <Pressable
            key={cap.id}
            accessibilityRole="button"
            accessibilityLabel={cap.title}
            accessibilityHint={cap.example}
            onPress={() => {
              haptics.selection();
              onSelect(cap.example);
            }}
            style={[
              styles.chip,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Text variant="footnote" style={{ color: colors.foreground, fontWeight: '600' }}>
              {cap.title}
            </Text>
            <Text variant="caption1" color="muted" numberOfLines={2} style={styles.example}>
              {cap.example}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: tokens.space.screenX,
    gap: tokens.space.inline,
  },
  label: {
    marginBottom: 2,
  },
  chips: {
    gap: tokens.space.inline,
  },
  chip: {
    borderRadius: tokens.radius.group,
    borderWidth: tokens.control.hairline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  example: {
    lineHeight: 18,
  },
});
