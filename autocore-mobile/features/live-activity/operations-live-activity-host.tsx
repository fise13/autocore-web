import { useAutoCoreWidgets } from './use-autocore-widgets';
import { useOperationsLiveActivity } from './use-operations-live-activity';
import { useWidgetInteractions } from './use-widget-interactions';

/**
 * Mount once under the signed-in shell to drive every iOS presentation surface:
 * the Dynamic Island, the Lock Screen Live Activity, and the Home / Lock Screen
 * widgets. Renders nothing, so churn here never re-renders the navigation tree.
 */
export function OperationsLiveActivityHost() {
  useOperationsLiveActivity();
  useAutoCoreWidgets();
  useWidgetInteractions();
  return null;
}
