import { PlusIcon } from '@/assets/icons';
import { Button } from '@/components/ui';
import Animated from 'react-native-reanimated';

import { useOrdersEnter } from '../animation/use-orders-enter';
import { ordersTimeline } from '../animation/orders-timeline';
import { ordersLayout } from '../layout';

type OrdersPrimaryActionProps = {
  onPress: () => void;
};

export function OrdersPrimaryAction({ onPress }: OrdersPrimaryActionProps) {
  const enterStyle = useOrdersEnter({ delay: ordersTimeline.header + 30, translateY: 8, duration: 300 });

  return (
    <Animated.View style={[{ paddingHorizontal: ordersLayout.pad, marginTop: 16 }, enterStyle]}>
      <Button onPress={onPress} leftIcon={<PlusIcon size="sm" color="#fff" strokeWidth={2} />} style={{ width: '100%' }}>
        Новый заказ-наряд
      </Button>
    </Animated.View>
  );
}
