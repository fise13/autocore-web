import type { ReactNode } from 'react';
import {
  Capsule,
  Circle,
  Gauge,
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  opacity,
  padding,
  resizable,
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
 * This is also why status colours, SF Symbols and copy arrive as props from
 * `lib/live-activity-model.ts` rather than being decided here: the model is
 * testable, the widget is not.
 *
 * After editing this file: device Release rebuild (`npm run ios:release`).
 */
export type OperationsLiveActivityProps = LiveActivityProps;

/** Bumped when Island layout changes — logged at boot to confirm the binary. */
export const OPERATIONS_LIVE_ACTIVITY_LAYOUT_BUILD = 'island-v7-20260813';

const OperationsLiveActivityLayout = (
  props: OperationsLiveActivityProps,
  environment: LiveActivityEnvironment,
) => {
  'widget';

  // Always-On display: iOS asks for a dimmer, flatter frame. Colour is the first
  // thing to go — a red alert burning into an idle screen is worse than a grey one.
  const dimmed = Boolean(environment.isLuminanceReduced);
  // Apple Watch and remote devices render the `small` family, where the banner
  // is roughly a notification row. Anything multi-line gets truncated there.
  const compactFamily = environment.activityFamily === 'small';

  const status = typeof props.status === 'string' ? props.status : 'SYNCING';
  const rawAccent =
    typeof props.accent === 'string' && props.accent.length > 0 ? props.accent : '#0A84FF';
  const accent = dimmed ? '#EBEBF5' : rawAccent;
  const symbol =
    typeof props.symbol === 'string' && props.symbol.length > 0
      ? props.symbol
      : 'icloud.and.arrow.up.fill';
  const title =
    typeof props.title === 'string' && props.title.length > 0 ? props.title : 'Syncing photos';
  const detail = typeof props.detail === 'string' ? props.detail : '';
  const subject = typeof props.subject === 'string' ? props.subject : '';
  const headline =
    typeof props.headline === 'string' && props.headline.length > 0 ? props.headline : '—';
  const progress =
    typeof props.progress === 'number' && Number.isFinite(props.progress)
      ? Math.max(0, Math.min(1, props.progress))
      : 0;
  const determinate = Boolean(props.determinate);
  const retryAtMs =
    typeof props.retryAtMs === 'number' && Number.isFinite(props.retryAtMs) ? props.retryAtMs : 0;
  const iconUri = typeof props.iconUri === 'string' ? props.iconUri : '';
  const hasAppIcon = iconUri.length > 0;

  // A countdown only reads as a countdown while it is genuinely counting. Below
  // a second it flickers between "0" and "1", so fall back to static copy.
  const showsCountdown = status === 'RETRYING' && retryAtMs > 0;
  // Text(timerInterval:) renders `upper - now`; the lower bound only has to sit
  // in the past for the range to be valid. Retries never exceed ten minutes.
  const countdownRange = {
    lower: new Date(retryAtMs - 3_600_000),
    upper: new Date(retryAtMs),
  };

  const primaryText = '#FFFFFF';
  const secondaryText = dimmed ? '#D1D1D6' : '#98989F';
  // Pre-composited greys rather than runtime alpha: the Island composites over
  // true black, so a flat dark grey and a 12% white are indistinguishable —
  // except the flat one cannot wash out against a bright Lock Screen wallpaper.
  const trackColor = '#2C2C2E';

  // Prefer one quiet line — subject OR detail — so the subtitle never wraps
  // into a dashboard.
  const subtitle = subject.length > 0 ? subject : detail;

  // A framed, resizable image is mandatory: a bare `uiImage` stretches into a
  // grey bar inside the compact Island slot.
  const appIconAt = (size: number, radius: number) =>
    hasAppIcon ? (
      <Image
        uiImage={iconUri}
        modifiers={[resizable(), frame({ width: size, height: size }), cornerRadius(radius)]}
      />
    ) : (
      <Image systemName={symbol} color={accent} size={Math.round(size * 0.72)} />
    );

  /** Accent SF Symbol only — no tinted disc in the compact / minimal slots. */
  const statusGlyph = (glyphSize: number) => (
    <Image systemName={symbol} color={accent} size={glyphSize} />
  );

  /**
   * The progress ring. Only drawn when there is real progress to show — an
   * indeterminate ring parked at zero looks like a stalled upload.
   * Fraction lives inside the ring so expanded trailing can stay empty.
   */
  const progressRing = (diameter: number, inner: ReactNode) =>
    determinate ? (
      <ZStack modifiers={[frame({ width: diameter, height: diameter })]}>
        <Gauge
          value={progress}
          min={0}
          max={1}
          modifiers={[
            gaugeStyle('circularCapacity'),
            tint(accent),
            frame({ width: diameter, height: diameter }),
          ]}
        />
        {inner}
      </ZStack>
    ) : (
      <ZStack modifiers={[frame({ width: diameter, height: diameter })]}>
        <Circle
          modifiers={[
            frame({ width: diameter, height: diameter }),
            foregroundStyle(accent),
            opacity(dimmed ? 0.24 : 0.16),
          ]}
        />
        {inner}
      </ZStack>
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

  const countdown = (size: number) => (
    <Text
      timerInterval={countdownRange}
      countsDown
      modifiers={[
        font({ weight: 'semibold', size, design: 'rounded' }),
        foregroundStyle(accent),
        monospacedDigit(),
        lineLimit(1),
        minimumScaleFactor(0.6),
        frame({ maxWidth: 62, alignment: 'trailing' }),
      ]}
    />
  );

  const ringInner = showsCountdown ? (
    countdown(11)
  ) : determinate ? (
    numeral(11)
  ) : (
    <Image systemName={symbol} color={accent} size={16} />
  );

  /** Thin track only. Non-syncing states get a flat rail, not a spinner. */
  const progressBar = determinate ? (
    <ProgressView value={progress} modifiers={[tint(accent), frame({ maxWidth: 999 })]} />
  ) : status === 'SYNCING' ? (
    <ProgressView modifiers={[tint(accent), frame({ maxWidth: 999 })]} />
  ) : (
    <Capsule modifiers={[frame({ maxWidth: 999, height: 3 }), foregroundStyle(trackColor)]} />
  );

  return {
    // ------------------------------------------------------- Lock Screen banner
    // System material — no custom activityBackgroundTint card.
    banner: (
      <VStack
        alignment="leading"
        spacing={10}
        modifiers={[padding({ horizontal: 16, top: 14, bottom: 14 })]}
      >
        <HStack spacing={12}>
          {appIconAt(32, 8)}
          <VStack alignment="leading" spacing={2}>
            <Text
              modifiers={[
                font({ weight: 'semibold', size: 15 }),
                foregroundStyle(primaryText),
                lineLimit(1),
                minimumScaleFactor(0.8),
              ]}
            >
              {title}
            </Text>
            {subtitle.length > 0 ? (
              <Text
                modifiers={[
                  font({ size: 13 }),
                  foregroundStyle(secondaryText),
                  lineLimit(1),
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </VStack>
          <Spacer />
          {showsCountdown ? countdown(15) : numeral(15)}
        </HStack>

        {compactFamily ? null : progressBar}
      </VStack>
    ),

    // Watch / remote devices: one row, no bar, nothing that can wrap.
    bannerSmall: (
      <HStack spacing={10} modifiers={[padding({ horizontal: 12, vertical: 10 })]}>
        {statusGlyph(14)}
        <Text
          modifiers={[
            font({ weight: 'semibold', size: 14 }),
            foregroundStyle(primaryText),
            lineLimit(1),
            minimumScaleFactor(0.8),
          ]}
        >
          {title}
        </Text>
        <Spacer />
        {showsCountdown ? countdown(15) : numeral(16)}
      </HStack>
    ),

    // ------------------------------------------------- compact Dynamic Island
    // glyph ·········· numeral. Accent colour alone answers "is this fine?"
    compactLeading: (
      <HStack modifiers={[padding({ leading: 2 })]}>{statusGlyph(14)}</HStack>
    ),
    compactTrailing: showsCountdown ? (
      <HStack modifiers={[padding({ trailing: 2 })]}>{countdown(14)}</HStack>
    ) : (
      <HStack modifiers={[padding({ trailing: 2 })]}>{numeral(14)}</HStack>
    ),

    // Smallest form — glyph only.
    minimal: statusGlyph(12),

    // ------------------------------------------------ expanded Dynamic Island
    // Ring OR bar — never both. Fraction lives in the ring when determinate.
    expandedLeading: (
      <VStack modifiers={[padding({ leading: 14, vertical: 8 })]}>
        {progressRing(44, ringInner)}
      </VStack>
    ),
    expandedCenter: (
      <VStack alignment="leading" spacing={3} modifiers={[padding({ top: 8 })]}>
        <Text
          modifiers={[
            font({ weight: 'semibold', size: 15 }),
            foregroundStyle(primaryText),
            lineLimit(1),
            minimumScaleFactor(0.75),
            frame({ maxWidth: 160, alignment: 'leading' }),
          ]}
        >
          {title}
        </Text>
        {subtitle.length > 0 ? (
          <Text
            modifiers={[
              font({ size: 12 }),
              foregroundStyle(secondaryText),
              lineLimit(1),
              frame({ maxWidth: 160, alignment: 'leading' }),
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </VStack>
    ),
    // Quiet trailing numeral — no caption under it. When determinate the ring
    // already carries the fraction; the trailing digit still fills the slot so
    // the Island does not look half-rendered.
    expandedTrailing: (
      <VStack alignment="trailing" modifiers={[padding({ trailing: 14, top: 10 })]}>
        {showsCountdown ? countdown(18) : numeral(18)}
      </VStack>
    ),
    expandedBottom: (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[padding({ horizontal: 14, bottom: 12, top: 4 })]}
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
