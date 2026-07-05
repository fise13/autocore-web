import { Platform, type TextStyle } from 'react-native';

import type { ColorScheme, SemanticColors } from '@/theme/colors';
import { form } from '@/theme/form';
import { fontFamily } from '@/theme/typography';

export const INPUT_HEIGHT = form.controlHeight;
export const INPUT_HEIGHT_LG = form.controlHeightLg;
export const INPUT_HEIGHT_COMPACT = form.controlHeight;
export const INPUT_MULTILINE_MIN_HEIGHT = form.multilineMinHeight;

export const inputShellStyle = {
  borderRadius: form.controlRadius,
  borderWidth: form.controlBorderWidth,
  paddingHorizontal: form.controlPaddingHorizontal,
  gap: form.controlGap,
} as const;

export function inputSurfaceBackground(scheme: ColorScheme, colors: SemanticColors): string {
  if (scheme === 'light') return 'transparent';
  return 'rgba(255, 255, 255, 0.05)';
}

export function inputDisabledBackground(scheme: ColorScheme, colors: SemanticColors): string {
  if (scheme === 'light') return 'rgba(17, 19, 26, 0.06)';
  return 'rgba(255, 255, 255, 0.08)';
}

export function createInputTextStyle(color: string): TextStyle {
  return {
    fontSize: form.controlFontSize,
    lineHeight: form.controlLineHeight,
    letterSpacing: form.controlLetterSpacing,
    fontFamily: fontFamily.sans,
    fontWeight: '400',
    color,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    flex: 1,
    ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {}),
  };
}

export function createMultilineTextStyle(color: string): TextStyle {
  return {
    fontSize: form.controlFontSize,
    lineHeight: form.controlLineHeight,
    letterSpacing: form.controlLetterSpacing,
    fontFamily: fontFamily.sans,
    fontWeight: '400',
    color,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    flex: 1,
    width: '100%',
    textAlignVertical: 'top',
  };
}
