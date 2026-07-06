import { NotificationService } from '@/services/notifications';

let wasOffline = false;

/** Call from network layer when connectivity changes. */
export function notifyNetworkStatus(isOnline: boolean, retry?: () => void): void {
  if (!isOnline) {
    wasOffline = true;
    return;
  }
  if (wasOffline) {
    wasOffline = false;
    NotificationService.notifySync({ type: 'synced' });
  }
}

/** Map HTTP/API errors to actionable notification errors. */
export function notifyApiError(
  status: number | undefined,
  options?: { message?: string; retry?: () => void },
): void {
  if (status === 401) {
    NotificationService.notifyError('auth_expired', options);
    return;
  }
  if (status === 403) {
    NotificationService.notifyError('permission_denied', options);
    return;
  }
  if (status === 503 || status === 502) {
    NotificationService.notifyError('server_unavailable', options);
    return;
  }
  if (!status) {
    NotificationService.notifyError('network', options);
    return;
  }
  NotificationService.notifyError('unexpected', options);
}
