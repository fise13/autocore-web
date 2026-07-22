import { AppLoadingScreen } from '@/components/ui/app-loading-screen';

export function AuthLoadingScreen({
  message = 'Загрузка…',
}: {
  message?: string;
}) {
  // Hides the native splash so the branded React loader is what the user sees.
  return <AppLoadingScreen message={message} />;
}
