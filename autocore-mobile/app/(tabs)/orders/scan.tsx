import { useRouter } from 'expo-router';
import { ScanScreen } from '@/features/scan/scan-screen';

/** Full-screen scanner opened above the order composer modal. */
export default function OrderScanRoute() {
  const router = useRouter();

  return (
    <ScanScreen
      onClose={() => {
        if (router.canGoBack()) router.back();
      }}
    />
  );
}
