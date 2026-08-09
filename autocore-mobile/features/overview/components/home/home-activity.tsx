import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import type { HomeActivityRow } from '../../types-home';
import { HomeSectionTitle } from './home-primitives';

export function HomeActivity({ rows }: { rows: HomeActivityRow[] }) {
  const { colors } = useTheme();
  const router = useRouter();

  if (rows.length === 0) return null;

  return (
    <View>
      <HomeSectionTitle title="Recent" />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          paddingHorizontal: tokens.space[4],
          overflow: 'hidden',
        }}
      >
        {rows.map((row, index) => (
          <Pressable
            key={row.id}
            accessibilityRole={row.href ? 'button' : 'text'}
            disabled={!row.href}
            onPress={() => {
              if (!row.href) return;
              haptics.selection();
              router.push(row.href as Href);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: tokens.space[3],
              paddingVertical: tokens.space[3],
              borderTopWidth: index === 0 ? 0 : tokens.control.hairline,
              borderTopColor: colors.border,
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                marginTop: 7,
                backgroundColor: colors.mutedForeground,
              }}
            />
            <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
              <Text variant="subheadline" style={{ fontWeight: '600' }} numberOfLines={1}>
                {row.object}
              </Text>
              <Text variant="footnote" color="muted" numberOfLines={2}>
                {row.event}
              </Text>
            </View>
            <Text
              variant="caption1"
              color="muted"
              style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}
            >
              {row.time}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
