import { Redirect } from 'expo-router';

/** Old Settings path — Earnings now lives on the Work stack. */
export default function MyEarningsLegacyRedirect() {
  return <Redirect href="/earnings" />;
}
