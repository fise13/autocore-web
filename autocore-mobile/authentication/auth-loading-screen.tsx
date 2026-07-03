import { AppLoadingScreen } from '@/components/ui/app-loading-screen';

export function AuthLoadingScreen({
  message = 'Загрузка…',
}: {
  message?: string;
}) {
  return <AppLoadingScreen message={message} />;
}
