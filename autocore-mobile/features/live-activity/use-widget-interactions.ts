import { useEffect } from 'react';
import { Platform } from 'react-native';
import { addUserInteractionListener } from 'expo-widgets';

import { openNotificationDeepLink } from '@/services/notifications/deep-link-resolver';

import { WIDGET_URL } from './lib/widget-links';

/**
 * Home Screen widget buttons (expo-widgets App Intent targets).
 * Lock accessories stay tap-to-open via `widgetURL` only.
 */
export function useWidgetInteractions() {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const subscription = addUserInteractionListener((event) => {
      const source = event.source ?? '';
      const target = event.target ?? '';
      if (source === 'AutoCoreIntake' && target.includes('openReady')) {
        void openNotificationDeepLink(WIDGET_URL.intakeReady);
        return;
      }
      if (source === 'AutoCoreIntake' && target.includes('continueIntake')) {
        void openNotificationDeepLink(WIDGET_URL.intakeActive);
        return;
      }
      if (source === 'AutoCoreScan' && target.includes('openScan')) {
        void openNotificationDeepLink(WIDGET_URL.scan);
      }
    });
    return () => subscription.remove();
  }, []);
}
