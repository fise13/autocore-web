import { useOperationsLiveActivity } from './use-operations-live-activity';

/** Mount once under the signed-in shell to drive iOS Dynamic Island Live Activities. */
export function OperationsLiveActivityHost() {
  useOperationsLiveActivity();
  return null;
}
