import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { stackNavigationGuard } from '@/lib/navigation/stack-navigation-guard';

/** Clears the profile/settings stack push guard when this screen is focused. */
export function useReleaseStackNavigationOnFocus() {
  useFocusEffect(
    useCallback(() => {
      stackNavigationGuard.release();
    }, []),
  );
}
