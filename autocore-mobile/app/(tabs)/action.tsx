import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { presentActionSheet } from '@/lib/shell/present-action-sheet';
import { useTheme } from '@/hooks/use-theme';

/**
 * Action tab is a dock affordance, not a destination.
 * Present the New menu and bounce back to the previous tab.
 */
export default function ActionRoute() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    presentActionSheet();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
