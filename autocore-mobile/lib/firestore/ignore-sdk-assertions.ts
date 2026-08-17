import { LogBox } from 'react-native';

/**
 * Firestore JS 12 on React Native throws INTERNAL ASSERTION (c050, ca9, b815)
 * from write/listen streams. They are SDK bugs, not user errors — LogBox
 * otherwise toasts every unhandled rejection and the overlay fills up.
 */
const FIRESTORE_ASSERTION = /FIRESTORE \(.*\) INTERNAL ASSERTION FAILED/;

LogBox.ignoreLogs([FIRESTORE_ASSERTION, 'INTERNAL ASSERTION FAILED']);

function isFirestoreAssertion(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : typeof reason === 'string'
        ? reason
        : String(reason ?? '');
  return FIRESTORE_ASSERTION.test(message) || message.includes('INTERNAL ASSERTION FAILED');
}

const g = globalThis as typeof globalThis & {
  onunhandledrejection?: ((event: { reason?: unknown; preventDefault?: () => void }) => void) | null;
};

const previous = g.onunhandledrejection;
g.onunhandledrejection = (event) => {
  if (isFirestoreAssertion(event?.reason)) {
    event?.preventDefault?.();
    return;
  }
  previous?.(event);
};
