import { Text } from '@/components/ui';

import { ModulesEditorList } from '../components/modules-editor-list';
import { ProfileMetaCard } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useModulesConfigStore } from '../store/modules-config-store';

export function ModulesScreen() {
  const enabled = useModulesConfigStore((s) => s.enabled);
  const toggleModule = useModulesConfigStore((s) => s.toggleModule);

  return (
    <ProfileScreenShell title="Модули" subtitle="Только то, что нужно вашему бизнесу">
      <ProfileMetaCard delay={60}>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Отключённые модули скрываются из меню, навигации и Mission Control. Изменения применяются сразу.
        </Text>
      </ProfileMetaCard>

      <ModulesEditorList enabled={enabled} onToggle={toggleModule} />
    </ProfileScreenShell>
  );
}
