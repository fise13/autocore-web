import { toast } from '@/components/ui';

import { humanizeIntakeOutboxError } from '../store/intake-outbox';

function describeError(error: unknown): string | undefined {
  if (typeof error === 'string') return humanizeIntakeOutboxError(error);
  if (error instanceof Error) return humanizeIntakeOutboxError(error.message);
  return undefined;
}

/** Destructive toast with an optional Retry action. */
export function toastIntakeFailure(input: {
  title: string;
  error?: unknown;
  retry?: () => void;
}): void {
  toast({
    title: input.title,
    description: describeError(input.error),
    variant: 'destructive',
    duration: input.retry ? 8_000 : undefined,
    action: input.retry
      ? {
          label: 'Retry',
          onPress: input.retry,
        }
      : undefined,
  });
}
