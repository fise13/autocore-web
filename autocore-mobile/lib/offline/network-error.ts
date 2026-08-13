/** Duck-typed so tests can run under node without the Firebase / RN client. */
export type ErrorLike = {
  status?: number;
  code?: string;
  message?: string;
  name?: string;
};

export function isNetworkError(error: unknown): boolean {
  const candidate = (error ?? {}) as ErrorLike;
  if (candidate.status === 0) return true;
  const code = String(candidate.code ?? '').toLowerCase();
  if (
    code === 'unavailable' ||
    code === 'auth/network-request-failed' ||
    code.includes('network')
  ) {
    return true;
  }
  const text = String(candidate.message ?? '').toLowerCase();
  return (
    text.includes('network request failed') ||
    text.includes('failed to fetch') ||
    text.includes('the internet connection appears to be offline') ||
    text.includes('offline') ||
    text.includes('econnrefused') ||
    text.includes('enotfound') ||
    text.includes('software caused connection abort') ||
    text.includes('no internet')
  );
}
