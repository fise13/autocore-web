import { useRouter } from 'expo-router';

import { SearchIcon } from '@/assets/icons';
import { EmptyState } from '@/components/ui';
import { haptics, layout } from '@/theme';
import { View } from 'react-native';

export type SearchEmptyActionId = 'scan' | 'new-order' | 'parts-filter' | 'motors-filter';

type SearchEmptyStateProps = {
  query?: string;
  onAction?: (action: SearchEmptyActionId) => void;
};

export function SearchEmptyState({ query, onAction }: SearchEmptyStateProps) {
  const router = useRouter();

  const run = (id: SearchEmptyActionId) => {
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
      router.navigate('/orders/new');
    }
  };

  return (
    <View style={{ marginTop: layout.sectionGap / 2 }}>
      <EmptyState
        icon={SearchIcon}
        title={query ? 'No results found' : 'Start searching'}
        description={
          query
            ? `No matches for "${query}". Try a different part number, VIN, or customer name.`
            : 'Enter a part number, VIN, customer, or order number — or scan a code.'
        }
        primaryAction={{
          label: 'Scan a code',
          onPress: () => run('scan'),
        }}
        secondaryAction={{
          label: 'Create work order',
          onPress: () => run('new-order'),
          variant: 'outline',
        }}
      />
    </View>
  );
}
