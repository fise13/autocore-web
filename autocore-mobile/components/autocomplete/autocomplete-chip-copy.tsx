import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatPrice } from '@/store/money-format-store';
import { formatAutocompleteOption } from '@/lib/autocomplete/format-option';
import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { tokens } from '@/theme/tokens';

export function autocompleteChipTitle(option: AutocompleteOption): string {
  return formatAutocompleteOption(option).primary;
}

function uniqueBits(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const bits: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    bits.push(trimmed);
  }
  return bits;
}

export function AutocompleteChipCopy({ option }: { option: AutocompleteOption }) {
  const { primary, secondary } = formatAutocompleteOption(option);
  const labour = option.meta?.chipKind === 'service';
  const sku = option.meta?.sku;
  const price = option.meta?.price;
  const outOfStock = chipOutOfStock(option);

  const subtitle = uniqueBits([
    labour ? 'Labour' : null,
    sku && sku !== primary ? sku : null,
    secondary && secondary !== primary ? secondary : null,
    price != null ? formatPrice(price) : null,
    outOfStock ? 'Out of stock' : null,
  ]).join(' · ');

  return (
    <View style={{ maxWidth: tokens.autocomplete.chipMaxWidth, gap: 2 }}>
      <Text variant="callout" numberOfLines={1} style={{ fontWeight: '600' }}>
        {primary}
      </Text>
      {subtitle ? (
        <Text variant="caption1" color="muted" numberOfLines={1} style={{ fontWeight: '400' }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function chipOutOfStock(option: AutocompleteOption): boolean {
  return option.meta?.chipKind === 'part' && (option.meta.stockCount ?? 1) <= 0;
}

export type AutocompleteChipProps = {
  option: AutocompleteOption;
  index: number;
  onPress: () => void;
};
