import { useScreenEnter } from '@/animations';

type SearchEnterConfig = {
  delay?: number;
  translateY?: number;
  scaleFrom?: number;
  duration?: number;
  spring?: boolean;
};

export function useSearchEnter(config: SearchEnterConfig = {}) {
  return useScreenEnter(config);
}
