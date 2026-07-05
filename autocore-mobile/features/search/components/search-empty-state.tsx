import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PlusIcon, ScanSearchIcon, SearchIcon } from '@/assets/icons';
import { Surface, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { searchLayout } from '../layout';

export type SearchEmptyActionId = 'scan' | 'new-order' | 'parts-filter' | 'motors-filter';

type SearchEmptyStateProps = {
  query?: string;
  onAction?: (action: SearchEmptyActionId) => void;
};

const actions: Array<{
  id: SearchEmptyActionId;
  label: string;
  description: string;
  icon: typeof ScanSearchIcon;
}> = [
  {
    id: 'scan',
    label: 'Сканировать код',
    description: 'Камера · QR и штрихкод',
    icon: ScanSearchIcon,
  },
  {
    id: 'new-order',
    label: 'Создать наряд',
    description: 'Новый заказ-наряд',
    icon: PlusIcon,
  },
  {
    id: 'parts-filter',
    label: 'Поиск по складу',
    description: 'Артикул или название',
    icon: SearchIcon,
  },
];

export function SearchEmptyState({ query, onAction }: SearchEmptyStateProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleAction = (id: SearchEmptyActionId) => {
    haptics.selection();
    if (onAction) {
      onAction(id);
      return;
    }
    if (id === 'scan') {
      router.navigate('/(tabs)/scan');
      return;
    }
    if (id === 'new-order') {
      router.navigate('/(tabs)/orders/new');
    }
  };

  return (
    <Surface inset style={{ marginTop: rhythm.inline, gap: rhythm.section }}>
      <View style={{ alignItems: 'center', gap: rhythm.inline, paddingTop: rhythm.tight }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.1),
          }}
        >
          <SearchIcon size="md" color={colors.primary} strokeWidth={1.75} />
        </View>
        <View style={{ gap: rhythm.tight, alignItems: 'center' }}>
          <Text variant="bodyLarge" style={{ fontWeight: '600', textAlign: 'center' }}>
            {query ? 'Ничего не найдено' : 'Начните поиск'}
          </Text>
          <Text variant="caption" color="muted" style={{ lineHeight: 18, textAlign: 'center', maxWidth: 280 }}>
            {query
              ? `По запросу «${query}» нет совпадений. Попробуйте другой артикул, VIN или имя клиента.`
              : 'Введите артикул, VIN, клиента или номер наряда — или отсканируйте код.'}
          </Text>
        </View>
      </View>

      <View style={{ gap: rhythm.tight }}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <View key={action.id}>
              {index > 0 ? (
                <View
                  style={{
                    height: searchLayout.hairline,
                    backgroundColor: colors.border,
                    marginBottom: rhythm.tight,
                  }}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => handleAction(action.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: rhythm.inline,
                  minHeight: rhythm.rowMinHeight,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: toneBackground(colors.primary, 0.08),
                  }}
                >
                  <Icon size="sm" color={colors.primary} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" style={{ fontWeight: '600', fontSize: 14 }}>
                    {action.label}
                  </Text>
                  <Text variant="meta" color="muted">
                    {action.description}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </Surface>
  );
}
