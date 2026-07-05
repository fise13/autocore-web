import { SettingsSectionCard } from '@/components/ui';

import { ModulesEditorList } from '../components/modules-editor-list';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useModulesConfigStore } from '../store/modules-config-store';

export function ModulesScreen() {
  const enabled = useModulesConfigStore((s) => s.enabled);
  const toggleModule = useModulesConfigStore((s) => s.toggleModule);

  return (
    <ProfileScreenShell title="Модули" subtitle="Только нужные разделы">
      <SettingsSectionCard
        title="Модули продукта"
        description="Отключённые модули скрываются из меню и навигации"
      >
        <ModulesEditorList enabled={enabled} onToggle={toggleModule} />
      </SettingsSectionCard>
    </ProfileScreenShell>
  );
}
