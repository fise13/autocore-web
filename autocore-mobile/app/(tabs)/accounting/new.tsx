import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy tab-stack path — compose lives at `/finance/new` so the dock is covered. */
export default function LegacyNewOperationRoute() {
  const params = useLocalSearchParams<Record<string, string>>();
  return <Redirect href={{ pathname: '/finance/new', params }} />;
}
