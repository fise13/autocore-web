import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import { haptics, tokens } from '@/theme';

import { fin, finFontCap, finType } from '../layout';
import { FINANCE_ROOT_HREF } from '../navigation';

/**
 * Detail chrome for the Finance stack — the same large-title voice as the hub,
 * so going deeper feels like turning a page rather than entering another app.
 */
export function FinDetailHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{
        paddingTop: insets.top + tokens.space[2],
        paddingHorizontal: fin.pad,
        paddingBottom: fin.stack,
        gap: fin.stack - 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => {
            haptics.light();
            goBackOrReplace(router, FINANCE_ROOT_HREF);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
          }}
        >
          <ArrowLeftIcon size={18} color={colors.foreground} strokeWidth={2.1} />
        </Pressable>
        {trailing}
      </View>

      <View style={{ gap: 3 }}>
        <Text
          style={{ ...finType.screenTitle, fontSize: 30, lineHeight: 36 }}
          maxFontSizeMultiplier={finFontCap.hero}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={finType.rowMeta} color="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
