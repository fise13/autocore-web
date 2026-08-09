import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';

import { home } from '../../layout';

export function HomeSearch() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel="Search anything"
      onPress={() => router.push('/search' as Href)}
      style={{
        marginHorizontal: home.pad,
        marginTop: tokens.space[2],
        marginBottom: tokens.space[1],
        minHeight: 36,
        borderRadius: 10,
        backgroundColor: isDark
          ? withAlpha(colors.foreground, 0.1)
          : withAlpha(colors.foreground, 0.06),
        paddingHorizontal: tokens.space[3],
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space[2],
      }}
    >
      <SymbolView name="magnifyingglass" size={15} tintColor={colors.mutedForeground} weight="medium" />
      <View style={{ flex: 1 }}>
        <Text variant="body" color="muted" numberOfLines={1}>
          Search
        </Text>
      </View>
    </Pressable>
  );
}
