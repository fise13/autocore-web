import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { AlertTriangleIcon, HelpCircleIcon } from '@/assets/icons';
import type { IconProps } from '@/assets/icons';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

import { Button } from './button';
import { EmptyState } from './empty-state';
import { Skeleton } from './skeleton';
import { Text } from './text';

export type ContentStateKind = 'ready' | 'loading' | 'empty' | 'error' | 'offline';

type ContentStateProps = {
  state: ContentStateKind;
  children: ReactNode;
  loadingFallback?: ReactNode;
  emptyIcon?: React.ComponentType<IconProps>;
  emptyTitle?: string;
  emptyDescription?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  errorTitle?: string;
  errorDescription?: string;
  onRetry?: () => void;
  offlineTitle?: string;
  offlineDescription?: string;
  style?: ViewStyle;
};

/** Screen / list async gate — one contract for empty/loading/error/offline. */
export function ContentState({
  state,
  children,
  loadingFallback,
  emptyIcon = HelpCircleIcon,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'There’s nothing to show right now.',
  onEmptyAction,
  emptyActionLabel = 'Get started',
  errorTitle = 'Something went wrong',
  errorDescription = 'Pull to refresh or try again.',
  onRetry,
  offlineTitle = 'You’re offline',
  offlineDescription = 'Reconnect to load the latest data.',
  style,
}: ContentStateProps) {
  const { colors } = useTheme();

  if (state === 'ready') {
    return <>{children}</>;
  }

  if (state === 'loading') {
    return (
      <View style={[{ flex: 1, padding: tokens.space.screenX, gap: tokens.space.stack }, style]}>
        {loadingFallback ?? <ListSkeleton />}
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={[{ flex: 1, justifyContent: 'center' }, style]}>
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          primaryAction={
            onEmptyAction
              ? { label: emptyActionLabel, onPress: onEmptyAction }
              : undefined
          }
        />
      </View>
    );
  }

  if (state === 'offline') {
    return (
      <View
        style={[
          {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.space.section,
            gap: tokens.space.stack,
          },
          style,
        ]}
      >
        <AlertTriangleIcon size="lg" color={colors.mutedForeground} />
        <Text variant="headline" style={{ textAlign: 'center' }}>
          {offlineTitle}
        </Text>
        <Text variant="footnote" color="muted" style={{ textAlign: 'center' }}>
          {offlineDescription}
        </Text>
        {onRetry ? (
          <Button variant="secondary" onPress={onRetry} inline>
            Try again
          </Button>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: tokens.space.section,
          gap: tokens.space.stack,
        },
        style,
      ]}
    >
      <AlertTriangleIcon size="lg" color={colors.destructive} />
      <Text variant="headline" style={{ textAlign: 'center' }}>
        {errorTitle}
      </Text>
      <Text variant="footnote" color="muted" style={{ textAlign: 'center' }}>
        {errorDescription}
      </Text>
      {onRetry ? (
        <Button onPress={onRetry} inline>
          Retry
        </Button>
      ) : null}
    </View>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: tokens.space.screenX,
        backgroundColor: colors.card,
        borderRadius: tokens.radius.group,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index}>
          {index > 0 ? (
            <View
              style={{
                height: tokens.control.hairline,
                backgroundColor: colors.border,
                marginLeft: tokens.space.stack + 2 + 20 + tokens.space.stack,
                opacity: 0.65,
              }}
            />
          ) : null}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space.stack,
              minHeight: tokens.control.hitTarget + 8,
              paddingHorizontal: tokens.space.stack + 2,
              paddingVertical: tokens.space.inline + 2,
            }}
          >
            <Skeleton width={20} height={20} rounded="control" />
            <View style={{ flex: 1, gap: tokens.space.micro }}>
              <Skeleton width="62%" height={15} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function DetailSkeleton() {
  return (
    <View style={{ gap: tokens.space.section }}>
      <Skeleton width="55%" height={28} />
      <Skeleton width="90%" height={16} />
      <Skeleton width="100%" height={120} rounded="lg" />
      <ListSkeleton rows={4} />
    </View>
  );
}

export function FormSkeleton() {
  return (
    <View style={{ gap: tokens.space.stack }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={{ gap: 8 }}>
          <Skeleton width="30%" height={12} />
          <Skeleton width="100%" height={48} rounded="lg" />
        </View>
      ))}
      <Skeleton width="100%" height={52} rounded="full" />
    </View>
  );
}
