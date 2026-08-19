import { memo } from 'react';
import { useSyncExternalStore } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompanyAvatar } from '@/components/account/company-avatar';
import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import {
  getCompanySwitchState,
  subscribeCompanySwitch,
  useCompanySwitchState,
} from '@/lib/session/company-switch-controller';
import { tokens } from '@/theme';

/**
 * Full-screen workspace switch — visible copy + spinner while the new org loads.
 * Mounted once in the authenticated app tree so every switch path shares it.
 */
export const CompanySwitchOverlay = memo(function CompanySwitchOverlay() {
  const switching = useCompanySwitchState();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  if (!switching) return null;

  return (
    <Modal
      visible
      animationType={reducedMotion ? 'none' : 'fade'}
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => {
        // Block back while the swap is in flight.
      }}
    >
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Switching to ${switching.name}`}
        style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}
      >
        <View style={styles.center}>
          <CompanyAvatar companyId={switching.companyId} name={switching.name} size="lg" />
          <View style={styles.copy}>
            <Text variant="footnote" color="muted" style={styles.kicker}>
              Switching workspace
            </Text>
            <Text variant="title3" numberOfLines={2} style={styles.title}>
              {switching.name}
            </Text>
          </View>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    </Modal>
  );
});

export function useIsCompanySwitching(): boolean {
  return useSyncExternalStore(
    subscribeCompanySwitch,
    () => Boolean(getCompanySwitchState()),
    () => false,
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space.screenX,
    gap: tokens.space.section,
  },
  copy: {
    alignItems: 'center',
    gap: tokens.space.micro,
    maxWidth: 280,
  },
  kicker: {
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
});
