import type { MotorEntity } from '../../types/motor';

/**
 * Synthetic yard for preview builds (`EXPO_PUBLIC_STORE_SHOTS=1`).
 *
 * `EXPO_PUBLIC_STORE_SHOTS_MOTORS=10000` fills Engines with that many motors so
 * the catalog can be looked at and profiled on a device without a real
 * account. Deterministic, so two runs draw the same list. Pure.
 */
const MODELS: [string, string[]][] = [
  ['Subaru', ['EJ251', 'EJ253', 'EJ253 AVCS', 'EZ30', 'EJ204', 'EJ22', 'FB25', 'FB20']],
  ['Mitsubishi', ['6G72', '6G74', '6G75']],
  ['Chevrolet', ['F18D4', 'Z18XER', 'F16D4']],
  ['Suzuki', ['H27A', 'H25A', 'H22']],
  ['Hyundai', ['G6BA', 'G6EA']],
  ['Mazda', ['L3', '13B']],
  ['Toyota', ['3GR', '1KZ', '2AZ-FE']],
  ['Nissan', ['VK56', 'VQ35', 'VQ40']],
  ['Volvo', ['B6294T', 'B5244S']],
  ['BMW', ['N62B44', 'N62B48']],
];
const LOCATIONS = ['', '', '', 'WAREHOUSE', 'WAREHOUSE 2', 'A-12', 'B-04', 'РЕМОНТ ДЭН'];
const NOTES = ['', '', '', 'ГУР', 'SOLD. RETURN 12.08.2025', 'Без навесного', 'Нужен новый трос'];

export function makePreviewMotors(count: number, companyId: string): MotorEntity[] {
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)]!;
  const motors: MotorEntity[] = [];
  for (let index = 0; index < count; index += 1) {
    const [brandName, codes] = MODELS[Math.floor(next() ** 2 * MODELS.length)]!;
    const localId = -1_000_000 - index;
    motors.push({
      id: String(localId),
      localId,
      companyId,
      serialCode: `${next() < 0.5 ? 'B' : ''}${Math.floor(next() * 900_000) + 100_000}`,
      brandName,
      engineCode: pick(codes),
      configuration: next() < 0.3 ? 'ГУР' : '',
      notes: pick(NOTES),
      quality: pick(['', '1', '2', '3']),
      quantity: 1,
      transmission: '',
      arrivalDate: new Date(1_718_020_800_000 + index * 60_000),
      soldDate: null,
      status: 'available',
      warehouseLocation: pick(LOCATIONS) || undefined,
      photoUrls: [],
    } as MotorEntity);
  }
  return motors;
}
