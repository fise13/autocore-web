import {
  AccessoryWidgetBackground,
  Gauge,
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
  gaugeStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { SyncWidgetProps } from '../lib/widget-model';

/**
 * "Intake Sync" — Lock Screen and Home Screen widget.
 *
 * Same `'widget'` rules as the Live Activity: the function body is stringified
 * on its own, so nothing from module scope is visible at runtime and every
 * value it renders has to arrive through `props`.
 *
 * WidgetKit refreshes on its own schedule, so this surface is always a little
 * behind. It says so — `updatedAtMs` drives a relative timestamp rather than
 * letting a stale number pass for a live one.
 */
export type AutoCoreSyncWidgetProps = SyncWidgetProps;

const SyncWidgetLayout = (props: AutoCoreSyncWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const family = environment.widgetFamily;
  // Lock Screen accessories render in `vibrant` mode: the system flattens
  // everything to a single tinted material and discards colour. Fighting that
  // with hex accents produces washed-out mush, so the accessory branches lean
  // on weight and glyphs instead.
  const isCircular = family === 'accessoryCircular';
  const isRectangular = family === 'accessoryRectangular';
  const isInline = family === 'accessoryInline';

  const status = typeof props.status === 'string' ? props.status : 'SYNCED';
  const title = typeof props.title === 'string' && props.title.length > 0 ? props.title : 'Synced';
  const detail = typeof props.detail === 'string' ? props.detail : '';
  const short = typeof props.short === 'string' && props.short.length > 0 ? props.short : '—';
  const caption = typeof props.caption === 'string' ? props.caption : 'photos';
  const symbol =
    typeof props.symbol === 'string' && props.symbol.length > 0
      ? props.symbol
      : 'checkmark.circle.fill';
  const accent =
    typeof props.accent === 'string' && props.accent.length > 0 ? props.accent : '#0A84FF';
  const progress =
    typeof props.progress === 'number' && Number.isFinite(props.progress)
      ? Math.max(0, Math.min(1, props.progress))
      : 0;
  const determinate = Boolean(props.determinate);
  const pending = typeof props.pending === 'number' ? props.pending : 0;
  const blocked = typeof props.blocked === 'number' ? props.blocked : 0;
  const updatedAtMs =
    typeof props.updatedAtMs === 'number' && props.updatedAtMs > 0 ? props.updatedAtMs : 0;

  const link = 'autocoremobile://intake';

  // ------------------------------------------------------- accessoryInline
  // One line, system font, no layout of its own. Anything richer is dropped.
  if (isInline) {
    const inlineText =
      blocked > 0
        ? `${blocked} photos blocked`
        : pending > 0
          ? `Syncing ${short}`
          : 'Intake synced';
    return <Text modifiers={[widgetURL(link)]}>{inlineText}</Text>;
  }

  // ----------------------------------------------------- accessoryCircular
  if (isCircular) {
    if (determinate) {
      return (
        <Gauge
          value={progress}
          min={0}
          max={1}
          currentValueLabel={
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), monospacedDigit()]}>
              {String(pending)}
            </Text>
          }
          modifiers={[gaugeStyle('circularCapacity'), widgetURL(link)]}
        />
      );
    }
    return (
      <ZStack modifiers={[widgetURL(link)]}>
        <AccessoryWidgetBackground />
        <VStack spacing={0}>
          <Image systemName={symbol} size={13} />
          <Text
            modifiers={[
              font({ size: 12, weight: 'semibold' }),
              monospacedDigit(),
              minimumScaleFactor(0.6),
              lineLimit(1),
            ]}
          >
            {blocked > 0 ? String(blocked) : pending > 0 ? String(pending) : '✓'}
          </Text>
        </VStack>
      </ZStack>
    );
  }

  // -------------------------------------------------- accessoryRectangular
  if (isRectangular) {
    return (
      <VStack alignment="leading" spacing={2} modifiers={[widgetURL(link)]}>
        <HStack spacing={4}>
          <Image systemName={symbol} size={11} />
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), lineLimit(1)]}>
            {caption}
          </Text>
          <Spacer />
        </HStack>
        <Text
          modifiers={[
            font({ size: 15, weight: 'semibold' }),
            lineLimit(1),
            minimumScaleFactor(0.7),
          ]}
        >
          {title}
        </Text>
        {determinate ? (
          <Gauge value={progress} min={0} max={1} modifiers={[gaugeStyle('linearCapacity')]} />
        ) : (
          <Text modifiers={[font({ size: 12 }), lineLimit(1), minimumScaleFactor(0.8)]}>
            {detail.length > 0 ? detail : 'Nothing waiting.'}
          </Text>
        )}
      </VStack>
    );
  }

  // ------------------------------------------------------------ systemSmall
  // Glyph + quiet fraction + one title line + optional bar. No ALL CAPS.
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
            foregroundStyle('#98989F'),
            lineLimit(1),
          ]}
        >
          {caption}
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
        {short}
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

      {determinate ? (
        <Gauge
          value={progress}
          min={0}
          max={1}
          modifiers={[gaugeStyle('linearCapacity'), tint(accent), frame({ maxWidth: 999 })]}
        />
      ) : (
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#8E8E93'), lineLimit(1)]}>
          {status === 'SYNCED' ? 'Everything is backed up' : detail}
        </Text>
      )}

      {updatedAtMs > 0 ? (
        <Text
          date={new Date(updatedAtMs)}
          dateStyle="relative"
          modifiers={[
            font({ size: 10 }),
            foregroundStyle('#6E6E73'),
            lineLimit(1),
            padding({ top: 2 }),
          ]}
        />
      ) : null}
    </VStack>
  );
};

export const AutoCoreSyncWidget = createWidget<AutoCoreSyncWidgetProps>(
  'AutoCoreSync',
  SyncWidgetLayout,
);
