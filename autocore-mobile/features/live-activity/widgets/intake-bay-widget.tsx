import {
  AccessoryWidgetBackground,
  Button,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  controlSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { IntakeBayWidgetProps } from '../lib/widget-model';

/**
 * "Intake Bay" — Ready / Active glance for the warehouse floor.
 *
 * Ranking (Ready → syncing photos → Active) lives in `widget-model.ts`.
 * This file only draws the family. Lock accessories stay uncolored.
 */
export type AutoCoreIntakeWidgetProps = IntakeBayWidgetProps;

const IntakeBayWidgetLayout = (
  props: AutoCoreIntakeWidgetProps,
  environment: WidgetEnvironment,
) => {
  'widget';

  const family = environment.widgetFamily;
  const isCircular = family === 'accessoryCircular';
  const isRectangular = family === 'accessoryRectangular';
  const isInline = family === 'accessoryInline';
  const isMedium = family === 'systemMedium';

  const num = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? String(value) : '—';

  const headline =
    typeof props.headline === 'string' && props.headline.length > 0 ? props.headline : '—';
  const title =
    typeof props.title === 'string' && props.title.length > 0 ? props.title : 'AutoCore';
  const detail = typeof props.detail === 'string' ? props.detail : '';
  const eyebrow =
    typeof props.eyebrow === 'string' && props.eyebrow.length > 0 ? props.eyebrow : 'Intake';
  const readyLabel =
    typeof props.readyLabel === 'string' && props.readyLabel.length > 0
      ? props.readyLabel
      : 'Ready';
  const activeLabel =
    typeof props.activeLabel === 'string' && props.activeLabel.length > 0
      ? props.activeLabel
      : 'Active';
  const openReadyLabel =
    typeof props.openReadyLabel === 'string' && props.openReadyLabel.length > 0
      ? props.openReadyLabel
      : 'Open Ready';
  const continueLabel =
    typeof props.continueLabel === 'string' && props.continueLabel.length > 0
      ? props.continueLabel
      : 'Continue intake';
  const symbol =
    typeof props.symbol === 'string' && props.symbol.length > 0
      ? props.symbol
      : 'camera.fill';
  const accent =
    typeof props.accent === 'string' && props.accent.length > 0 ? props.accent : '#0A84FF';
  const link =
    typeof props.link === 'string' && props.link.length > 0
      ? props.link
      : 'autocoremobile://intake';
  const ready = typeof props.ready === 'number' ? props.ready : -1;
  const updatedAtMs =
    typeof props.updatedAtMs === 'number' && props.updatedAtMs > 0 ? props.updatedAtMs : 0;
  const showReadyAction = ready > 0;

  if (isInline) {
    return <Text modifiers={[widgetURL(link)]}>{title}</Text>;
  }

  if (isCircular) {
    return (
      <ZStack modifiers={[widgetURL(link)]}>
        <AccessoryWidgetBackground />
        <VStack spacing={0}>
          <Image systemName={symbol} size={12} />
          <Text
            modifiers={[
              font({ size: 15, weight: 'semibold' }),
              monospacedDigit(),
              lineLimit(1),
              minimumScaleFactor(0.5),
            ]}
          >
            {headline}
          </Text>
        </VStack>
      </ZStack>
    );
  }

  if (isRectangular) {
    return (
      <VStack alignment="leading" spacing={2} modifiers={[widgetURL(link)]}>
        <HStack spacing={4}>
          <Image systemName={symbol} size={11} />
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), lineLimit(1)]}>
            {eyebrow}
          </Text>
          <Spacer />
        </HStack>
        <Text
          modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1), minimumScaleFactor(0.7)]}
        >
          {title}
        </Text>
        <Text modifiers={[font({ size: 12 }), lineLimit(1), minimumScaleFactor(0.8)]}>
          {`${num(props.ready)} ${readyLabel} · ${num(props.active)} ${activeLabel}`}
        </Text>
      </VStack>
    );
  }

  const cell = (
    label: string,
    value: string,
    glyph: 'checkmark.seal.fill' | 'camera.fill',
    tintColor: string,
  ) => (
    <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 999 })]}>
      <Image systemName={glyph} color={tintColor} size={13} />
      <Text
        modifiers={[
          font({ size: 22, weight: 'semibold', design: 'rounded' }),
          foregroundStyle('#FFFFFF'),
          monospacedDigit(),
          lineLimit(1),
          minimumScaleFactor(0.6),
        ]}
      >
        {value}
      </Text>
      <Text
        modifiers={[
          font({ size: 11, weight: 'medium' }),
          foregroundStyle('#8E8E93'),
          lineLimit(1),
        ]}
      >
        {label}
      </Text>
    </VStack>
  );

  if (isMedium) {
    return (
      <VStack
        alignment="leading"
        spacing={12}
        modifiers={[
          containerBackground('#0E0F13', 'widget'),
          padding({ all: 12 }),
          widgetURL(link),
        ]}
      >
        <HStack spacing={6}>
          <Image systemName={symbol} color={accent} size={13} />
          <Text
            modifiers={[
              font({ size: 13, weight: 'semibold' }),
              foregroundStyle('#FFFFFF'),
              lineLimit(1),
              minimumScaleFactor(0.8),
            ]}
          >
            {title}
          </Text>
          <Spacer />
          {updatedAtMs > 0 ? (
            <Text
              date={new Date(updatedAtMs)}
              dateStyle="relative"
              modifiers={[font({ size: 10 }), foregroundStyle('#6E6E73'), lineLimit(1)]}
            />
          ) : null}
        </HStack>

        <HStack spacing={14} alignment="top">
          {cell(readyLabel, num(props.ready), 'checkmark.seal.fill', '#30D158')}
          {cell(activeLabel, num(props.active), 'camera.fill', '#0A84FF')}
        </HStack>

        <Button
          label={showReadyAction ? openReadyLabel : continueLabel}
          systemImage={showReadyAction ? 'checkmark.seal.fill' : 'camera.fill'}
          target={showReadyAction ? 'openReady' : 'continueIntake'}
          modifiers={[buttonStyle('bordered'), controlSize('mini')]}
        />
      </VStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[
        containerBackground('#0E0F13', 'widget'),
        padding({ all: 12 }),
        widgetURL(link),
      ]}
    >
      <HStack spacing={6}>
        <Image systemName={symbol} color={accent} size={14} />
        <Text
          modifiers={[
            font({ size: 12, weight: 'medium' }),
            foregroundStyle(accent),
            lineLimit(1),
          ]}
        >
          {eyebrow}
        </Text>
        <Spacer />
      </HStack>

      <Spacer />

      <Text
        modifiers={[
          font({ size: 28, weight: 'semibold', design: 'rounded' }),
          foregroundStyle('#FFFFFF'),
          monospacedDigit(),
          lineLimit(1),
          minimumScaleFactor(0.5),
        ]}
      >
        {headline}
      </Text>
      <Text
        modifiers={[
          font({ size: 13, weight: 'medium' }),
          foregroundStyle('#EBEBF5'),
          lineLimit(2),
          minimumScaleFactor(0.8),
        ]}
      >
        {title}
      </Text>

      <Spacer />

      <Text
        modifiers={[
          font({ size: 11 }),
          foregroundStyle('#8E8E93'),
          lineLimit(1),
          minimumScaleFactor(0.8),
        ]}
      >
        {detail.length > 0 ? detail : `${num(props.ready)} ${readyLabel}`}
      </Text>

      <Button
        label={showReadyAction ? openReadyLabel : continueLabel}
        systemImage={showReadyAction ? 'checkmark.seal.fill' : 'camera.fill'}
        target={showReadyAction ? 'openReady' : 'continueIntake'}
        modifiers={[buttonStyle('bordered'), controlSize('mini'), padding({ top: 6 })]}
      />
    </VStack>
  );
};

export const AutoCoreIntakeWidget = createWidget<AutoCoreIntakeWidgetProps>(
  'AutoCoreIntake',
  IntakeBayWidgetLayout,
);
