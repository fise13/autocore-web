import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type McPressableProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** @deprecated No-op — kept for callers outside Overview */
  liftOnPress?: boolean;
  /** @deprecated No-op — kept for callers outside Overview */
  onRotateTap?: boolean;
};

/**
 * Quiet press target — no scale / opacity on the container.
 * Ancestor opacity or transform blanks nested Reanimated chart bars on iOS.
 * Press feedback is a light foreground wash via `android_ripple` / callers'
 * own pressed styles when needed; default is a no-visual-glitch press.
 */
export function McPressable({
  children,
  style,
  liftOnPress: _liftOnPress,
  onRotateTap: _onRotateTap,
  ...props
}: McPressableProps) {
  return (
    <Pressable {...props} style={style}>
      {children}
    </Pressable>
  );
}
