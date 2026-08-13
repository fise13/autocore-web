import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  padding,
  resizable,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/**
 * Keep EVERYTHING the widget needs inside the `'widget'` function.
 * Babel serializes only that function into App Group storage — helpers defined
 * outside are undefined in the widget JSContext and yield a blank black Island.
 *
 * After editing this file: device Release rebuild (`npm run ios:release`).
 */
export type OperationsLiveActivityProps = {
  mode: 'offline' | 'syncing' | 'failed';
  title: string;
  detail: string;
  count: number;
  done: number;
  total: number;
  progress: number;
  progressLabel: string;
  /** file:// URI of AutoCore app icon in widgetsDirectory (optional). */
  iconUri: string;
};

/** Bumped when Island layout changes — logged at boot to confirm the binary. */
export const OPERATIONS_LIVE_ACTIVITY_LAYOUT_BUILD = 'apple-v5-20260811';

const OperationsLiveActivityLayout = (
  props: OperationsLiveActivityProps,
  environment: LiveActivityEnvironment,
) => {
  'widget';
  const reduced = Boolean(environment.isLuminanceReduced);
  const mode = props.mode;

  // Apple system-like accents — soft, not neon.
  const accent = reduced
    ? '#FFFFFF'
    : mode === 'failed'
      ? '#FF453A'
      : mode === 'offline'
        ? '#8E8E93'
        : '#64D2FF';
  const primary = '#FFFFFF';
  const secondary = reduced ? '#D1D1D6' : '#8E8E93';
  const tertiary = reduced ? '#C7C7CC' : '#636366';

  const title =
    typeof props.title === 'string' && props.title.length > 0
      ? props.title
      : mode === 'failed'
        ? 'Sync failed'
        : mode === 'offline'
          ? 'Waiting offline'
          : 'Syncing photos';
  const detail =
    typeof props.detail === 'string' && props.detail.length > 0
      ? props.detail
      : 'Intake sync';
  const progressLabel =
    typeof props.progressLabel === 'string' && props.progressLabel.length > 0
      ? props.progressLabel
      : '…';
  const progress =
    typeof props.progress === 'number' && Number.isFinite(props.progress)
      ? Math.max(0, Math.min(1, props.progress))
      : 0;
  const iconUri = typeof props.iconUri === 'string' ? props.iconUri : '';
  const hasAppIcon = iconUri.length > 0;

  const statusSymbol =
    mode === 'offline'
      ? 'wifi.slash'
      : mode === 'failed'
        ? 'exclamationmark.triangle.fill'
        : 'arrow.triangle.2.circlepath';
  const trailingCaption =
    mode === 'failed' ? 'failed' : mode === 'offline' ? 'queued' : 'photos';

  // App icon MUST be framed + resizable — bare uiImage stretches into a gray bar
  // inside the compact Island slot.
  const compactIcon = hasAppIcon ? (
    <Image
      uiImage={iconUri}
      modifiers={[
        resizable(),
        frame({ width: 14, height: 14 }),
        cornerRadius(3.5),
      ]}
    />
  ) : (
    <Image systemName={statusSymbol} color={accent} size={13} />
  );

  const minimalIcon = hasAppIcon ? (
    <Image
      uiImage={iconUri}
      modifiers={[
        resizable(),
        frame({ width: 12, height: 12 }),
        cornerRadius(3),
      ]}
    />
  ) : (
    <Image systemName={statusSymbol} color={accent} size={12} />
  );

  const leadingAppIcon = hasAppIcon ? (
    <Image
      uiImage={iconUri}
      modifiers={[
        resizable(),
        frame({ width: 36, height: 36 }),
        cornerRadius(8),
      ]}
    />
  ) : (
    <Image
      systemName={statusSymbol}
      color={accent}
      size={22}
      modifiers={[frame({ width: 36, height: 36 })]}
    />
  );

  const showProgress = mode !== 'failed';

  return {
    // Lock Screen / Notification Center banner
    banner: (
      <VStack spacing={10} modifiers={[padding({ all: 14 })]}>
        <HStack spacing={12}>
          {leadingAppIcon}
          <VStack spacing={2}>
            <Text
              modifiers={[
                font({ weight: 'semibold', size: 15 }),
                foregroundStyle(primary),
              ]}
            >
              {title}
            </Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>{detail}</Text>
          </VStack>
          <Spacer />
          <Text
            modifiers={[
              font({ weight: 'semibold', size: 20 }),
              foregroundStyle(accent),
              monospacedDigit(),
            ]}
          >
            {progressLabel}
          </Text>
        </HStack>
        {showProgress ? (
          <ProgressView
            value={mode === 'syncing' ? progress : undefined}
            modifiers={[tint(accent), frame({ maxWidth: 999 })]}
          />
        ) : null}
      </VStack>
    ),

    // Compact Dynamic Island — icon ········· count
    compactLeading: compactIcon,
    compactTrailing: (
      <Text
        modifiers={[
          font({ weight: 'semibold', size: 13 }),
          foregroundStyle(accent),
          monospacedDigit(),
          padding({ trailing: 2 }),
        ]}
      >
        {progressLabel}
      </Text>
    ),

    // Smallest Island — just the mark
    minimal: minimalIcon,

    // Expanded Island regions (balanced, Apple-like density)
    expandedLeading: (
      <VStack
        spacing={0}
        modifiers={[padding({ leading: 12, vertical: 10 }), frame({ width: 52 })]}
      >
        {leadingAppIcon}
      </VStack>
    ),
    expandedCenter: (
      <VStack spacing={2}>
        <Text
          modifiers={[
            font({ weight: 'semibold', size: 15 }),
            foregroundStyle(primary),
            frame({ maxWidth: 160 }),
          ]}
        >
          {title}
        </Text>
        <Text
          modifiers={[
            font({ size: 12 }),
            foregroundStyle(secondary),
            frame({ maxWidth: 160 }),
          ]}
        >
          {mode === 'failed'
            ? detail
            : mode === 'offline'
              ? 'Will resume online'
              : 'Uploading intake'}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack
        spacing={1}
        modifiers={[padding({ trailing: 12, vertical: 10 }), frame({ minWidth: 52 })]}
      >
        <Text
          modifiers={[
            font({ weight: 'bold', size: 18 }),
            foregroundStyle(accent),
            monospacedDigit(),
          ]}
        >
          {progressLabel}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(tertiary)]}>{trailingCaption}</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack spacing={6} modifiers={[padding({ horizontal: 14, bottom: 12, top: 2 })]}>
        {showProgress ? (
          <ProgressView
            value={mode === 'syncing' ? progress : undefined}
            modifiers={[tint(accent), frame({ maxWidth: 999 })]}
          />
        ) : null}
        <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>{detail}</Text>
      </VStack>
    ),
  };
};

export const OperationsLiveActivity = createLiveActivity(
  'OperationsLiveActivity',
  OperationsLiveActivityLayout,
);
