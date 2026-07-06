import { useMemo } from 'react';

import { SettingsSectionCard } from '@/components/ui';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useSession } from '@/hooks';
import { isNavItemVisible } from '@/lib/navigation/nav-item-availability';

import { NavigationEditorList } from '../components/navigation-editor-list';
import { NavigationPreview } from '../components/navigation-preview';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useNavigationConfigStore } from '../store/navigation-config-store';

export function NavigationScreen() {
  const { profile } = useSession();
  const order = useNavigationConfigStore((s) => s.order);
  const enabled = useNavigationConfigStore((s) => s.enabled);
  const toggleItem = useNavigationConfigStore((s) => s.toggleItem);
  const moveItem = useNavigationConfigStore((s) => s.moveItem);
  const workOrdersEnabled = useCompanyModuleEnabled('workOrders');
  const warehouseEnabled = useCompanyModuleEnabled('warehouse');
  const accountingModuleEnabled = useCompanyModuleEnabled('accounting');

  const modules = useMemo(
    () => ({
      workOrders: workOrdersEnabled,
      warehouse: warehouseEnabled,
      accounting: accountingModuleEnabled,
    }),
    [workOrdersEnabled, warehouseEnabled, accountingModuleEnabled],
  );

  const editableOrder = useMemo(
    () => order.filter((id) => isNavItemVisible(id, profile, modules)),
    [modules, order, profile],
  );

  const handleMove = (from: number, to: number) => {
    const fromId = editableOrder[from];
    const toId = editableOrder[to];
    if (!fromId || !toId) return;
    moveItem(order.indexOf(fromId), order.indexOf(toId));
  };

  return (
    <ProfileScreenShell title="Навигация" subtitle="Нижняя панель">
      <SettingsSectionCard
        title="Предпросмотр"
        description="До 5 вкладок · остальное в «Ещё»"
      >
        <NavigationPreview order={editableOrder} enabled={enabled} />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Разделы"
        description="Удерживайте строку, чтобы перетащить, или используйте ↑ ↓"
      >
        <NavigationEditorList
          order={editableOrder}
          enabled={enabled}
          onToggle={toggleItem}
          onMove={handleMove}
        />
      </SettingsSectionCard>
    </ProfileScreenShell>
  );
}
