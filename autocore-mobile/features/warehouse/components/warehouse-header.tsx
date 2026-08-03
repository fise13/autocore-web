import Animated from 'react-native-reanimated';

import { ScanSearchIcon } from '@/assets/icons';
import { IconButton, PageHeader } from '@/components/ui';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { useSearchEnter } from '@/features/search/animation';

import { whTimeline } from '../animation/timeline';

type WarehouseHeaderProps = {
  itemCount: number;
  lowStockCount: number;
};

export function WarehouseHeader({ itemCount, lowStockCount }: WarehouseHeaderProps) {
  const { colors } = useTheme();
  const navigateTab = useNavigateTab();
  const enterStyle = useSearchEnter({ delay: whTimeline.header, translateY: 8, duration: 320 });

  const subtitle =
    lowStockCount > 0
      ? `${itemCount} items · ${lowStockCount} low stock`
      : `${itemCount} items in stock`;

  return (
    <Animated.View style={enterStyle}>
      <PageHeader
        title="Warehouse"
        subtitle={subtitle}
        logo={null}
        align="start"
        trailing={
          <IconButton
            accessibilityLabel="Scan"
            variant="ghost"
            size="sm"
            systemImage="barcode.viewfinder"
            onPress={() => {
              haptics.light();
              navigateTab('/(tabs)/scan');
            }}
          >
            <ScanSearchIcon size="sm" color={colors.primary} strokeWidth={2} />
          </IconButton>
        }
      />
    </Animated.View>
  );
}
