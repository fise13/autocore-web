import { Keyboard, View } from 'react-native';

import { CatalogSectionHeader, FlashList, Text } from '@/components/ui';
import { rhythm, spacing } from '@/theme';

import { EngineCatalogRow } from './engine-catalog-row';
import { EnginesHeaderBlock } from './engines-header-block';
import type { EnginesListProps } from './engines-list.types';

export type { EnginesListProps };

/**
 * The Engines list on React Native.
 *
 * iOS resolves `engines-list.ios.tsx` instead — a native SwiftUI `List`, so
 * that holding a row produces the genuine UIKit context menu. This file is what
 * Android and web get, and it stays the reference for row content.
 */
export function EnginesList({
  rows,
  header,
  emptyMessage,
  onUnitPress,
  actions,
  incomingActions,
  uploadProgressByJobId,
  previewUriByJobId,
  onScrollOffset,
  bottomInset,
}: EnginesListProps) {
  return (
    <FlashList
      data={rows}
      keyExtractor={(row) => row.key}
      getItemType={(row) => row.type}
      ListHeaderComponent={<EnginesHeaderBlock header={header} />}
      ListEmptyComponent={
        emptyMessage ? (
          <View style={{ paddingHorizontal: rhythm.pad, paddingTop: spacing[6], gap: spacing[2] }}>
            <Text variant="headline" style={{ textAlign: 'center' }}>
              {emptyMessage.title}
            </Text>
            <Text variant="subheadline" color="muted" style={{ textAlign: 'center' }}>
              {emptyMessage.hint}
            </Text>
          </View>
        ) : null
      }
      onScroll={(event) => onScrollOffset?.(event.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{
        paddingBottom: bottomInset + rhythm.tabBarBreathing,
      }}
      renderItem={({ item }) =>
        item.type === 'header' ? (
          <CatalogSectionHeader kicker={item.kicker} title={item.title} meta={item.meta} />
        ) : (
          <EngineCatalogRow
            motor={item.motor}
            position={item.position}
            onPress={() => {
              Keyboard.dismiss();
              onUnitPress(item.motor, item.lane);
            }}
            actions={actions}
            incomingActions={item.lane === 'incoming' ? incomingActions : undefined}
            uploadProgress={
              item.motor.intakeJobId
                ? (uploadProgressByJobId.get(item.motor.intakeJobId) ?? null)
                : null
            }
            previewUri={
              item.motor.intakeJobId
                ? (previewUriByJobId.get(item.motor.intakeJobId) ?? null)
                : null
            }
          />
        )
      }
    />
  );
}
