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
  activityBackgroundTint,
  background,
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
  shapes,
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
export const OPERATIONS_LIVE_ACTIVITY_LAYOUT_BUILD = 'island-v6-20260813';

const OperationsLiveActivityLayout = (
  props: OperationsLiveActivityProps,
  environment: LiveActivityEnvironment,
) => {
  'widget';

  // ---------------------------------------------------------------- environment
  // Always-On display: iOS asks for a dimmer, flatter frame. Colour is the first
  // thing to go — a red alert burning into an idle screen is worse than a grey one.
  const dimmed = Boolean(environment.isLuminanceReduced);
  // Apple Watch and remote devices render the `small` family, where the banner
  // is roughly a notification row. Anything multi-line gets truncated there.
  const compactFamily = environment.activityFamily === 'small';

  // ---------------------------------------------------------------- props
  const status = typeof props.status === 'string' ? props.status : 'SYNCING';
  const rawAccent = typeof props.accent === 'string' && props.accent.length > 0
    ? props.accent
    : '#0A84FF';
  const accent = dimmed ? '#EBEBF5' : rawAccent;
  const symbol = typeof props.symbol === 'string' && props.symbol.length > 0
    ? props.symbol
    : 'icloud.and.arrow.up.fill';
  const title = typeof props.title === 'string' && props.title.length > 0
    ? props.title
    : 'Syncing photos';
  const detail = typeof props.detail === 'string' ? props.detail : '';
  const subject = typeof props.subject === 'string' ? props.subject : '';
  const headline = typeof props.headline === 'string' && props.headline.length > 0
    ? props.headline
    : '—';
  const caption = typeof props.caption === 'string' ? props.caption : '';
  const progress = typeof props.progress === 'number' && Number.isFinite(props.progress)
    ? Math.max(0, Math.min(1, props.progress))
    : 0;
  const determinate = Boolean(props.determinate);
  const retryAtMs = typeof props.retryAtMs === 'number' && Number.isFinite(props.retryAtMs)
    ? props.retryAtMs
    : 0;
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

  // ---------------------------------------------------------------- palette
  const primaryText = '#FFFFFF';
  const secondaryText = dimmed ? '#D1D1D6' : '#98989F';
  const tertiaryText = dimmed ? '#C7C7CC' : '#6E6E73';
  // Pre-composited greys rather than runtime alpha: the Island composites over
  // true black, so a flat dark grey and a 12% white are indistinguishable —
  // except the flat one cannot wash out against a bright Lock Screen wallpaper.
  const trackColor = '#2C2C2E';
  const chipColor = '#1C1C1E';

  // ---------------------------------------------------------------- fragments
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

  /** Status glyph on a tinted disc — one colour, read at a glance. */
  const statusGlyph = (diameter: number, glyphSize: number) => (
    <ZStack modifiers={[frame({ width: diameter, height: diameter })]}>
      <Circle
        modifiers={[
          frame({ width: diameter, height: diameter }),
          foregroundStyle(accent),
          opacity(dimmed ? 0.24 : 0.18),
        ]}
      />
      <Image systemName={symbol} color={accent} size={glyphSize} />
    </ZStack>
  );

  /**
   * The progress ring. Only drawn when there is real progress to show — an
   * indeterminate ring parked at zero looks like a stalled upload.
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

  /** The progress track. Non-syncing states get a flat rail, not a spinner. */
  const progressBar = determinate ? (
    <ProgressView
      value={progress}
      modifiers={[tint(accent), frame({ maxWidth: 999 })]}
    />
  ) : status === 'SYNCING' ? (
    <ProgressView modifiers={[tint(accent), frame({ maxWidth: 999 })]} />
  ) : (
    // Waiting / blocked: a flat rail. A spinner here would claim work is
    // happening when the queue is deliberately parked.
    <Capsule modifiers={[frame({ maxWidth: 999, height: 4 }), foregroundStyle(trackColor)]} />
  );

  /** Trailing chip in the banner — the numeral, boxed so it holds the eye. */
  const headlineChip = (
    <HStack
      spacing={4}
      modifiers={[
        padding({ horizontal: 10, vertical: 5 }),
        background(chipColor, shapes.capsule()),
      ]}
    >
      {showsCountdown ? countdown(15) : numeral(15)}
    </HStack>
  );

  const subtitle = subject.length > 0 && detail.length > 0
    ? `${subject} · ${detail}`
    : subject.length > 0
      ? subject
      : detail;

  return {
    // ------------------------------------------------------- Lock Screen banner
    banner: (
      <VStack
        alignment="leading"
        spacing={10}
        modifiers={[padding({ horizontal: 16, top: 14, bottom: 14 }), activityBackgroundTint('#0E0F13')]}
      >
        <HStack spacing={12}>
          {appIconAt(38, 9)}
          <VStack alignment="leading" spacing={2}>
            <Text
              modifiers={[
                font({ weight: 'semibold', size: 16 }),
                foregroundStyle(primaryText),
                lineLimit(1),
                minimumScaleFactor(0.8),
              ]}
            >
              {title}
            </Text>
            <Text
              modifiers={[
                font({ size: 13 }),
                foregroundStyle(secondaryText),
                lineLimit(compactFamily ? 1 : 2),
              ]}
            >
              {subtitle}
            </Text>
          </VStack>
          <Spacer />
          {headlineChip}
        </HStack>

        {compactFamily ? null : progressBar}

        {compactFamily ? null : (
          <HStack spacing={6}>
            <Image systemName={symbol} color={accent} size={11} />
            <Text
              modifiers={[
                font({ weight: 'medium', size: 12 }),
                foregroundStyle(tertiaryText),
                lineLimit(1),
              ]}
            >
              {caption.length > 0 ? caption.toUpperCase() : 'INTAKE SYNC'}
            </Text>
            <Spacer />
            {showsCountdown ? (
              <Text
                timerInterval={countdownRange}
                countsDown
                modifiers={[
                  font({ weight: 'medium', size: 12 }),
                  foregroundStyle(tertiaryText),
                  monospacedDigit(),
                  frame({ maxWidth: 70, alignment: 'trailing' }),
                ]}
              />
            ) : null}
          </HStack>
        )}
      </VStack>
    ),

    // Watch / remote devices: one row, no bar, nothing that can wrap.
    bannerSmall: (
      <HStack spacing={10} modifiers={[padding({ horizontal: 12, vertical: 10 })]}>
        {statusGlyph(30, 14)}
        <VStack alignment="leading" spacing={1}>
          <Text
            modifiers={[
              font({ weight: 'semibold', size: 14 }),
              foregroundStyle(primaryText),
              lineLimit(1),
            ]}
          >
            {title}
          </Text>
          <Text
            modifiers={[font({ size: 11 }), foregroundStyle(secondaryText), lineLimit(1)]}
          >
            {caption}
          </Text>
        </VStack>
        <Spacer />
        {showsCountdown ? countdown(15) : numeral(16)}
      </HStack>
    ),

    // ------------------------------------------------- compact Dynamic Island
    // glyph ·········· numeral. The disc carries the status colour, so a glance
    // at the pill answers "is this fine?" without reading anything.
    compactLeading: (
      <HStack modifiers={[padding({ leading: 2 })]}>{statusGlyph(20, 11)}</HStack>
    ),
    compactTrailing: showsCountdown ? (
      <HStack modifiers={[padding({ trailing: 2 })]}>{countdown(14)}</HStack>
    ) : (
      <HStack modifiers={[padding({ trailing: 2 })]}>{numeral(14)}</HStack>
    ),

    // Smallest form — the disc alone, colour only.
    minimal: statusGlyph(18, 10),

    // ------------------------------------------------ expanded Dynamic Island
    expandedLeading: (
      <VStack modifiers={[padding({ leading: 14, vertical: 8 })]}>
        {progressRing(46, appIconAt(24, 6))}
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
            frame({ maxWidth: 150, alignment: 'leading' }),
          ]}
        >
          {title}
        </Text>
        <Text
          modifiers={[
            font({ size: 12 }),
            foregroundStyle(secondaryText),
            lineLimit(2),
            frame({ maxWidth: 150, alignment: 'leading' }),
          ]}
        >
          {subtitle}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={1} modifiers={[padding({ trailing: 14, top: 8 })]}>
        {showsCountdown ? countdown(20) : numeral(20)}
        <Text
          modifiers={[
            font({ weight: 'medium', size: 11 }),
            foregroundStyle(tertiaryText),
            lineLimit(1),
          ]}
        >
          {caption}
        </Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ horizontal: 14, bottom: 12, top: 6 })]}>
        {progressBar}
        <HStack spacing={6}>
          <Image systemName={symbol} color={accent} size={11} />
          <Text
            modifiers={[
              font({ size: 12 }),
              foregroundStyle(secondaryText),
              lineLimit(1),
              minimumScaleFactor(0.8),
            ]}
          >
            {detail.length > 0 ? detail : title}
          </Text>
          <Spacer />
        </HStack>
      </VStack>
    ),
  };
};

export const OperationsLiveActivity = createLiveActivity(
  'OperationsLiveActivity',
  OperationsLiveActivityLayout,
);
