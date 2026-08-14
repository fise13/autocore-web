import { View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

import { EarningsCard } from './earnings-card';

function ListSkeleton({ rows }: { rows: number }) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: tokens.space.inline }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginHorizontal: tokens.space.screenX + tokens.space.stack,
        }}
      >
        <Skeleton width={88} height={14} rounded="sm" />
        <Skeleton width={48} height={14} rounded="sm" />
      </View>
      <EarningsCard>
        {Array.from({ length: rows }).map((_, index) => (
          <View
            key={index}
            style={{
              paddingHorizontal: tokens.space.stack + 2,
              paddingVertical: tokens.space.stack,
              borderTopWidth: index === 0 ? 0 : tokens.control.hairline,
              borderTopColor: colors.border,
              gap: 8,
            }}
          >
            <Skeleton width="42%" height={16} rounded="sm" />
            <Skeleton width="64%" height={12} rounded="sm" />
          </View>
        ))}
      </EarningsCard>
    </View>
  );
}

export function EarningsSkeleton() {
  return (
    <View style={{ gap: tokens.space.section }}>
      <EarningsCard>
        <View style={{ padding: tokens.space[4], gap: tokens.space.stack }}>
          <Skeleton width={120} height={12} rounded="sm" />
          <Skeleton width="70%" height={34} rounded="md" />
          <Skeleton width="55%" height={12} rounded="sm" />
          <View style={{ flexDirection: 'row', gap: tokens.space.stack, marginTop: tokens.space.micro }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={48} height={11} rounded="sm" />
              <Skeleton width={88} height={18} rounded="sm" />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={40} height={11} rounded="sm" />
              <Skeleton width={32} height={18} rounded="sm" />
            </View>
          </View>
        </View>
        <View style={{ padding: tokens.space[4], gap: 8 }}>
          <Skeleton width={96} height={16} rounded="sm" />
          <Skeleton width="80%" height={12} rounded="sm" />
        </View>
      </EarningsCard>

      <View style={{ gap: tokens.space.inline }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginHorizontal: tokens.space.screenX + tokens.space.stack,
          }}
        >
          <Skeleton width={72} height={14} rounded="sm" />
          <Skeleton width={56} height={14} rounded="sm" />
        </View>
        <EarningsCard>
          <View
            style={{
              flexDirection: 'row',
              gap: tokens.space.micro,
              padding: tokens.space.stack,
            }}
          >
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} width={36} height={36} rounded="control" style={{ flex: 1 }} />
            ))}
          </View>
        </EarningsCard>
      </View>

      <ListSkeleton rows={3} />
      <ListSkeleton rows={3} />
    </View>
  );
}
