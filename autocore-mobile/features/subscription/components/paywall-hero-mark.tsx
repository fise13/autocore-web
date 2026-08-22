import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export const MARK_WIDTH = 168;
export const MARK_HEIGHT = 188;

const CX = 84;
const CRANK_Y = 148;
const CRANK_R = 17;
const ROD = 60;
const PISTON_H = 28;
const PISTON_W = 36;

function pistonPinY(cycle: number): number {
  'worklet';
  const t = cycle * Math.PI * 2;
  return CRANK_Y - ROD - CRANK_R * Math.cos(t);
}

function crankPinX(cycle: number): number {
  'worklet';
  return CX + CRANK_R * Math.sin(cycle * Math.PI * 2);
}

function crankPinY(cycle: number): number {
  'worklet';
  return CRANK_Y - CRANK_R * Math.cos(cycle * Math.PI * 2);
}

function counterweightD(cycle: number): string {
  'worklet';
  const t = cycle * Math.PI * 2 + Math.PI;
  const a0 = t - 0.85;
  const a1 = t + 0.85;
  const r = CRANK_R + 11;
  const x0 = CX + r * Math.sin(a0);
  const y0 = CRANK_Y - r * Math.cos(a0);
  const x1 = CX + r * Math.sin(a1);
  const y1 = CRANK_Y - r * Math.cos(a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Milliseconds per revolution at rest — slow enough to read as mechanism. */
const IDLE_MS = 5400;

type PaywallHeroMarkProps = {
  enterDelayMs?: number;
  /**
   * Uniform scale. The SVG scales natively through its viewBox and the layout
   * box scales with it, so the drawing is never clipped — the mark used to be
   * squeezed into an 88pt box with `overflow: 'hidden'`, which cut off the
   * cylinder head and the crankcase feet.
   */
  scale?: number;
  /**
   * Start the engine rather than idle it: a slow turn, a catch, a rev, then a
   * settle back to idle speed. Used once, on the post-purchase screen, where
   * the engine turning over *is* the celebration.
   */
  celebrate?: boolean;
};

/**
 * Single-cylinder line drawing with a crank–rod–piston cycle.
 *
 * `cycle` counts revolutions instead of wrapping at 1, so the animation can
 * accelerate and then hand over to a repeating idle with no visible jump —
 * every worklet reads it through `sin`/`cos`, which are periodic in it.
 */
export function PaywallHeroMark({
  enterDelayMs = 80,
  scale = 1,
  celebrate = false,
}: PaywallHeroMarkProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const enter = useSharedValue(reduced ? 1 : 0);
  const cycle = useSharedValue(reduced ? 0.18 : 0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      cycle.value = 0.18;
      return;
    }

    enter.value = withDelay(enterDelayMs, withTiming(1, { duration: 640, easing: autocoreEase }));

    if (celebrate) {
      cycle.value = withDelay(
        enterDelayMs + 120,
        withSequence(
          // Turning over.
          withTiming(0.35, { duration: 420, easing: Easing.in(Easing.quad) }),
          // Catches and revs, decelerating into idle speed.
          withTiming(3.2, { duration: 1600, easing: Easing.out(Easing.cubic) }),
          // 3.2 → 4.2 is exactly one revolution, so the loop reset is invisible.
          withRepeat(withTiming(4.2, { duration: IDLE_MS, easing: Easing.linear }), -1, false),
        ),
      );
      return;
    }

    cycle.value = withDelay(
      enterDelayMs + 280,
      withRepeat(withTiming(1, { duration: IDLE_MS, easing: Easing.linear }), -1, false),
    );
  }, [celebrate, cycle, enter, enterDelayMs, reduced]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 8 }],
  }));

  const pistonStyle = useAnimatedStyle(() => {
    const pin = pistonPinY(cycle.value);
    // The piston lives outside the SVG, so it does not get the viewBox scale
    // for free — its travel is in drawing units and has to be scaled by hand.
    return {
      transform: [{ translateY: (pin - PISTON_H * 0.62) * scale }],
    };
  });

  const rodProps = useAnimatedProps(() => ({
    x1: CX,
    y1: pistonPinY(cycle.value),
    x2: crankPinX(cycle.value),
    y2: crankPinY(cycle.value),
  }));

  const pinProps = useAnimatedProps(() => ({
    cx: crankPinX(cycle.value),
    cy: crankPinY(cycle.value),
  }));

  const wristProps = useAnimatedProps(() => ({
    cx: CX,
    cy: pistonPinY(cycle.value),
  }));

  const weightProps = useAnimatedProps(() => ({
    d: counterweightD(cycle.value),
  }));

  const stroke = colors.foreground;
  const accent = colors.primary;

  const fin = (x: number, y: number, w: number) => (
    <Line
      key={`${x}-${y}`}
      x1={x}
      y1={y}
      x2={x + w}
      y2={y}
      stroke={stroke}
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.55}
    />
  );

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Engine piston"
      style={[
        { width: MARK_WIDTH * scale, height: MARK_HEIGHT * scale, alignItems: 'center' },
        wrapStyle,
      ]}
    >
      <Svg
        width={MARK_WIDTH * scale}
        height={MARK_HEIGHT * scale}
        viewBox={`0 0 ${MARK_WIDTH} ${MARK_HEIGHT}`}
        style={{ position: 'absolute' }}
      >
        {/* Head + plug */}
        <Rect x={52} y={18} width={64} height={14} rx={2} stroke={stroke} strokeWidth={2} fill="none" />
        <Line x1={CX} y1={18} x2={CX} y2={10} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Line x1={CX - 5} y1={10} x2={CX + 5} y2={10} stroke={accent} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={60} cy={25} r={1.6} fill={stroke} />
        <Circle cx={108} cy={25} r={1.6} fill={stroke} />

        {/* Ports */}
        <Path
          d="M 52 40 L 42 40 L 42 50 L 52 50"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M 116 40 L 126 40 L 126 50 L 116 50"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinejoin="round"
          fill="none"
        />

        {/* Bore */}
        <Line x1={56} y1={32} x2={56} y2={112} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
        <Line x1={112} y1={32} x2={112} y2={112} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />

        {/* Cooling fins */}
        {[38, 46, 54, 62, 70].map((y) => fin(40, y, 14))}
        {[38, 46, 54, 62, 70].map((y) => fin(114, y, 14))}

        {/* Crankcase */}
        <Path
          d="M 56 112 L 46 122 L 46 168 L 122 168 L 122 122 L 112 112"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          fill={colors.background}
        />
        <Line x1={62} y1={168} x2={62} y2={176} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Line x1={106} y1={168} x2={106} y2={176} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Line x1={56} y1={176} x2={68} y2={176} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Line x1={100} y1={176} x2={112} y2={176} stroke={stroke} strokeWidth={2} strokeLinecap="round" />

        <AnimatedPath
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
          animatedProps={weightProps}
        />

        <AnimatedLine
          stroke={stroke}
          strokeWidth={2.4}
          strokeLinecap="round"
          animatedProps={rodProps}
        />

        <Circle cx={CX} cy={CRANK_Y} r={CRANK_R + 5} stroke={stroke} strokeWidth={2} fill="none" />
        <Circle cx={CX} cy={CRANK_Y} r={3} fill={accent} />
        <AnimatedCircle r={3.4} stroke={stroke} strokeWidth={1.6} fill={colors.background} animatedProps={pinProps} />
        <AnimatedCircle r={3.4} stroke={stroke} strokeWidth={1.6} fill={colors.background} animatedProps={wristProps} />
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: (CX - PISTON_W / 2) * scale,
            top: 0,
            width: PISTON_W * scale,
            height: PISTON_H * scale,
          },
          pistonStyle,
        ]}
      >
        <Svg
          width={PISTON_W * scale}
          height={PISTON_H * scale}
          viewBox={`0 0 ${PISTON_W} ${PISTON_H}`}
        >
          <Rect
            x={1.1}
            y={1.1}
            width={PISTON_W - 2.2}
            height={PISTON_H - 2.2}
            rx={2.5}
            stroke={stroke}
            strokeWidth={2}
            fill={colors.background}
          />
          <Line x1={5} y1={7} x2={PISTON_W - 5} y2={7} stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={5} y1={11} x2={PISTON_W - 5} y2={11} stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={8} y1={15} x2={PISTON_W - 8} y2={15} stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
          <Circle cx={PISTON_W / 2} cy={21} r={3.2} stroke={stroke} strokeWidth={1.5} fill="none" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
