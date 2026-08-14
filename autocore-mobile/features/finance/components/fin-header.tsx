import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlusIcon, SettingsIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, tokens } from '@/theme';

import { fin, finFontCap, finType } from '../layout';

const ACTION = tokens.control.hitTarget;

/**
 * Large title that the compact scroll bar takes over once it leaves the screen
 * (`ScreenScroll edgeTitle`). The subtitle states the range and the sample size
 * the whole screen is computed from, so nothing below has to repeat it.
 */
export function FinHeader({
  subtitle,
  canEdit,
  onNewOperation,
  onSettings,
}: {
  subtitle: string;
  canEdit: boolean;
  onNewOperation: () => void;
  onSettings: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + tokens.space[2],
        paddingBottom: fin.stack,
        paddingHorizontal: fin.pad,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: fin.stack,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={finType.screenTitle} maxFontSizeMultiplier={finFontCap.hero}>
          Finance
        </Text>
        <Text style={finType.rowMeta} color="muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.inline }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Finance settings"
          hitSlop={6}
          onPress={() => {
            haptics.light();
            onSettings();
          }}
          style={{
            width: ACTION,
            height: ACTION,
            borderRadius: fin.pillRadius,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
          }}
        >
          <SettingsIcon size={19} color={colors.foreground} strokeWidth={1.9} />
        </Pressable>

        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Record an operation"
            hitSlop={4}
            onPress={() => {
              haptics.light();
              onNewOperation();
            }}
            style={{
              minHeight: ACTION,
              paddingHorizontal: 14,
              borderRadius: fin.pillRadius,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: colors.primary,
            }}
          >
            <PlusIcon size={17} color={colors.primaryForeground} strokeWidth={2.5} />
            <Text
              style={{
                ...finType.label,
                fontSize: 15,
                fontWeight: '600',
                color: colors.primaryForeground,
              }}
              maxFontSizeMultiplier={1.2}
            >
              Add
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
