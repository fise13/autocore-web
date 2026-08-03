import { ListSection } from '@/components/ui';

import { ModulesEditorList } from '../components/modules-editor-list';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useModulesConfigStore } from '../store/modules-config-store';

export function ModulesScreen() {
  const enabled = useModulesConfigStore((s) => s.enabled);
  const toggleModule = useModulesConfigStore((s) => s.toggleModule);

  return (
    <ProfileScreenShell title="Modules" subtitle="Only the sections you need">
      <ListSection
        title="Product modules"
        footer="Disabled modules are hidden from the menu and navigation."
      >
        <ModulesEditorList enabled={enabled} onToggle={toggleModule} />
      </ListSection>
    </ProfileScreenShell>
  );
}
