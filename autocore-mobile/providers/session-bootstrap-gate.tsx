import { memo } from 'react';

/**
 * Pass-through shell — realtime listeners live in SessionRealtimeHead.
 * UI renders immediately; snapshots hydrate from disk cache in the background.
 */
export const SessionBootstrapGate = memo(function SessionBootstrapGate({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
});
