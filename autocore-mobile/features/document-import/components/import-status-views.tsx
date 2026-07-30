import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { CheckCircle2Icon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';
import { haptics } from '@/theme';

type ImportUploadingViewProps = {
  progressLabel?: string;
  /** 0–1 upload progress; omit for indeterminate. */
  progress?: number | null;
  detail?: string;
};

export function ImportUploadingView({
  progressLabel = 'Uploading document…',
  progress = null,
  detail = 'The original will be saved and parsing will start on the computer',
}: ImportUploadingViewProps) {
  const pct = progress != null ? Math.round(Math.min(1, Math.max(0, progress)) * 100) : null;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.center}>
      <Animated.View entering={ZoomIn.springify().damping(16)}>
        <ActivityIndicator size="large" color="#fff" />
      </Animated.View>
      <Text variant="body" style={styles.title}>
        {progressLabel}
      </Text>
      {pct != null ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      ) : null}
      <Text variant="caption" style={styles.caption}>
        {pct != null ? `${pct}% · ${detail}` : detail}
      </Text>
    </Animated.View>
  );
}

export type ImportParseStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'unknown';

type ImportSuccessViewProps = {
  onDone: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  uploadedCount?: number;
  parseStatus?: ImportParseStatus;
  onRetryStatus?: () => void;
};

function parseCopy(status: ImportParseStatus | undefined, uploadedCount: number): string {
  const countHint =
    uploadedCount > 1 ? `${uploadedCount} photos in this session. ` : uploadedCount === 1 ? '1 photo. ' : '';

  switch (status) {
    case 'ready':
      return `${countHint}The document is already being parsed or ready to review on the computer.`;
    case 'failed':
      return `${countHint}Parsing failed — open the import on the computer or try again.`;
    case 'processing':
      return `${countHint}Parsing is in progress on the computer — you can keep shooting.`;
    default:
      return `${countHint}Parsing is already in progress on the computer — you can keep shooting.`;
  }
}

export function ImportSuccessView({
  onDone,
  onContinue,
  continueLabel = 'More photos',
  uploadedCount = 0,
  parseStatus = 'processing',
  onRetryStatus,
}: ImportSuccessViewProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.center}>
      <Animated.View entering={ZoomIn.springify().damping(14)}>
        <CheckCircle2Icon size={56} color={colors.primary} strokeWidth={1.6} />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(80).duration(280)} style={{ alignItems: 'center', gap: 8 }}>
        <Text variant="heading" style={styles.title}>
          Uploaded
        </Text>
        <Text variant="caption" style={styles.caption}>
          {parseCopy(parseStatus, uploadedCount)}
        </Text>
      </Animated.View>
      {parseStatus === 'failed' && onRetryStatus ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onRetryStatus();
          }}
          style={styles.linkButton}
        >
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
            Check status again
          </Text>
        </Pressable>
      ) : null}
      {onContinue ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onContinue();
          }}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          <Text variant="body" style={{ color: colors.primaryForeground, fontWeight: '700' }}>
            {continueLabel}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.success();
          onDone();
        }}
        style={[styles.secondaryButton, onContinue ? null : { backgroundColor: colors.primary }]}
      >
        <Text
          variant="body"
          style={{
            color: onContinue ? '#fff' : colors.primaryForeground,
            fontWeight: '700',
          }}
        >
          Done
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    gap: rhythm.stack,
    paddingHorizontal: 28,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  caption: {
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 18,
  },
  progressTrack: {
    width: '70%',
    maxWidth: 240,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  primaryButton: {
    width: '100%',
    maxWidth: 320,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: '100%',
    maxWidth: 320,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  linkButton: {
    paddingVertical: 6,
  },
});
