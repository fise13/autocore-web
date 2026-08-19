import { memo, useCallback, useRef, type Ref } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SFSymbol } from 'sf-symbols-typescript';
import * as Clipboard from 'expo-clipboard';

import { Text, toast, type CatalogRowPosition, type IosLiftMenuItem } from '@/components/ui';
import { useMotion, useSession, useTheme } from '@/hooks';
import { fontFamily, haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import type { MotorEntity } from '@/types/motor';

import { ENGINE_THUMB_SIZE, EngineThumbnail } from './engine-thumbnail';
import { EngineQualityChip } from './engine-quality-chip';
import { useEnginesLift } from './engines-lift-provider';
import { eng, engFontCap, engType } from '../layout';
import { engineQualityLabel } from '../lib/engine-quality';
import {
  engineStatusLabel,
  engineThumbnailUrl,
  engineUnitLabel,
  engineUnitLocation,
  engineVariantTitle,
} from '../lib/engine-variants';

export type EngineCatalogActions = {
  onRelocate: (motor: MotorEntity) => void;
  onAddToOrder: (motor: MotorEntity) => void;
  onSell: (motor: MotorEntity) => void;
};

function UnitMeta({ motor }: { motor: MotorEntity }) {
  const { colors } = useTheme();
  const location = engineUnitLocation(motor);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: eng.tight, minWidth: 0 }}
    >
      <Text variant="footnote" numberOfLines={1} style={{ color: colors.mutedForeground }}>
        {engineStatusLabel(motor)}
      </Text>
      <View style={{ width: eng.rule, height: 10, backgroundColor: colors.border }} />
      {location ? (
        <Text
          variant="footnote"
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: colors.mutedForeground,
            fontVariant: ['tabular-nums'],
          }}
        >
          {location}
        </Text>
      ) : (
        <Text variant="footnote" numberOfLines={1} style={{ color: colors.warningOnSubtle }}>
          No shelf
        </Text>
      )}
    </View>
  );
}

function EngineRowFace({
  motor,
  onPress,
  onLongPress,
  lifted,
  preview,
  rowRef,
}: {
  motor: MotorEntity;
  onPress: () => void;
  onLongPress?: () => void;
  lifted?: boolean;
  preview?: boolean;
  rowRef?: Ref<View>;
}) {
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const press = useSharedValue(0);
  const pressedFill = withAlpha(colors.muted, isDark ? 0.55 : 0.85);
  const label = engineUnitLabel(motor);

  const pressStyle = useAnimatedStyle(() => {
    if (motion.reduced) {
      return { backgroundColor: press.value > 0.5 ? pressedFill : 'transparent' };
    }
    return {
      backgroundColor: interpolateColor(press.value, [0, 1], ['transparent', pressedFill]),
    };
  });

  const setPressed = (next: number) => {
    press.value = withTiming(next, { duration: motion.reduced ? 80 : motion.duration.fast });
  };

  return (
    <View
      ref={rowRef}
      collapsable={false}
      style={{
        opacity: lifted ? 0 : 1,
        backgroundColor: preview ? colors.card : 'transparent',
        borderRadius: preview ? eng.cardRadius : 0,
        borderWidth: preview ? eng.rule : 0,
        borderColor: preview ? colors.border : 'transparent',
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          label,
          engineVariantTitle(motor),
          engineUnitLocation(motor) ?? 'no location',
          engineStatusLabel(motor),
          `quality ${engineQualityLabel(motor)}`,
        ].join(', ')}
        delayLongPress={Platform.OS === 'ios' ? 380 : 450}
        onPressIn={() => setPressed(1)}
        onPressOut={() => setPressed(0)}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        onLongPress={onLongPress}
      >
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: eng.stack,
              paddingHorizontal: preview ? eng.stack : eng.pad,
              paddingVertical: eng.stack,
              minHeight: 76,
            },
            pressStyle,
          ]}
        >
          <EngineThumbnail url={engineThumbnailUrl(motor)} />

          <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
            <Text
              variant="identifier"
              numberOfLines={1}
              maxFontSizeMultiplier={engFontCap.serial}
              style={{
                ...engType.rowTitle,
                fontFamily: fontFamily.mono,
                color: colors.foreground,
                letterSpacing: -0.3,
              }}
            >
              {label}
            </Text>
            <UnitMeta motor={motor} />
          </View>

          <EngineQualityChip motor={motor} />
        </Animated.View>
      </Pressable>

      {preview ? null : (
        <View
          style={{
            height: eng.rule,
            marginLeft: eng.pad + ENGINE_THUMB_SIZE + eng.stack,
            backgroundColor: colors.border,
          }}
        />
      )}
    </View>
  );
}

export const EngineCatalogRow = memo(function EngineCatalogRow({
  motor,
  position: _position,
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

  const sold = Boolean(motor.soldDate) || motor.status === 'sold';
  const canRelocate = can('inventory_edit') && !sold;
  const canAddToOrder = can('work_orders_edit') && !sold;
  const canSell = can('accounting_edit') && !sold && motor.status !== 'installed';

  const copySerial = useCallback(async () => {
    const serial = engineUnitLabel(motor);
    await Clipboard.setStringAsync(serial);
    toast({ title: `${serial} copied`, variant: 'success' });
  }, [motor]);

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
          onPress: () => onPress(motor.id),
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
        motorId: motor.id,
        anchor: { x, y, width, height },
        previewStyle: {
          borderRadius: eng.cardRadius,
          backgroundColor: colors.card,
        },
        items,
        preview: (
          <EngineRowFace
            motor={motor}
            preview
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
    motor,
    onPress,
    openLift,
  ]);

  return (
    <EngineRowFace
      motor={motor}
      rowRef={rowRef}
      lifted={lifted}
      onPress={() => onPress(motor.id)}
      onLongPress={openLiftMenu}
    />
  );
});
