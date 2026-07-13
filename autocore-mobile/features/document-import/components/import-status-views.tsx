import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { CheckCircle2Icon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';
import { haptics } from '@/theme';

type ImportUploadingViewProps = {
  progressLabel?: string;
};

export function ImportUploadingView({ progressLabel = 'Отправляем документ…' }: ImportUploadingViewProps) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.center}>
      <Animated.View entering={ZoomIn.springify().damping(16)}>
        <ActivityIndicator size="large" color="#fff" />
      </Animated.View>
      <Text variant="body" style={styles.title}>
        {progressLabel}
      </Text>
      <Text variant="caption" style={styles.caption}>
        Оригинал сохранён, готовим превью
      </Text>
    </Animated.View>
  );
}

type ImportSuccessViewProps = {
  onDone: () => void;
  onContinue?: () => void;
  continueLabel?: string;
};

export function ImportSuccessView({
  onDone,
  onContinue,
  continueLabel = 'Ещё фото',
}: ImportSuccessViewProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.center}>
      <Animated.View entering={ZoomIn.springify().damping(14)}>
        <CheckCircle2Icon size={56} color={colors.primary} strokeWidth={1.6} />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(80).duration(280)} style={{ alignItems: 'center', gap: 8 }}>
        <Text variant="heading" style={styles.title}>
          Загружено
        </Text>
        <Text variant="caption" style={styles.caption}>
          На компьютере уже идёт разбор — можно снимать дальше
        </Text>
      </Animated.View>
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
          Готово
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
    fontSize: 20,
    textAlign: 'center',
  },
  caption: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 12,
    minHeight: 48,
    minWidth: 160,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  secondaryButton: {
    width: '100%',
    maxWidth: 280,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
