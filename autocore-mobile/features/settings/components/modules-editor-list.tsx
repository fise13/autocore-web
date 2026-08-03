import { CollectionSwitchRow } from '@/components/ui';

import { MODULE_DEFINITIONS, MODULE_ORDER } from '../data/modules';
import type { ProductModuleId } from '../types';

type ModulesEditorListProps = {
  enabled: Record<ProductModuleId, boolean>;
  onToggle: (id: ProductModuleId) => void;
};

export function ModulesEditorList({ enabled, onToggle }: ModulesEditorListProps) {
  return (
    <>
      {MODULE_ORDER.map((id) => {
        const def = MODULE_DEFINITIONS[id];
        return (
          <CollectionSwitchRow
            key={id}
            title={def.title}
            subtitle={def.description}
            value={enabled[id]}
            onValueChange={() => onToggle(id)}
          />
        );
      })}
    </>
  );
}
