import type { SemanticColors, ColorScheme } from './colors';
import {
  cornerStyle,
  surfaceStyle,
  glassStyle,
  borderStyle,
  navigationHeight,
  toolbarHeight,
  tabBarHeight,
  bottomBarHeight,
  buttonHeight,
  touchTarget,
  iconWeight,
  animationSpeed,
  defaultSpring,
  defaultDuration,
  defaultEasing,
  pageTransition,
  modalTransition,
  sheetTransition,
  defaultRadius,
  defaultPadding,
  defaultGap,
  layoutRhythm,
  typeScale,
  toneStyles,
  layering,
  staggerDelay,
} from './design-language';
import { fontFamily } from './typography';
import { getShadows } from './shadow';
import { getGradients } from './gradients';
import { ringBorder } from './shadow';
import * as styles from './styles';
import { pickMotion, reducedMotion } from './motion';

type A11ySlice = {
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
};

export type DesignLanguageContext = {
  scheme: ColorScheme;
  colors: SemanticColors;
  corner: typeof cornerStyle;
  surface: ReturnType<typeof surfaceStyle>;
  glass: typeof glassStyle;
  border: ReturnType<typeof borderStyle>;
  navigationHeight: typeof navigationHeight;
  toolbarHeight: typeof toolbarHeight;
  tabBarHeight: typeof tabBarHeight;
  bottomBarHeight: typeof bottomBarHeight;
  buttonHeight: typeof buttonHeight;
  touchTarget: typeof touchTarget;
  iconWeight: typeof iconWeight;
  animationSpeed: typeof animationSpeed;
  defaultSpring: typeof defaultSpring;
  defaultDuration: typeof defaultDuration;
  defaultEasing: typeof defaultEasing;
  pageTransition: typeof pageTransition;
  modalTransition: typeof modalTransition;
  sheetTransition: typeof sheetTransition;
  defaultRadius: typeof defaultRadius;
  defaultPadding: typeof defaultPadding;
  defaultGap: typeof defaultGap;
  layout: typeof layoutRhythm;
  type: typeof typeScale;
  typeFamily: typeof import('./typography').fontFamily;
  tones: ReturnType<typeof toneStyles>;
  shadows: ReturnType<typeof getShadows>;
  gradients: ReturnType<typeof getGradients>;
  ring: ReturnType<typeof ringBorder>;
  layering: typeof layering;
  staggerDelay: typeof staggerDelay;
  styles: typeof styles;
  motion: {
    reduced: boolean;
    pick: typeof pickMotion;
    fallback: typeof reducedMotion;
  };
  a11y: A11ySlice;
  scaledSize: (base: number) => number;
};

export function designLanguageFromScheme(
  scheme: ColorScheme,
  colors: SemanticColors,
  a11y: A11ySlice,
): DesignLanguageContext {
  return {
    scheme,
    colors,
    corner: cornerStyle,
    surface: surfaceStyle(scheme),
    glass: glassStyle,
    border: borderStyle(scheme),
    navigationHeight,
    toolbarHeight,
    tabBarHeight,
    bottomBarHeight,
    buttonHeight,
    touchTarget,
    iconWeight,
    animationSpeed,
    defaultSpring,
    defaultDuration,
    defaultEasing,
    pageTransition,
    modalTransition,
    sheetTransition,
    defaultRadius,
    defaultPadding,
    defaultGap,
    layout: layoutRhythm,
    type: typeScale,
    typeFamily: fontFamily,
    tones: toneStyles(scheme),
    shadows: getShadows(scheme),
    gradients: getGradients(scheme),
    ring: ringBorder(scheme),
    layering,
    staggerDelay,
    styles,
    motion: {
      reduced: a11y.reducedMotion,
      pick: pickMotion,
      fallback: reducedMotion,
    },
    a11y,
    scaledSize: (base) => Math.round(base * a11y.fontScale),
  };
}
