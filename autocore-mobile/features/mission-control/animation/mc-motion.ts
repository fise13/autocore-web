import { duration, spring } from '@/theme/motion';

/** Mission Control motion — almost invisible, native-feeling */
export const mcMotion = {
  enabled: true,
  duration: 160,
  translateY: 4,
  stagger: 30,
  pressScale: 0.98,
  pressInMs: 140,
  spring: spring.gentle,
  press: spring.snappy,
  counterDuration: 360,
} as const;

export const mcDuration = {
  fast: duration.fast,
  enter: mcMotion.duration,
} as const;

export const mcSpring = {
  enter: mcMotion.spring,
  press: mcMotion.press,
} as const;
