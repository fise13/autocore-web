import { memo, useCallback, useMemo, useRef } from 'react';
import { Platform, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import * as Clipboard from 'expo-clipboard';

import {
  CatalogRow,
  Progress,
  Text,
  toast,
  type CatalogRowPosition,
  type IosLiftMenuItem,
} from '@/components/ui';
import { useSession, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import type { MotorEntity } from '@/types/motor';
import type { JobPhotoSyncBar } from '@/features/engine-intake/lib/job-photo-sync-progress';

import { ENGINE_THUMB_SIZE, EngineThumbnail } from './engine-thumbnail';
import type {
  EngineCatalogActions,
  EngineIncomingActions,
} from './engines-list.types';
import { EngineQualityChip } from './engine-quality-chip';
import { useEnginesLift } from './engines-lift-provider';
import { eng } from '../layout';
import { engineQualityLabel } from '../lib/engine-quality';
import { isIncomingMotor } from '../lib/engine-lane';
import {
  engineRowActions,
  engineRowCapabilities,
  type EngineRowActionId,
} from '../lib/engine-row-actions';
import {
  engineStatusLabel,
  engineStatusTone,
  engineThumbnailUrl,
  engineUnitLabel,
  engineUnitLocation,
  engineVariantTitle,
  type EngineStatusTone,
} from '../lib/engine-variants';

// Declared once, in the list contract both renderers implement.
export type { EngineCatalogActions, EngineIncomingActions };

function UnitSubtitle({
  motor,
  uploadProgress,
}: {
  motor: MotorEntity;
  uploadProgress?: JobPhotoSyncBar | null;
}) {
  const { colors } = useTheme();
  const location = engineUnitLocation(motor);
  const tone = engineStatusTone(motor);
  const incoming = isIncomingMotor(motor);

  const toneColor: Record<EngineStatusTone, string> = {
    success: colors.successOnSubtle,
    warning: colors.warningOnSubtle,
    danger: colors.dangerOnSubtle,
    progress: colors.primary,
    muted: colors.mutedForeground,
  };

  return (
    <View style={{ gap: 4 }}>
      {incoming && uploadProgress ? null : (
        <Text variant="footnote" numberOfLines={1} style={{ color: colors.mutedForeground }}>
          {incoming ? (
            <Text variant="footnote" style={{ color: toneColor[tone] }}>
              {engineStatusLabel(motor)}
            </Text>
          ) : (
            <>
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
            </>
          )}
        </Text>
      )}
      {uploadProgress ? (
        <View style={{ gap: 3 }}>
          <Progress value={uploadProgress.ratio * 100} style={{ height: 3 }} />
          <Text variant="caption2" style={{ color: colors.primary, fontWeight: '600' }}>
            {uploadProgress.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export const EngineCatalogRow = memo(function EngineCatalogRow({
  motor,
  position,
  onPress,
  actions,
  incomingActions,
  uploadProgress = null,
  previewUri = null,
}: {
  motor: MotorEntity;
  position: CatalogRowPosition;
  onPress: (motorId: string) => void;
  actions: EngineCatalogActions;
  incomingActions?: EngineIncomingActions;
  uploadProgress?: JobPhotoSyncBar | null;
  previewUri?: string | null;
}) {
  const { can } = useSession();
  const { colors } = useTheme();
  const { openLift, activeMotorId } = useEnginesLift();
  const rowRef = useRef<View>(null);
  const lifted = activeMotorId === motor.id;
  const motorId = motor.id;
  const label = engineUnitLabel(motor);
  const incoming = isIncomingMotor(motor);

  // Capabilities and menu contents come from the shared resolver, so this row
  // and the native SwiftUI one in `engines-list.ios.tsx` cannot offer different
  // actions for the same engine.
  const capabilities = useMemo(
    () =>
      engineRowCapabilities(motor, {
        canInventoryEdit: can('inventory_edit'),
        canWorkOrdersEdit: can('work_orders_edit'),
        canAccountingEdit: can('accounting_edit'),
        canIntakeExecute: can('engine_intake_execute'),
        canIntakeVerify: can('engine_intake_verify'),
        hasIncomingHandlers: Boolean(incomingActions),
      }),
    [can, incomingActions, motor],
  );

  const openRow = useCallback(() => {
    onPress(motorId);
  }, [motorId, onPress]);

  const copySerial = useCallback(async () => {
    await Clipboard.setStringAsync(label);
    toast({ title: `${label} copied`, variant: 'success' });
  }, [label]);

  const thumbUrl = previewUri || engineThumbnailUrl(motor);

  const openLiftMenu = useCallback(() => {
    const node = rowRef.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      haptics.medium();

      const run: Record<EngineRowActionId, () => void> = {
        open: openRow,
        copySerial: () => void copySerial(),
        photograph: () => incomingActions?.onContinue(motor),
        accept: () => incomingActions?.onAccept(motor),
        edit: () => incomingActions?.onEdit(motor),
        cancel: () => incomingActions?.onCancel(motor),
        relocate: () => actions.onRelocate(motor),
        addToOrder: () => actions.onAddToOrder(motor),
        sell: () => actions.onSell(motor),
      };
      const items: IosLiftMenuItem[] = engineRowActions(capabilities).map((action) => ({
        label: action.label,
        systemImage: action.systemImage as SFSymbol,
        ...(action.destructive ? { destructive: true } : {}),
        onPress: run[action.id],
      }));

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
            subtitle={<UnitSubtitle motor={motor} uploadProgress={uploadProgress} />}
            trailing={incoming ? undefined : <EngineQualityChip motor={motor} />}
            leading={<EngineThumbnail url={thumbUrl} />}
            leadingWidth={ENGINE_THUMB_SIZE}
            accessibilityLabel={label}
            onPress={() => undefined}
          />
        ),
      });
    });
  }, [
    actions,
    capabilities,
    colors.card,
    copySerial,
    incoming,
    incomingActions,
    label,
    motor,
    motorId,
    openLift,
    openRow,
    thumbUrl,
    uploadProgress,
  ]);

  return (
    <CatalogRow
      ref={rowRef}
      position={position}
      title={label}
      monoTitle
      subtitle={<UnitSubtitle motor={motor} uploadProgress={uploadProgress} />}
      trailing={incoming ? undefined : <EngineQualityChip motor={motor} />}
      leading={<EngineThumbnail url={thumbUrl} />}
      leadingWidth={ENGINE_THUMB_SIZE}
      lifted={lifted}
      accessibilityLabel={[
        label,
        engineVariantTitle(motor),
        incoming
          ? (uploadProgress?.label ?? engineStatusLabel(motor))
          : (engineUnitLocation(motor) ?? 'no location'),
        incoming ? undefined : engineStatusLabel(motor),
        incoming ? undefined : `quality ${engineQualityLabel(motor)}`,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={openRow}
      onLongPress={Platform.OS === 'web' ? undefined : openLiftMenu}
    />
  );
});
