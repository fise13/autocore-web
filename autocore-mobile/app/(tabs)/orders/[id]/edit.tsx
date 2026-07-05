import { useLocalSearchParams } from 'expo-router';

import { CreateOrderScreen } from '@/features/orders/create-order-screen';

export default function EditOrderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CreateOrderScreen orderId={id ?? ''} />;
}
