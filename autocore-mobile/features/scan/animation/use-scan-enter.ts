import { useScreenEnter } from '@/animations';

type ScanEnterConfig = {
  delay?: number;
  translateY?: number;
  scaleFrom?: number;
  duration?: number;
};

export function useScanEnter(config: ScanEnterConfig = {}) {
  return useScreenEnter(config);
}
