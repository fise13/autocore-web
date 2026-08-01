import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { PackageIcon } from '@/assets/icons';
import { Badge, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import { resolveInventoryShelf } from '@/lib/inventory/resolve-shelf';
import type { InventoryItem } from '@/types/inventory';

import { wh } from '../layout';

type WarehouseItemRowProps = {
  item: InventoryItem;
  available: number;
  canEdit?: boolean;
  onPress: () => void;
  onAdjust: (delta: 1 | -1) => void;
};

const StepperButton = memo(function StepperButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.sidebarAccent,
        borderWidth: wh.hairline,
        borderColor: colors.borderMuted,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      <Text variant="bodyStrong" style={{ fontSize: 18, lineHeight: 20, color: colors.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
});

export const WarehouseItemRow = memo(function WarehouseItemRow({
  item,
  available,
  canEdit = false,
  onPress,
  onAdjust,
}: WarehouseItemRowProps) {
  const { colors } = useTheme();
  const low = isWarehouseLowStock({ ...item, totalAvailable: available });
  const shelf = resolveInventoryShelf(item);
  const meta = [item.sku, shelf ? `Bin ${shelf}` : null].filter(Boolean).join(' · ');
  const canDecrease = canEdit && available > 0;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: rhythm.inline,
          paddingVertical: rhythm.inline + 2,
          paddingHorizontal: wh.pad,
          minHeight: rhythm.rowMinHeight,
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onPress();
          }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: rhythm.inline, minWidth: 0 }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(colors.primary, low ? 0.16 : 0.1),
            }}
          >
            <PackageIcon size="sm" color={colors.primary} strokeWidth={1.75} />
          </View>

          <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {item.name}
              </Text>
              {low ? <Badge variant="warning">Low</Badge> : null}
            </View>
            {meta ? (
              <Text variant="meta" color="muted" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {canEdit ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <StepperButton label="−" disabled={!canDecrease} onPress={() => onAdjust(-1)} />
              <View style={{ minWidth: 34, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
                  {available}
                </Text>
              </View>
              <StepperButton label="+" onPress={() => onAdjust(1)} />
            </View>
          ) : (
            <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
              {available} {item.unit}
            </Text>
          )}

          {typeof item.sellPrice === 'number' && item.sellPrice > 0 ? (
            <Text variant="caption" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
              {item.sellPrice.toLocaleString('ru-RU')} ₸
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={{
          height: wh.hairline,
          backgroundColor: colors.border,
          marginLeft: wh.pad + 52,
          marginRight: wh.pad,
        }}
      />
    </View>
  );
});
