import {
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { PayWidgetProps } from '../lib/widget-model';

/**
 * Pay — payouts waiting or jobs to claim. Home small only.
 *
 * Floor already surfaces pay as the hottest fact on the Lock Screen, so this
 * widget does not register lock families.
 */
export type AutoCorePayWidgetProps = PayWidgetProps;

const PayWidgetLayout = (props: AutoCorePayWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  void environment;

  const headline =
    typeof props.headline === 'string' && props.headline.length > 0 ? props.headline : '—';
  const title =
    typeof props.title === 'string' && props.title.length > 0 ? props.title : 'AutoCore';
  const detail = typeof props.detail === 'string' ? props.detail : '';
  const eyebrow =
    typeof props.eyebrow === 'string' && props.eyebrow.length > 0 ? props.eyebrow : 'Pay';
  const symbol =
    typeof props.symbol === 'string' && props.symbol.length > 0
      ? props.symbol
      : 'banknote.fill';
  const accent =
    typeof props.accent === 'string' && props.accent.length > 0 ? props.accent : '#FF9F0A';
  const link =
    typeof props.link === 'string' && props.link.length > 0
      ? props.link
      : 'autocoremobile://earnings';
  const updatedAtMs =
    typeof props.updatedAtMs === 'number' && props.updatedAtMs > 0 ? props.updatedAtMs : 0;

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
        {detail}
      </Text>
    </VStack>
  );
};

export const AutoCorePayWidget = createWidget<AutoCorePayWidgetProps>(
  'AutoCorePay',
  PayWidgetLayout,
);
