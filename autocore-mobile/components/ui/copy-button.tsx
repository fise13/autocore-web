import { forwardRef, useCallback, useRef, useState } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';

import { CheckIcon, CopyIcon } from '@/assets/icons';
import { useTheme } from '@/hooks';
import { useControlledState } from '@/hooks/use-controlled-state';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';
import { radius } from '@/theme';

export type CopyButtonVariant =
  | 'default'
  | 'accent'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export type CopyButtonSize = 'default' | 'xs' | 'sm' | 'lg';

export type CopyButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  content: string;
  copied?: boolean;
  onCopiedChange?: (copied: boolean, content?: string) => void;
  delay?: number;
  variant?: CopyButtonVariant;
  size?: CopyButtonSize;
  style?: ViewStyle;
  /** Show toast on copy (uses NotificationService) */
  showToast?: boolean;
};

const SIZES: Record<CopyButtonSize, number> = {
  default: 36,
  xs: 28,
  sm: 32,
  lg: 40,
};

const ICON_SIZES: Record<CopyButtonSize, 'xs' | 'sm' | 'md'> = {
  default: 'sm',
  xs: 'xs',
  sm: 'sm',
  lg: 'md',
};

export const CopyButton = forwardRef<React.ComponentRef<typeof Pressable>, CopyButtonProps>(
  function CopyButton(
    {
      content,
      copied,
      onCopiedChange,
      onPress,
      variant = 'default',
      size = 'default',
      delay = 3000,
      disabled,
      style,
      showToast = false,
      accessibilityLabel = 'Copy',
      ...props
    },
    ref,
  ) {
    const { colors } = useTheme();
    const [pressed, setPressed] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isCopied, setIsCopied] = useControlledState({
      value: copied,
      onChange: onCopiedChange,
      defaultValue: false,
    });

    const dimension = SIZES[size];
    const iconSize = ICON_SIZES[size];

    const variantStyle: ViewStyle = (() => {
      switch (variant) {
        case 'accent':
          return { backgroundColor: colors.accent };
        case 'destructive':
          return { backgroundColor: colors.destructive };
        case 'outline':
          return {
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
          };
        case 'secondary':
          return { backgroundColor: colors.secondary };
        case 'ghost':
        case 'link':
          return { backgroundColor: 'transparent' };
        default:
          return { backgroundColor: colors.primary };
      }
    })();

    const iconColor = (() => {
      switch (variant) {
        case 'accent':
          return colors.accentForeground;
        case 'destructive':
          return colors.destructiveForeground;
        case 'outline':
        case 'ghost':
        case 'link':
          return colors.foreground;
        case 'secondary':
          return colors.secondaryForeground;
        default:
          return colors.primaryForeground;
      }
    })();

    const handleCopy = useCallback(
      async (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
        onPress?.(e);
        if (isCopied || !content) return;

        try {
          await Clipboard.setStringAsync(content);
          haptics.success();
          setIsCopied(true);
          onCopiedChange?.(true, content);

          if (showToast) {
            void import('@/services/notifications').then(({ NotificationService }) => {
              NotificationService.toastInfo('Copied');
            });
          }

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setIsCopied(false);
            onCopiedChange?.(false);
          }, delay);
        } catch (error) {
          console.error('Error copying content', error);
        }
      },
      [content, delay, isCopied, onCopiedChange, onPress, setIsCopied, showToast],
    );

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={isCopied ? 'Copied' : accessibilityLabel}
        accessibilityState={{ disabled: disabled ?? false }}
        disabled={disabled}
        onPress={(e) => void handleCopy(e)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        // Static array, not `({ pressed }) => …`. NativeWind's JSX runtime
        // normalises `style` before Pressable sees it and drops a function,
        // taking the whole style object — layout included — with it.
        style={[
          {
            width: dimension,
            height: dimension,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.md,
            opacity: disabled ? 0.5 : pressed ? tokens.opacity.pressed : 1,
          },
          variantStyle,
          style,
        ]}
        {...props}
      >
        <Animated.View key={isCopied ? 'check' : 'copy'} entering={ZoomIn.duration(250)} exiting={ZoomOut.duration(200)}>
          {isCopied ? (
            <CheckIcon size={iconSize} color={iconColor} strokeWidth={2} />
          ) : (
            <CopyIcon size={iconSize} color={iconColor} strokeWidth={2} />
          )}
        </Animated.View>
      </Pressable>
    );
  },
);
