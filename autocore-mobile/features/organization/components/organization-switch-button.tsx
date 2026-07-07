import { Pressable, View } from 'react-native';

import { ChevronRightIcon, StoreIcon } from '@/assets/icons';
import { Surface, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

type OrganizationSwitchButtonProps = {
  companyName: string;
  onPress: () => void;
};

/** Standalone org switcher — used in profile hub and company settings. */
export function OrganizationSwitchButton({ companyName, onPress }: OrganizationSwitchButtonProps) {
  const { colors } = useTheme();

  return (
    <Surface inset padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Сменить организацию. Сейчас: ${companyName}`}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
      >
        {({ pressed }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: rhythm.stack,
              paddingHorizontal: rhythm.cardPadX,
              paddingVertical: rhythm.cardPadY + 2,
              backgroundColor: pressed ? colors.muted : 'transparent',
              opacity: pressed ? 0.92 : 1,
            }}
          >
            <View
              style={{
                width: rhythm.iconBox,
                height: rhythm.iconBox,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: toneBackground(colors.primary, 0.12),
              }}
            >
              <StoreIcon size="sm" color={colors.primary} strokeWidth={1.85} />
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>
                Сменить организацию
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {companyName}
              </Text>
            </View>

            <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
          </View>
        )}
      </Pressable>
    </Surface>
  );
}
