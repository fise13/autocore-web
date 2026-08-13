import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { getMutationOutboxSnapshot, subscribeMutationOutbox } from '@/lib/offline/mutation-outbox';
import { useAuthStore } from '@/store/auth-store';
import { radius, spacing, zIndex } from '@/theme';

function subscribeOutbox(onStoreChange: () => void) {
  return subscribeMutationOutbox(onStoreChange);
}

function getOutboxPending() {
  return getMutationOutboxSnapshot().pendingCount;
}

export function OfflineSessionBanner() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isOnline = useAuthStore((s) => s.isOnline);
  const pendingCount = useSyncExternalStore(subscribeOutbox, getOutboxPending, getOutboxPending);

  if (isOnline && pendingCount === 0) return null;

  const title = isOnline
    ? `Syncing ${pendingCount} saved ${pendingCount === 1 ? 'change' : 'changes'}`
    : pendingCount > 0
      ? `Offline · ${pendingCount} saved on this iPhone`
      : 'Offline · showing last saved data';

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing[1] }]}>
      <View style={[styles.pill, { backgroundColor: colors.offlineSubtle, borderColor: colors.offlineBorder, borderWidth: 1 }]}>
        <Text variant="caption" style={{ color: colors.offlineOnSubtle, textAlign: 'center' }}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    zIndex: zIndex.toast - 2,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
});
