import { AppLoadingScreen } from '@/components/ui/app-loading-screen';

type AuthBootLoadingProps = {
  title?: string;
  subtitle?: string;
};

/** @deprecated Use AppLoadingScreen — kept for call sites that pass title/subtitle. */
export function AuthBootLoading({ title = 'Загрузка…' }: AuthBootLoadingProps) {
  return <AppLoadingScreen message={title} />;
}
