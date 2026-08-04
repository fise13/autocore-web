import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

const AnimatedLine = Animated.createAnimatedComponent(Line);

/** Intrinsic drawing size — displayed ~20% larger for a stronger focal point. */
export const HERO_WIDTH = 300;
export const HERO_HEIGHT = 200;
const HERO_DISPLAY_SCALE = 1.2;
export const HERO_DISPLAY_WIDTH = Math.round(HERO_WIDTH * HERO_DISPLAY_SCALE);
export const HERO_DISPLAY_HEIGHT = Math.round(HERO_HEIGHT * HERO_DISPLAY_SCALE);

const CAR_WIDTH = 224;
const CAR_HEIGHT = 112;
const CAR_LEFT = (HERO_WIDTH - CAR_WIDTH) / 2;
const CAR_TOP = 44;

const ROAD_Y = 156;
const WHEEL_RADIUS = 15;
const FRONT_WHEEL = { x: 162, y: 82 } as const;
const REAR_WHEEL = { x: 66, y: 82 } as const;

/** Hand-drawn body: bonnet, cabin, boot — one continuous stroke. */
const CAR_BODY =
  'M 14 78 C 12 63, 21 57, 36 56 L 58 56 C 68 40, 85 32, 106 32 ' +
  'C 128 32, 144 40, 153 56 L 187 60 C 203 63, 212 68, 210 79 L 198 80';

const CAR_SILL = 'M 82 80 L 146 80';
const CAR_NOSE = 'M 14 78 L 26 80';

const REAR_WINDOW = 'M 72 54 C 80 43, 90 38, 102 38 L 102 54 Z';
const FRONT_WINDOW = 'M 110 38 C 124 39, 135 45, 142 54 L 110 54 Z';

/** Motion ticks that trail the car. */
const SPEED_LINES = [
  { y: 62, length: 26 },
  { y: 78, length: 34 },
  { y: 94, length: 20 },
];

type WheelProps = {
  x: number;
  y: number;
  color: string;
  accent: string;
  reduced: boolean;
  delay: number;
};

function Wheel({ x, y, color, accent, reduced, delay }: WheelProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      rotation.value = 0;
      return;
    }
    rotation.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: 1400, easing: Easing.linear }), -1, false),
    );
  }, [delay, reduced, rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  const size = WHEEL_RADIUS * 2 + 4;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={WHEEL_RADIUS}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
        <Circle cx={size / 2} cy={size / 2} r={4} stroke={accent} strokeWidth={2} fill="none" />
        <Line
          x1={size / 2}
          y1={size / 2 - WHEEL_RADIUS + 3}
          x2={size / 2}
          y2={size / 2 - 5}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={size / 2 + WHEEL_RADIUS - 3}
          y1={size / 2}
          x2={size / 2 + 5}
          y2={size / 2}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={size / 2}
          y1={size / 2 + WHEEL_RADIUS - 3}
          x2={size / 2}
          y2={size / 2 + 5}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * Login hero — a small hand-drawn car driving on an endless road.
 * The car holds the centre, the road slides underneath, wheels keep turning.
 * Everything freezes into a clean static drawing when reduced motion is on.
 */
export function AuthHeroCar({ enterDelayMs = 0 }: { enterDelayMs?: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const drive = useSharedValue(reduced ? 1 : 0);
  const bob = useSharedValue(0);
  const road = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      drive.value = 1;
      bob.value = 0;
      road.value = 0;
      return;
    }

    drive.value = 0;
    drive.value = withDelay(
      enterDelayMs,
      withTiming(1, { duration: 820, easing: autocoreEase }),
    );

    bob.value = withDelay(
      enterDelayMs + 820,
      withRepeat(withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }), -1, true),
    );

    road.value = withDelay(
      enterDelayMs,
      withRepeat(withTiming(1, { duration: 620, easing: Easing.linear }), -1, false),
    );
  }, [bob, drive, enterDelayMs, road, reduced]);

  const carStyle = useAnimatedStyle(() => ({
    opacity: drive.value,
    transform: [
      { translateX: (1 - drive.value) * -90 },
      { translateY: bob.value * -2.5 },
      { rotate: `${bob.value * 0.6 - 0.3}deg` },
    ],
  }));

  const roadProps = useAnimatedProps(() => ({
    strokeDashoffset: road.value * 34,
  }));

  const speedStyle = useAnimatedStyle(() => ({
    opacity: drive.value * (0.35 + bob.value * 0.35),
    transform: [{ translateX: road.value * -10 }],
  }));

  const stroke = colors.foreground;
  const accent = colors.primary;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="AutoCore"
      style={{
        width: HERO_DISPLAY_WIDTH,
        height: HERO_DISPLAY_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: HERO_WIDTH,
          height: HERO_HEIGHT,
          transform: [{ scale: HERO_DISPLAY_SCALE }],
        }}
      >
      {/* Road — dashes slide to sell the motion without moving the car. */}
      <Svg
        width={HERO_WIDTH}
        height={HERO_HEIGHT}
        viewBox={`0 0 ${HERO_WIDTH} ${HERO_HEIGHT}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Line
          x1={0}
          y1={ROAD_Y}
          x2={HERO_WIDTH}
          y2={ROAD_Y}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.28}
        />
        <AnimatedLine
          x1={10}
          y1={ROAD_Y + 12}
          x2={HERO_WIDTH - 10}
          y2={ROAD_Y + 12}
          stroke={accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="20 14"
          animatedProps={roadProps}
        />
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: CAR_LEFT - 46,
            top: CAR_TOP,
            width: 40,
            height: CAR_HEIGHT,
          },
          speedStyle,
        ]}
      >
        <Svg width={40} height={CAR_HEIGHT} viewBox={`0 0 40 ${CAR_HEIGHT}`}>
          {SPEED_LINES.map((line) => (
            <Line
              key={line.y}
              x1={40 - line.length}
              y1={line.y}
              x2={38}
              y2={line.y}
              stroke={stroke}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: CAR_LEFT, top: CAR_TOP, width: CAR_WIDTH, height: CAR_HEIGHT },
          carStyle,
        ]}
      >
        <Svg width={CAR_WIDTH} height={CAR_HEIGHT} viewBox={`0 0 ${CAR_WIDTH} ${CAR_HEIGHT}`}>
          <Path
            d={CAR_BODY}
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path d={CAR_SILL} stroke={stroke} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <Path d={CAR_NOSE} stroke={stroke} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <Path
            d={REAR_WINDOW}
            stroke={stroke}
            strokeWidth={2}
            strokeLinejoin="round"
            fill="none"
            opacity={0.55}
          />
          <Path
            d={FRONT_WINDOW}
            stroke={stroke}
            strokeWidth={2}
            strokeLinejoin="round"
            fill="none"
            opacity={0.55}
          />
          {/* Headlight */}
          <Circle cx={206} cy={72} r={3.5} fill={accent} />
        </Svg>

        <Wheel
          x={REAR_WHEEL.x}
          y={REAR_WHEEL.y}
          color={stroke}
          accent={accent}
          reduced={reduced}
          delay={enterDelayMs + 820}
        />
        <Wheel
          x={FRONT_WHEEL.x}
          y={FRONT_WHEEL.y}
          color={stroke}
          accent={accent}
          reduced={reduced}
          delay={enterDelayMs + 820}
        />
      </Animated.View>
      </View>
    </View>
  );
}
