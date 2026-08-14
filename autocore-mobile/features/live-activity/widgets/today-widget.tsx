import {
  AccessoryWidgetBackground,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  containerBackground,
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

import type { TodayWidgetProps, TodayWidgetSymbol } from '../lib/widget-model';

/**
 * "Today at the shop" — the glanceable state of the floor.
 *
 * Ranking lives in `lib/widget-model.ts`, not here: the widget gets one line,
 * and which line it is has to be testable. This file only decides how each
 * family draws it.
 *
 * A count the app has never loaded arrives as `-1` and renders `—`. That
 * matters more than it looks: a widget confidently showing "0 open orders"
 * because a listener had not warmed up yet is worse than showing nothing.
 */
export type AutoCoreTodayWidgetProps = TodayWidgetProps;

const TodayWidgetLayout = (props: AutoCoreTodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const family = environment.widgetFamily;
  const isCircular = family === 'accessoryCircular';
  const isRectangular = family === 'accessoryRectangular';
  const isInline = family === 'accessoryInline';
  const isMedium = family === 'systemMedium';
  const isLarge = family === 'systemLarge';

  const num = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? String(value) : '—';

  const headline =
    typeof props.headline === 'string' && props.headline.length > 0 ? props.headline : '—';
  const title = typeof props.title === 'string' && props.title.length > 0 ? props.title : 'AutoCore';
  const detail = typeof props.detail === 'string' ? props.detail : '';
  const eyebrow =
    typeof props.eyebrow === 'string' && props.eyebrow.length > 0
      ? props.eyebrow
      : Boolean(props.urgent)
        ? 'Needs you'
        : 'Today';
  const ordersLabel =
    typeof props.ordersLabel === 'string' && props.ordersLabel.length > 0
      ? props.ordersLabel
      : 'Open orders';
  const placeLabel =
    typeof props.placeLabel === 'string' && props.placeLabel.length > 0
      ? props.placeLabel
      : 'To place';
  const enginesLabel =
    typeof props.enginesLabel === 'string' && props.enginesLabel.length > 0
      ? props.enginesLabel
      : 'Engines';
  const symbol =
    typeof props.symbol === 'string' && props.symbol.length > 0
      ? props.symbol
      : 'wrench.and.screwdriver.fill';
  const accent =
    typeof props.accent === 'string' && props.accent.length > 0 ? props.accent : '#0A84FF';
  const urgent = Boolean(props.urgent);
  const updatedAtMs =
    typeof props.updatedAtMs === 'number' && props.updatedAtMs > 0 ? props.updatedAtMs : 0;
  const link =
    typeof props.link === 'string' && props.link.length > 0
      ? props.link
      : 'autocoremobile://work';

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
          {detail.length > 0 ? detail : `${num(props.engines)} ${enginesLabel}`}
        </Text>
      </VStack>
    );
  }

  const cell = (label: string, value: string, glyph: TodayWidgetSymbol, tintColor: string) => (
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
          lineLimit(2),
          minimumScaleFactor(0.8),
        ]}
      >
        {label}
      </Text>
    </VStack>
  );

  const header = (
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
  );

  const stats = (
    <HStack spacing={14} alignment="top">
      {cell(ordersLabel, num(props.openOrders), 'wrench.and.screwdriver.fill', '#0A84FF')}
      {cell(placeLabel, num(props.awaitingPlacement), 'shippingbox.fill', '#FF9F0A')}
      {cell(enginesLabel, num(props.engines), 'engine.combustion.fill', '#30D158')}
    </HStack>
  );

  if (isMedium || isLarge) {
    return (
      <VStack
        alignment="leading"
        spacing={isLarge ? 16 : 12}
        modifiers={[
          containerBackground('#0E0F13', 'widget'),
          padding({ all: isLarge ? 16 : 12 }),
          widgetURL(link),
        ]}
      >
        {header}
        {isLarge ? (
          <Text
            modifiers={[
              font({ size: 15, weight: 'medium' }),
              foregroundStyle('#EBEBF5'),
              lineLimit(2),
              minimumScaleFactor(0.8),
            ]}
          >
            {detail.length > 0 ? detail : eyebrow}
          </Text>
        ) : null}
        {stats}
        {isLarge ? (
          <Text
            modifiers={[
              font({ size: 12, weight: 'medium' }),
              foregroundStyle('#8E8E93'),
              lineLimit(1),
            ]}
          >
            {urgent ? eyebrow : enginesLabel}
          </Text>
        ) : null}
        <Spacer />
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
        {detail.length > 0 ? detail : `${num(props.engines)} ${enginesLabel}`}
      </Text>
    </VStack>
  );
};

export const AutoCoreTodayWidget = createWidget<AutoCoreTodayWidgetProps>(
  'AutoCoreToday',
  TodayWidgetLayout,
);
