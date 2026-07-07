import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy web join links → /invite/[token] */
export default function JoinRedirect() {
  const { token, invite } = useLocalSearchParams<{ token?: string; invite?: string }>();
  const value = (token ?? invite)?.trim();

  if (value) {
    return <Redirect href={`/invite/${encodeURIComponent(value)}` as never} />;
  }

  return <Redirect href="/(auth)/login" />;
}
