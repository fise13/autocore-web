import { memo, useCallback, useRef } from 'react';
import { Platform, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import * as Clipboard from 'expo-clipboard';

import {
  CatalogRow,
  Text,
  toast,
  type CatalogRowPosition,
  type IosLiftMenuItem,
} from '@/components/ui';
import { useSession, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import type { MotorEntity } from '@/types/motor';

import { ENGINE_THUMB_SIZE, EngineThumbnail } from './engine-thumbnail';
import { EngineQualityChip } from './engine-quality-chip';
import { useEnginesLift } from './engines-lift-provider';
import { eng } from '../layout';
import { engineQualityLabel } from '../lib/engine-quality';
import {
  engineStatusLabel,
  engineStatusTone,
  engineThumbnailUrl,
  engineUnitLabel,
  engineUnitLocation,
  engineVariantTitle,
  type EngineStatusTone,
} from '../lib/engine-variants';

export type EngineCatalogActions = {
  onRelocate: (motor: MotorEntity) => void;
  onAddToOrder: (motor: MotorEntity) => void;
  onSell: (motor: MotorEntity) => void;
};

function UnitSubtitle({ motor }: { motor: MotorEntity }) {
  const { colors } = useTheme();
  const location = engineUnitLocation(motor);
  const tone = engineStatusTone(motor);

  const toneColor: Record<EngineStatusTone, string> = {
    success: colors.successOnSubtle,
    warning: colors.warningOnSubtle,
    danger: colors.dangerOnSubtle,
    progress: colors.primary,
    muted: colors.mutedForeground,
  };

  return (
    <Text variant="footnote" numberOfLines={1} style={{ color: colors.mutedForeground }}>
      <Text
        variant="footnote"
        style={{ color: location ? colors.mutedForeground : colors.warningOnSubtle }}
      >
        {location ?? 'No location'}
      </Text>
      {'  ·  '}
      <Text variant="footnote" style={{ color: toneColor[tone] }}>
        {engineStatusLabel(motor)}
      </Text>
    </Text>
  );
}

export const EngineCatalogRow = memo(function EngineCatalogRow({
  motor,
  position,
  onPress,
  actions,
}: {
  motor: MotorEntity;
  position: CatalogRowPosition;
  onPress: (motorId: string) => void;
  actions: EngineCatalogActions;
}) {
  const { can } = useSession();
  const { colors } = useTheme();
  const { openLift, activeMotorId } = useEnginesLift();
  const rowRef = useRef<View>(null);
  const lifted = activeMotorId === motor.id;
  const motorId = motor.id;
  const label = engineUnitLabel(motor);

  const sold = Boolean(motor.soldDate) || motor.status === 'sold';
  const canRelocate = can('inventory_edit') && !sold;
  const canAddToOrder = can('work_orders_edit') && !sold;
  const canSell = can('accounting_edit') && !sold && motor.status !== 'installed';

  const openRow = useCallback(() => {
    onPress(motorId);
  }, [motorId, onPress]);

  const copySerial = useCallback(async () => {
    await Clipboard.setStringAsync(label);
    toast({ title: `${label} copied`, variant: 'success' });
  }, [label]);

  const openLiftMenu = useCallback(() => {
    const node = rowRef.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      haptics.medium();

      const items: IosLiftMenuItem[] = [
        {
          label: 'Open',
          systemImage: 'arrow.up.right.square' satisfies SFSymbol,
          onPress: openRow,
        },
        {
          label: 'Copy serial',
          systemImage: 'doc.on.doc' satisfies SFSymbol,
          onPress: () => void copySerial(),
        },
      ];
      if (canRelocate) {
        items.push({
          label: 'Relocate',
          systemImage: 'mappin.and.ellipse' satisfies SFSymbol,
          onPress: () => actions.onRelocate(motor),
        });
      }
      if (canAddToOrder) {
        items.push({
          label: 'Add to order',
          systemImage: 'plus.circle' satisfies SFSymbol,
          onPress: () => actions.onAddToOrder(motor),
        });
      }
      if (canSell) {
        items.push({
          label: 'Sell',
          systemImage: 'dollarsign.circle' satisfies SFSymbol,
          onPress: () => actions.onSell(motor),
        });
      }

      openLift({
        motorId,
        anchor: { x, y, width, height },
        previewStyle: {
          borderRadius: eng.cardRadius,
          backgroundColor: colors.card,
        },
        items,
        preview: (
          <CatalogRow
            position="only"
            preview
            title={label}
            monoTitle
            subtitle={<UnitSubtitle motor={motor} />}
            trailing={<EngineQualityChip motor={motor} />}
            leading={<EngineThumbnail url={engineThumbnailUrl(motor)} />}
            leadingWidth={ENGINE_THUMB_SIZE}
            accessibilityLabel={label}
            onPress={() => undefined}
          />
        ),
      });
    });
  }, [
    actions,
    canAddToOrder,
    canRelocate,
    canSell,
    colors.card,
    copySerial,
    label,
    motor,
    motorId,
    openLift,
    openRow,
  ]);

  return (
    <CatalogRow
      ref={rowRef}
      position={position}
      title={label}
      monoTitle
      subtitle={<UnitSubtitle motor={motor} />}
      trailing={<EngineQualityChip motor={motor} />}
      leading={<EngineThumbnail url={engineThumbnailUrl(motor)} />}
      leadingWidth={ENGINE_THUMB_SIZE}
      lifted={lifted}
      accessibilityLabel={[
        label,
        engineVariantTitle(motor),
        engineUnitLocation(motor) ?? 'no location',
        engineStatusLabel(motor),
        `quality ${engineQualityLabel(motor)}`,
      ].join(', ')}
      onPress={openRow}
      onLongPress={openLiftMenu}
    />
  );
});
