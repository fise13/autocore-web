import { duration, spring } from '@/theme/motion';

/** Overview motion — quiet, DL v3 springs only */
export const mcMotion = {
  enabled: true,
  duration: 160,
  translateY: 4,
  stagger: 0,
  pressScale: 0.98,
  pressInMs: 140,
  spring: spring.settle,
  press: spring.press,
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
