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
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { ScanWidgetProps } from '../lib/widget-model';

/**
 * Scan — a camera CTA, not a report.
 *
 * Home small is the action. Lock circular is the to-place count (or a bare
 * barcode when the floor is clear). Colour is Home-only.
 */
export type AutoCoreScanWidgetProps = ScanWidgetProps;

const ScanWidgetLayout = (props: AutoCoreScanWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const family = environment.widgetFamily;
  const isCircular = family === 'accessoryCircular';
  const isInline = family === 'accessoryInline';

  const headline = typeof props.headline === 'string' ? props.headline : '';
  const title =
    typeof props.title === 'string' && props.title.length > 0 ? props.title : 'Scan in';
  const detail =
    typeof props.detail === 'string' && props.detail.length > 0 ? props.detail : 'Open camera';
  const eyebrow =
    typeof props.eyebrow === 'string' && props.eyebrow.length > 0 ? props.eyebrow : 'Scan';
  const actionLabel =
    typeof props.actionLabel === 'string' && props.actionLabel.length > 0
      ? props.actionLabel
      : 'Scan in';
  const symbol =
    typeof props.symbol === 'string' && props.symbol.length > 0
      ? props.symbol
      : 'barcode.viewfinder';
  const accent =
    typeof props.accent === 'string' && props.accent.length > 0 ? props.accent : '#0A84FF';
  const link =
    typeof props.link === 'string' && props.link.length > 0
      ? props.link
      : 'autocoremobile://scan';
  const urgent = Boolean(props.urgent);
  const updatedAtMs =
    typeof props.updatedAtMs === 'number' && props.updatedAtMs > 0 ? props.updatedAtMs : 0;
  const badge = headline.length > 0 && headline !== '—' ? headline : '';

  if (isInline) {
    return <Text modifiers={[widgetURL(link)]}>{badge.length > 0 ? `${title} · ${badge}` : title}</Text>;
  }

  if (isCircular) {
    return (
      <ZStack modifiers={[widgetURL(link)]}>
        <AccessoryWidgetBackground />
        <VStack spacing={0}>
          <Image systemName={symbol} size={12} />
          {badge.length > 0 ? (
            <Text
              modifiers={[
                font({ size: 15, weight: 'semibold' }),
                monospacedDigit(),
                lineLimit(1),
                minimumScaleFactor(0.5),
              ]}
            >
              {badge}
            </Text>
          ) : null}
        </VStack>
      </ZStack>
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
        {updatedAtMs > 0 ? (
          <Text
            date={new Date(updatedAtMs)}
            dateStyle="relative"
            modifiers={[font({ size: 10 }), foregroundStyle('#6E6E73'), lineLimit(1)]}
          />
        ) : null}
      </HStack>

      <Spacer />

      {urgent && badge.length > 0 ? (
        <Text
          modifiers={[
            font({ size: 28, weight: 'semibold', design: 'rounded' }),
            foregroundStyle('#FFFFFF'),
            monospacedDigit(),
            lineLimit(1),
            minimumScaleFactor(0.5),
          ]}
        >
          {badge}
        </Text>
      ) : (
        <Image systemName="barcode.viewfinder" color={accent} size={28} />
      )}

      <Text
        modifiers={[
          font({ size: 15, weight: 'semibold' }),
          foregroundStyle('#FFFFFF'),
          lineLimit(1),
          minimumScaleFactor(0.8),
        ]}
      >
        {title}
      </Text>
      <Text
        modifiers={[
          font({ size: 12, weight: 'medium' }),
          foregroundStyle('#8E8E93'),
          lineLimit(2),
          minimumScaleFactor(0.8),
        ]}
      >
        {detail}
      </Text>

      <Spacer />

      <Button
        label={actionLabel}
        systemImage="barcode.viewfinder"
        target="openScan"
        modifiers={[buttonStyle('bordered'), controlSize('mini'), padding({ top: 4 })]}
      />
    </VStack>
  );
};

export const AutoCoreScanWidget = createWidget<AutoCoreScanWidgetProps>(
  'AutoCoreScan',
  ScanWidgetLayout,
);
