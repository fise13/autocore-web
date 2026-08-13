import { Platform } from 'react-native';
import { widgetsDirectory } from 'expo-widgets';

/**
 * Side-effect import: ensures `createLiveActivity(...)` runs at bundle load so
 * the layout string is written into the App Group before any Activity starts.
 * Import this from the signed-in root layout — do not lazy-load it.
 */
import { ensureLiveActivityAppIconUri } from './ensure-live-activity-icon';
import {
  OPERATIONS_LIVE_ACTIVITY_LAYOUT_BUILD,
  OperationsLiveActivity,
} from './operations-live-activity';

export function assertLiveActivityAppGroup(): void {
  if (Platform.OS !== 'ios') return;
  console.log(
    `[live-activity] layout=${OPERATIONS_LIVE_ACTIVITY_LAYOUT_BUILD} widgetsDirectory=${
      widgetsDirectory ? 'ok' : 'null'
    }`,
  );
  if (!widgetsDirectory) {
    console.error(
      '[live-activity] App Group unavailable (widgetsDirectory is null). ' +
        'Dynamic Island will render blank. Enable App Group ' +
        'group.com.wise.autocore.mobile for AutoCore + ExpoWidgetsTarget, then rebuild.',
    );
    return;
  }
  void ensureLiveActivityAppIconUri().then((uri) => {
    console.log(`[live-activity] appIcon=${uri ? 'ok' : 'missing'}`);
  });
}

// Touch the factory so Metro does not tree-shake the module.
void OperationsLiveActivity;
