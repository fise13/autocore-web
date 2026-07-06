import { InviteAcceptScreen } from '@/features/organization/invite-accept-screen';
import { useLocalSearchParams } from 'expo-router';

export default function InviteRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  if (!token) return null;
  return <InviteAcceptScreen token={String(token)} />;
}
