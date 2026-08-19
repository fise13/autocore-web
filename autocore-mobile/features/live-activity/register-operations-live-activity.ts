import { Platform } from 'react-native';
import { widgetsDirectory } from 'expo-widgets';

/**
 * Side-effect import: ensures `createLiveActivity(...)` / `createWidget(...)`
 * run at bundle load so each layout string is written into the App Group before
 * any Activity starts or WidgetKit asks for a timeline. Import this from the
 * signed-in root layout — do not lazy-load it.
 */
import { ensureLiveActivityAppIconUri } from './ensure-live-activity-icon';
import {
  OPERATIONS_LIVE_ACTIVITY_LAYOUT_BUILD,
  OperationsLiveActivity,
} from './operations-live-activity';
import { AutoCoreIntakeWidget } from './widgets/intake-bay-widget';
import { AutoCorePayWidget } from './widgets/pay-widget';
import { AutoCoreScanWidget } from './widgets/scan-widget';
import { AutoCoreTodayWidget } from './widgets/today-widget';

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
        'Dynamic Island and widgets will render blank. Enable App Group ' +
        'group.com.wise.autocore.mobile for AutoCore + ExpoWidgetsTarget, then rebuild.',
    );
    return;
  }
  void ensureLiveActivityAppIconUri().then((uri) => {
    console.log(`[live-activity] appIcon=${uri ? 'ok' : 'missing'}`);
  });
}

// Touch the factories so Metro does not tree-shake the modules.
void OperationsLiveActivity;
void AutoCoreTodayWidget;
void AutoCoreScanWidget;
void AutoCoreIntakeWidget;
void AutoCorePayWidget;
