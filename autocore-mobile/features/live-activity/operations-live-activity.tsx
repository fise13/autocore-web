import { HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type OperationsLiveActivityProps = {
  mode: 'offline' | 'syncing' | 'failed';
  title: string;
  detail: string;
  count: number;
};

function systemIcon(
  mode: OperationsLiveActivityProps['mode'],
): 'wifi.slash' | 'exclamationmark.triangle.fill' | 'arrow.triangle.2.circlepath' {
  if (mode === 'offline') return 'wifi.slash';
  if (mode === 'failed') return 'exclamationmark.triangle.fill';
  return 'arrow.triangle.2.circlepath';
}

function accentFor(
  mode: OperationsLiveActivityProps['mode'],
  isLuminanceReduced: boolean,
): string {
  if (isLuminanceReduced) return '#FFFFFF';
  if (mode === 'failed') return '#FF6166';
  if (mode === 'offline') return '#A8ACB8';
  return '#2DD4BF';
}

/**
 * Real iOS Live Activity — Lock Screen banner + Dynamic Island.
 * Keep the tree simple: HStack + Text/Image only. Blank black pills happen when
 * the widget JS fails to paint content; tint + white ink keep chrome readable.
 */
const OperationsLiveActivityLayout = (
  props: OperationsLiveActivityProps,
  environment: LiveActivityEnvironment,
) => {
  'widget';
  const accent = accentFor(props.mode, Boolean(environment.isLuminanceReduced));
  const icon = systemIcon(props.mode);
  const title = props.title?.trim() || 'AutoCore';
  const detail = props.detail?.trim() || 'Intake sync';
  const countLabel = props.count > 0 ? String(props.count) : '';
  const trailing =
    countLabel ||
    (props.mode === 'offline' ? 'Off' : props.mode === 'failed' ? '!' : '…');

  return {
    banner: (
      <HStack
        spacing={12}
        modifiers={[padding({ all: 14 }), activityBackgroundTint('#2C2C2E')]}
      >
        <Image systemName={icon} color={accent} size={26} />
        <VStack spacing={2}>
          <Text modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle('#FFFFFF')]}>
            {title}
          </Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle('#C7C7CC')]}>{detail}</Text>
        </VStack>
      </HStack>
    ),
    compactLeading: <Image systemName={icon} color={accent} size={16} />,
    compactTrailing: (
      <Text modifiers={[font({ weight: 'semibold', size: 14 }), foregroundStyle('#FFFFFF')]}>
        {trailing}
      </Text>
    ),
    minimal: <Image systemName={icon} color={accent} size={14} />,
    expandedLeading: (
      <VStack spacing={4} modifiers={[padding({ all: 10 })]}>
        <Image systemName={icon} color={accent} size={20} />
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#C7C7CC')]}>AutoCore</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack spacing={2} modifiers={[padding({ all: 10 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 22 }), foregroundStyle('#FFFFFF')]}>
          {countLabel || '—'}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#C7C7CC')]}>
          {props.mode === 'offline' ? 'queued' : props.mode === 'failed' ? 'failed' : 'pending'}
        </Text>
      </VStack>
    ),
    expandedCenter: (
      <Text modifiers={[font({ weight: 'semibold', size: 15 }), foregroundStyle('#FFFFFF')]}>
        {title}
      </Text>
    ),
    expandedBottom: (
      <VStack modifiers={[padding({ horizontal: 12, bottom: 12 })]}>
        <Text modifiers={[font({ size: 13 }), foregroundStyle('#C7C7CC')]}>{detail}</Text>
      </VStack>
    ),
  };
};

export const OperationsLiveActivity = createLiveActivity(
  'OperationsLiveActivity',
  OperationsLiveActivityLayout,
);
