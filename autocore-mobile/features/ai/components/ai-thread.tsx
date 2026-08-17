import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useMotion, useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

import type { AiUserTurn } from '../ai-session-store';
import { AiPendingDots } from './ai-pending-dots';

type Props = {
  turns: AiUserTurn[];
  awaitingCore: boolean;
};

export const AiThread = memo(function AiThread({ turns, awaitingCore }: Props) {
  const { colors } = useTheme();
  const motion = useMotion();
  const entering = motion.reduced
    ? undefined
    : FadeInUp.duration(motion.duration.fast).easing(motion.ease);

  return (
    <View style={styles.stack}>
      {turns.map((turn) => (
        <Animated.View key={turn.id} entering={entering} style={styles.userWrap}>
          <View style={[styles.userBubble, { backgroundColor: colors.secondary }]}>
            <Text variant="body" style={{ color: colors.secondaryForeground }}>
              {turn.text}
            </Text>
          </View>
        </Animated.View>
      ))}
      {awaitingCore ? (
        <Animated.View entering={entering} style={styles.pendingWrap}>
          <AiPendingDots />
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  stack: {
    gap: tokens.space.stack,
    paddingHorizontal: tokens.space.screenX,
    paddingTop: tokens.space.inline,
  },
  userWrap: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '82%',
    borderRadius: tokens.radius.modal,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pendingWrap: {
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
});
