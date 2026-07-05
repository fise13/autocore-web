import { PageHeader } from '@/components/ui';

import { formatOrdersHeaderSubtitle } from '../lib/header-meta';
import type { OrdersListMeta } from '../types';

type OrdersHeaderProps = {
  meta: OrdersListMeta;
};

export function OrdersHeader({ meta }: OrdersHeaderProps) {
  return (
    <PageHeader title="Заказ-наряды" subtitle={formatOrdersHeaderSubtitle(meta)} logo={null} align="start" />
  );
}
