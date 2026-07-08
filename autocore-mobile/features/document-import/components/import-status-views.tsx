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
};

export function ImportSuccessView({ onDone }: ImportSuccessViewProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.center}>
      <Animated.View entering={ZoomIn.springify().damping(14)}>
        <CheckCircle2Icon size={56} color={colors.primary} strokeWidth={1.6} />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(80).duration(280)} style={{ alignItems: 'center', gap: 8 }}>
        <Text variant="heading" style={styles.title}>
          Документ загружен
        </Text>
        <Text variant="caption" style={styles.caption}>
          Он появится на вебе для просмотра
        </Text>
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.success();
          onDone();
        }}
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
      >
        <Text variant="body" style={{ color: colors.primaryForeground, fontWeight: '700' }}>
          Готово
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
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
});
