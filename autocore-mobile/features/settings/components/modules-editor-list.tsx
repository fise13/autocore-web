import { View } from 'react-native';
import Animated, { FadeIn, Layout, LinearTransition } from 'react-native-reanimated';

import { Switch, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { MODULE_DEFINITIONS, MODULE_ORDER } from '../data/modules';
import { profileLayout } from '@/features/profile/layout';
import type { ProductModuleId } from '../types';

type ModulesEditorListProps = {
  enabled: Record<ProductModuleId, boolean>;
  onToggle: (id: ProductModuleId) => void;
};

export function ModulesEditorList({ enabled, onToggle }: ModulesEditorListProps) {
  const { colors } = useTheme();

  return (
    <Animated.View layout={LinearTransition.springify()} style={{ gap: 10, paddingHorizontal: profileLayout.pad }}>
      {MODULE_ORDER.map((id, index) => {
        const def = MODULE_DEFINITIONS[id];
        const Icon = def.icon;
        const isOn = enabled[id];

        return (
          <Animated.View
            key={id}
            entering={FadeIn.delay(index * 30).duration(280)}
            layout={Layout.springify()}
            style={{
              borderRadius: profileLayout.cardRadius,
              borderWidth: profileLayout.hairline,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              opacity: isOn ? 1 : 0.78,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: toneBackground(colors.primary, isOn ? 0.12 : 0.06),
              }}
            >
              <Icon size="md" color={isOn ? colors.primary : colors.mutedForeground} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="body" style={{ fontSize: 15, fontWeight: '700' }}>
                {def.title}
              </Text>
              <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
                {def.description}
              </Text>
            </View>
            <Switch
              value={isOn}
              onValueChange={() => {
                haptics.selection();
                onToggle(id);
              }}
            />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}
