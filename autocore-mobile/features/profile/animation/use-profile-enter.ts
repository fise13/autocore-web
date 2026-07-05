import { useScreenEnter } from '@/animations';

type ProfileEnterConfig = {
  delay?: number;
  translateY?: number;
  duration?: number;
};

export function useProfileEnter(config: ProfileEnterConfig = {}) {
  return useScreenEnter(config);
}
