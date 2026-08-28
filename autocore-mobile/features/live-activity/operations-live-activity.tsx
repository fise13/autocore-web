import {
  Capsule,
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import type { LiveActivityProps } from './lib/live-activity-model';

/**
 * Keep EVERYTHING the widget needs inside the `'widget'` function.
 * Babel stringifies only that function body into App Group storage — helpers,
 * constants and imports declared outside are `undefined` in the widget
 * JSContext and yield a blank black Island. Only `@expo/ui/swift-ui` components
 * and modifiers exist there, because the bundle assigns those onto globalThis.
 *
 * Accents, SF Symbols and copy arrive as props from `lib/live-activity-model.ts`.
 *
 * After editing this file: device Release rebuild (`npm run ios:release`).
 */
export type OperationsLiveActivityProps = LiveActivityProps;

/** Bumped when Island layout changes — logged at boot to confirm the binary. */
export const OPERATIONS_LIVE_ACTIVITY_LAYOUT_BUILD = 'island-v10-20260827';

const OperationsLiveActivityLayout = (
  props: OperationsLiveActivityProps,
  environment: LiveActivityEnvironment,
) => {
  'widget';

  const dimmed = Boolean(environment.isLuminanceReduced);
  const compactFamily = environment.activityFamily === 'small';

  const rawAccent =
    typeof props.accent === 'string' && props.accent.length > 0 ? props.accent : '#0A84FF';
  const accent = dimmed ? '#EBEBF5' : rawAccent;
  const symbol =
    typeof props.symbol === 'string' && props.symbol.length > 0
      ? props.symbol
      : 'arrow.triangle.2.circlepath';
  const headline =
    typeof props.headline === 'string' && props.headline.length > 0 ? props.headline : '—';
  // `mode` gates the label because ActivityKit can restore an activity started
  // by an older binary, and those payloads carry the abandoned session copy
  // ("Documenting", an engine serial). Rendering a stale sentence next to a
  // live count is worse than rendering no label at all.
  const title =
    props.mode === 'sync' && typeof props.title === 'string' && props.title.length > 0
      ? props.title
      : 'Engine photos';
  const progress =
    typeof props.progress === 'number' && Number.isFinite(props.progress)
      ? Math.max(0, Math.min(1, props.progress))
      : 0;
  const determinate = Boolean(props.determinate);

  // Secondary, never the accent: the label names the subject and the numeral
  // is the news, so only one of them gets colour. It brightens on the
  // Always-On display for the same reason the accent does — the system has
  // already pulled the whole frame down by then.
  const labelColor = dimmed ? '#C7C7CC' : '#98989F';

  const statusGlyph = (glyphSize: number) => (
    <Image systemName={symbol} color={accent} size={glyphSize} />
  );

  const numeral = (size: number) => (
    <Text
      modifiers={[
        font({ weight: 'semibold', size, design: 'rounded' }),
        foregroundStyle(accent),
        monospacedDigit(),
        lineLimit(1),
        minimumScaleFactor(0.7),
      ]}
    >
      {headline}
    </Text>
  );

  const label = (size: number) => (
    <Text
      modifiers={[
        font({ weight: 'medium', size }),
        foregroundStyle(labelColor),
        lineLimit(1),
        minimumScaleFactor(0.8),
      ]}
    >
      {title}
    </Text>
  );

  // A restored payload from an older binary can arrive with no total to
  // measure. The flat track keeps the row occupied rather than collapsing the
  // frame to a blank strip.
  const progressBar = determinate ? (
    <ProgressView value={progress} modifiers={[tint(accent), frame({ maxWidth: 999 })]} />
  ) : (
    <Capsule modifiers={[frame({ maxWidth: 999, height: 3 }), foregroundStyle('#2C2C2E')]} />
  );

  return {
    // Lock Screen. The only surface with room to say what was counted, so it is
    // the one that does: subject on the left, count on the right, bar beneath.
    banner: (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[padding({ horizontal: 16, top: 14, bottom: 14 })]}
      >
        <HStack spacing={8}>
          {statusGlyph(15)}
          {label(14)}
          <Spacer />
          {numeral(20)}
        </HStack>
        {compactFamily ? null : progressBar}
      </VStack>
    ),

    bannerSmall: (
      <HStack spacing={10} modifiers={[padding({ horizontal: 12, vertical: 10 })]}>
        {statusGlyph(14)}
        <Spacer />
        {numeral(16)}
      </HStack>
    ),

    compactLeading: (
      <HStack modifiers={[padding({ leading: 2 })]}>{statusGlyph(14)}</HStack>
    ),
    compactTrailing: (
      <HStack modifiers={[padding({ trailing: 2 })]}>{numeral(14)}</HStack>
    ),

    // Two activities are sharing the Island — this is roughly a 20pt circle.
    // `3/8` was being squeezed through minimumScaleFactor into a smear; the
    // glyph is the only thing that survives at this size.
    minimal: statusGlyph(13),

    expandedLeading: (
      <VStack modifiers={[padding({ leading: 14, vertical: 10 })]}>{statusGlyph(18)}</VStack>
    ),
    // The centre used to repeat the trailing numeral, so a long press showed
    // the same `3/8` twice side by side. It carries the subject now, which is
    // the one thing the expanded view was missing.
    expandedCenter: (
      <VStack alignment="leading" spacing={0} modifiers={[padding({ vertical: 10 })]}>
        {label(13)}
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" modifiers={[padding({ trailing: 14, vertical: 10 })]}>
        {numeral(18)}
      </VStack>
    ),
    expandedBottom: (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[padding({ horizontal: 14, bottom: 12, top: 2 })]}
      >
        {progressBar}
      </VStack>
    ),
  };
};

export const OperationsLiveActivity = createLiveActivity(
  'OperationsLiveActivity',
  OperationsLiveActivityLayout,
);
