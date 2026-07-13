import type { SearchResultItem } from '@/features/search/types';
import { inventoryCardSubtitle, normalizeInventoryCode } from '@/features/search/lib/format';
import type { MotorEntity } from '@/types/motor';
import { formatMotorLineLabel } from '@/lib/motors/format-motor-display-name';

function resolveMotorShelf(motor: MotorEntity): string | undefined {
  const primary = motor.primaryLocationCode?.trim();
  if (primary) return primary;
  const legacy = motor.warehouseLocation?.trim();
  return legacy || undefined;
}

export function mapMotorToSearchResult(motor: MotorEntity): SearchResultItem {
  const title = normalizeInventoryCode(
    formatMotorLineLabel(motor, { includeSerial: true, fallback: motor.serialCode ?? 'Двигатель' }),
  );
  const subtitle =
    inventoryCardSubtitle(title, motor.serialCode ?? '') ??
    ([motor.brandName, motor.engineCode].filter(Boolean).join(' · ') || undefined);
  const meta = motor.configuration?.trim() || undefined;

  let status: SearchResultItem['status'] = 'in_stock';
  if (motor.status === 'reserved') status = 'reserved';
  if (motor.status === 'sold') status = 'sold';

  return {
    id: motor.id,
    kind: 'motor',
    title,
    subtitle,
    meta,
    status,
    shelf: resolveMotorShelf(motor),
    serialCode: motor.serialCode?.trim() || undefined,
  };
}
