import { View } from 'react-native';

import { Switch, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

import { MODULE_DEFINITIONS, MODULE_ORDER } from '../data/modules';
import type { ProductModuleId } from '../types';

type ModulesEditorListProps = {
  enabled: Record<ProductModuleId, boolean>;
  onToggle: (id: ProductModuleId) => void;
};

export function ModulesEditorList({ enabled, onToggle }: ModulesEditorListProps) {
  const { colors } = useTheme();

  return (
    <View>
      {MODULE_ORDER.map((id, index) => {
        const def = MODULE_DEFINITIONS[id];
        const isOn = enabled[id];

        return (
          <View key={id}>
            {index > 0 ? (
              <View
                style={{
                  height: rhythm.hairline,
                  backgroundColor: colors.border,
                  marginLeft: rhythm.cardPadX,
                }}
              />
            ) : null}
            <View
              style={{
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: rhythm.inline,
                paddingHorizontal: rhythm.cardPadX,
                opacity: isOn ? 1 : 0.45,
              }}
            >
              <Text
                variant="body"
                style={{ flex: 1, fontSize: 15, fontWeight: '500', color: colors.foreground }}
                numberOfLines={1}
              >
                {def.title}
              </Text>
              <Switch
                value={isOn}
                onValueChange={() => {
                  haptics.selection();
                  onToggle(id);
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
