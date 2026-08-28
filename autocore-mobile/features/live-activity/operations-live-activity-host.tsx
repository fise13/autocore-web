import { useAutoCoreWidgets } from './use-autocore-widgets';
import { useOperationsLiveActivity } from './use-operations-live-activity';
import { useWidgetInteractions } from './use-widget-interactions';

/**
 * Mount once under the signed-in tab shell to drive Home / Lock Screen
 * widgets. The Dynamic Island is owned by `IntakeSyncHead` (it has to
 * outlive this host — the camera route unmounts the tab shell).
 */
export function OperationsLiveActivityHost() {
  useOperationsLiveActivity();
  useAutoCoreWidgets();
  useWidgetInteractions();
  return null;
}
