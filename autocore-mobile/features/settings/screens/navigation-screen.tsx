import { Text } from '@/components/ui';

import { NavigationEditorList } from '../components/navigation-editor-list';
import { NavigationPreview } from '../components/navigation-preview';
import { ProfileMetaCard } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useNavigationConfigStore } from '../store/navigation-config-store';

export function NavigationScreen() {
  const order = useNavigationConfigStore((s) => s.order);
  const enabled = useNavigationConfigStore((s) => s.enabled);
  const toggleItem = useNavigationConfigStore((s) => s.toggleItem);
  const moveItem = useNavigationConfigStore((s) => s.moveItem);

  return (
    <ProfileScreenShell title="Навигация" subtitle="Нижняя панель под ваш рабочий процесс">
      <ProfileMetaCard delay={60}>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Включайте, отключайте и меняйте порядок. В панели до пяти вкладок, остальное уходит в «Ещё».
        </Text>
      </ProfileMetaCard>

      <NavigationPreview order={order} enabled={enabled} />

      <NavigationEditorList
        order={order}
        enabled={enabled}
        onToggle={toggleItem}
        onMove={moveItem}
      />
    </ProfileScreenShell>
  );
}
