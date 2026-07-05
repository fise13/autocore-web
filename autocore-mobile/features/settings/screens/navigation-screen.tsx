import { SettingsSectionCard } from '@/components/ui';

import { NavigationEditorList } from '../components/navigation-editor-list';
import { NavigationPreview } from '../components/navigation-preview';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useNavigationConfigStore } from '../store/navigation-config-store';

export function NavigationScreen() {
  const order = useNavigationConfigStore((s) => s.order);
  const enabled = useNavigationConfigStore((s) => s.enabled);
  const toggleItem = useNavigationConfigStore((s) => s.toggleItem);
  const moveItem = useNavigationConfigStore((s) => s.moveItem);

  return (
    <ProfileScreenShell title="Навигация" subtitle="Нижняя панель">
      <SettingsSectionCard
        title="Предпросмотр"
        description="До 5 вкладок · остальное в «Ещё»"
      >
        <NavigationPreview order={order} enabled={enabled} />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Разделы"
        description="Удерживайте строку, чтобы перетащить, или используйте ↑ ↓"
      >
        <NavigationEditorList
          order={order}
          enabled={enabled}
          onToggle={toggleItem}
          onMove={moveItem}
        />
      </SettingsSectionCard>
    </ProfileScreenShell>
  );
}
