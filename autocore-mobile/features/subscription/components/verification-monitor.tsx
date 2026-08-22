import { useCallback, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';

import { CollectionRow, ListSection, Text } from '@/components/ui';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import {
  pendingVerificationsFor,
  subscribePendingVerification,
  type PendingVerification,
} from '@/lib/subscriptions/pending-verification';
import { drainPendingVerifications } from '@/lib/subscriptions/subscription-manager';
import { verificationBackoffMs } from '@/lib/subscriptions/verification-schedule';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';

/**
 * What the device is still owed by the server.
 *
 * Renders nothing on the happy path — a purchase spends about a second in the
 * queue. It appears only once something is genuinely stuck, and then it says
 * *what*: which transaction, how many attempts, what the server last answered,
 * and when the next automatic attempt is due.
 *
 * This exists because the previous state of the world was a single sentence of
 * reassuring copy over a purchase that could not complete. The transaction id
 * in particular is the one thing support needs and the one thing nobody could
 * get at without a debugger.
 */
export function VerificationMonitor() {
  const { companyId } = useSession();
  const { colors } = useTheme();
  const [retrying, setRetrying] = useState(false);

  const items = useSyncExternalStore(
    subscribePendingVerification,
    () => pendingVerificationsFor(companyId),
    () => pendingVerificationsFor(companyId),
  );

  const retry = useCallback(async () => {
    if (!companyId) return;
    setRetrying(true);
    haptics.light();
    try {
      await drainPendingVerifications(companyId, { force: true });
    } finally {
      setRetrying(false);
    }
  }, [companyId]);

  if (items.length === 0) return null;

  return (
    <ListSection
      title="Unconfirmed purchases"
      footer="Kept on this device until the server records them. Quote the transaction id to support."
    >
      {items.map((item) => (
        <View
          key={item.transactionId}
          style={{
            paddingHorizontal: tokens.space.screenX,
            paddingVertical: tokens.space.stack,
            gap: 6,
          }}
        >
          <Text variant="body" style={{ color: colors.foreground, fontWeight: '600' }}>
            {item.productId}
          </Text>
          <Detail label="Transaction" value={item.transactionId} selectable />
          <Detail label="Attempts" value={String(item.attempts)} />
          <Detail label="Last error" value={item.lastError ?? 'none yet'} />
          <Detail label="Next attempt" value={nextAttemptLabel(item)} />
        </View>
      ))}

      <CollectionRow
        title="Retry now"
        value={retrying ? 'Retrying…' : undefined}
        disabled={retrying}
        onPress={() => void retry()}
      />
    </ListSection>
  );
}

function Detail({
  label,
  value,
  selectable = false,
}: {
  label: string;
  value: string;
  selectable?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text variant="caption" style={{ color: colors.mutedForeground, minWidth: 96 }}>
        {label}
      </Text>
      <Text
        variant="caption"
        selectable={selectable}
        style={{ color: colors.foreground, flex: 1 }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * When the queue will try again on its own.
 *
 * Reads the same schedule the drain uses rather than restating it, so the
 * number on screen cannot drift from the number that governs the retry.
 */
function nextAttemptLabel(item: PendingVerification): string {
  if (item.lastAttemptAt === null) return 'now';
  const dueAt = item.lastAttemptAt + verificationBackoffMs(item.attempts);
  const remaining = dueAt - Date.now();
  if (remaining <= 0) return 'now';

  const minutes = Math.round(remaining / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `in ${hours} h`;
}
