import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ArrowLeftIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, form, rhythm, spacing } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

type AuthShellProps = {
  stepLabel?: string;
  /** Quiet progress, e.g. "2 of 4" */
  progressLabel?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  /** Animate content enter/exit with the same motion as login email steps. */
  stepKey?: string;
  /** 1 = forward (from left), -1 = back (from right). */
  stepDirection?: 1 | -1;
};

function AuthMark() {
  return (
    <Image
      source={require('../assets/branding/login-logo.png')}
      style={{ width: 28, height: 28 }}
      resizeMode="contain"
      accessibilityLabel="AutoCore"
    />
  );
}

function AuthBackdrop() {
  const { colors, isDark } = useTheme();

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 280,
          opacity: isDark ? 0.22 : 0.35,
          backgroundColor: toneBackground(colors.foreground, 0.04),
        }}
      />
      <LinearGradient
        colors={[toneBackground(colors.primary, isDark ? 0.08 : 0.1), 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
      />
    </View>
  );
}

function ProgressBar({ progressLabel }: { progressLabel: string }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const match = /^(\d+)\s+of\s+(\d+)$/i.exec(progressLabel.trim());
  const current = match ? Number(match[1]) : 0;
  const total = match ? Number(match[2]) : 0;
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  const progress = useSharedValue(ratio);

  useEffect(() => {
    progress.value = reducedMotion
      ? ratio
      : withTiming(ratio, { duration: duration.medium, easing: autocoreEase });
  }, [progress, ratio, reducedMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={{ gap: spacing[2] }}>
      <Text
        variant="caption"
        color="muted"
        style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.2 }}
      >
        {progressLabel}
      </Text>
      <View
        style={{
          height: 3,
          borderRadius: 999,
          backgroundColor: toneBackground(colors.foreground, 0.08),
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: 999,
              backgroundColor: colors.primary,
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

/** Auth layout — mirrors login email-step chrome (mark, title, calm form). */
export function AuthShell({
  stepLabel,
  progressLabel,
  title,
  description,
  children,
  footer,
  onBack,
  stepKey,
  stepDirection = 1,
}: AuthShellProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const entering =
    !reducedMotion && stepKey
      ? stepDirection >= 0
        ? FadeInRight.duration(280)
        : FadeInLeft.duration(280)
      : undefined;
  const exiting =
    !reducedMotion && stepKey
      ? stepDirection >= 0
        ? FadeOutLeft.duration(220)
        : FadeOutRight.duration(220)
      : undefined;

  const heading = (
    <View style={{ gap: rhythm.micro }}>
      {title ? (
        <Text
          variant="pageTitle"
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.6,
            lineHeight: 34,
            color: colors.foreground,
          }}
        >
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text
          variant="pageSubtitle"
          style={{ fontSize: 16, lineHeight: 23, color: colors.mutedForeground }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );

  const body = <View style={{ gap: form.groupGap }}>{children}</View>;

  const stepContent = (
    <View style={{ gap: form.groupGap }}>
      {title || description ? heading : null}
      {body}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <AuthBackdrop />
        <KeyboardAwareScrollView
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: rhythm.pad,
            paddingTop: spacing[6],
            paddingBottom: spacing[8],
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 384,
              alignSelf: 'center',
              gap: form.sectionGap,
            }}
          >
            <View style={{ gap: rhythm.stack }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: onBack ? 'space-between' : 'flex-start',
                  minHeight: 32,
                }}
              >
                {onBack ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    hitSlop={12}
                    onPress={onBack}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing[1],
                      paddingVertical: 4,
                      paddingRight: 8,
                    }}
                  >
                    <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      Back
                    </Text>
                  </Pressable>
                ) : (
                  <AuthMark />
                )}
                {onBack ? <AuthMark /> : null}
              </View>

              {progressLabel ? <ProgressBar progressLabel={progressLabel} /> : null}

              {stepLabel ? (
                <Text
                  variant="caption"
                  color="muted"
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {stepLabel}
                </Text>
              ) : null}
            </View>

            {stepKey ? (
              <Animated.View key={stepKey} entering={entering} exiting={exiting}>
                {stepContent}
              </Animated.View>
            ) : (
              stepContent
            )}

            {footer ? <View style={{ paddingTop: spacing[2] }}>{footer}</View> : null}
          </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}
