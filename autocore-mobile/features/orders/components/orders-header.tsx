import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';

import { useOrdersEnter } from '../animation/use-orders-enter';
import { ordersTimeline } from '../animation/orders-timeline';
import { formatOrdersHeaderSubtitle } from '../lib/header-meta';
import { ordersLayout } from '../layout';
import type { OrdersListMeta } from '../types';

type OrdersHeaderProps = {
  meta: OrdersListMeta;
};

export function OrdersHeader({ meta }: OrdersHeaderProps) {
  const insets = useSafeAreaInsets();
  const titleStyle = useOrdersEnter({ delay: ordersTimeline.header, translateY: 10, duration: 320 });
  const subtitleStyle = useOrdersEnter({ delay: ordersTimeline.header + 60, translateY: 8, duration: 280 });

  return (
    <View style={{ paddingTop: insets.top + 10, paddingBottom: 4, paddingHorizontal: ordersLayout.pad }}>
      <Animated.View style={titleStyle}>
        <Text variant="heading" style={{ fontSize: ordersLayout.title, fontWeight: '700', letterSpacing: -0.8, lineHeight: 38 }}>
          Заказ-наряды
        </Text>
      </Animated.View>
      <Animated.View style={[{ marginTop: 6 }, subtitleStyle]}>
        <Text variant="caption" color="muted" style={{ fontSize: ordersLayout.subtitle, lineHeight: 18 }}>
          {formatOrdersHeaderSubtitle(meta)}
        </Text>
      </Animated.View>
    </View>
  );
}
