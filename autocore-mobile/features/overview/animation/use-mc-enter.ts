import { useAnimatedStyle } from 'react-native-reanimated';

type McEnterConfig = {
  delay?: number;
  translateY?: number;
  translateX?: number;
  scaleFrom?: number;
  duration?: number;
  spring?: boolean;
  fade?: boolean;
};

/**
 * Enter motion disabled.
 *
 * Prior spring/fade left opacity+transform on nodes (and Strict Mode cleared
 * the settle timer while startedRef blocked a retry). On press, iOS then blanked
 * Finance/Recent text after a hitch. Static layout is the reliable product path.
 */
export function useMcEnter(_config: McEnterConfig = {}) {
  return useAnimatedStyle(() => ({}));
}
