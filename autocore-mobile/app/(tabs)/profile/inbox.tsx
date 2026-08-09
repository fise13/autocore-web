import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Legacy tab path — keep for deep links / old pushes, forward to root Activity
 * so Home ↔ Activity gets a normal stack slide.
 */
export default function ProfileInboxRedirect() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/inbox', params }} />;
}
