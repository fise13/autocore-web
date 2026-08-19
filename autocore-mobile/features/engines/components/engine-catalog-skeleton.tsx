import { Fragment } from 'react';
import { View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks';

import { eng } from '../layout';

/**
 * First paint of the yard.
 *
 * The blocks sit exactly where the real rows will: same thumbnail, same two
 * lines of text, same grade tag, same hairline. Nothing jumps when the
 * catalog arrives, which is the only reason to draw a skeleton at all.
 */
function SkeletonRow() {
  const { colors } = useTheme();

  return (
    <View>
      <View
        style={{
          paddingHorizontal: eng.pad,
          paddingVertical: eng.stack,
          flexDirection: 'row',
          alignItems: 'center',
          gap: eng.stack,
        }}
      >
        <Skeleton width={eng.thumb} height={eng.thumb} style={{ borderRadius: eng.thumbRadius }} />
        <View style={{ flex: 1, gap: eng.tight }}>
          <Skeleton width="48%" height={15} rounded="control" />
          <Skeleton width="32%" height={11} rounded="control" />
        </View>
        <Skeleton width={64} height={20} style={{ borderRadius: eng.pillRadius }} />
      </View>
      <View
        style={{
          height: eng.rule,
          marginLeft: eng.pad + eng.thumb + eng.stack,
          backgroundColor: colors.border,
        }}
      />
    </View>
  );
}

export function EngineCatalogSkeleton({
  groups = 2,
  rows = 3,
}: {
  groups?: number;
  rows?: number;
}) {
  return (
    <View pointerEvents="none" accessible={false}>
      {Array.from({ length: groups }).map((_, group) => (
        <Fragment key={group}>
          <View
            style={{
              paddingHorizontal: eng.pad,
              paddingTop: group === 0 ? eng.stack : eng.block,
              paddingBottom: eng.inline,
              gap: 6,
            }}
          >
            <Skeleton width={64} height={10} rounded="control" />
            <Skeleton width={120} height={18} rounded="control" />
          </View>
          {Array.from({ length: rows }).map((__, row) => (
            <SkeletonRow key={row} />
          ))}
        </Fragment>
      ))}
    </View>
  );
}
