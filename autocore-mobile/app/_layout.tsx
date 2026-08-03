import 'react-native-gesture-handler';
import '../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useSyncExternalStore } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

import { AuthGate } from '@/authentication/auth-gate';
import { AuthProvider } from '@/authentication/auth-provider';
import { InAppBannerProvider } from '@/components/notifications';
import { RootNavigator } from '@/components/navigation/root-navigator';
import { ThemeProvider } from '@/hooks/use-theme';
import { ToastProvider } from '@/components/ui/toast';
import { markStartup } from '@/lib/performance/startup-tracer';
import { queryClient } from '@/lib/query-client';
import {
  getQueryPersistBuster,
  mmkvQueryPersister,
  subscribeQueryPersistBuster,
} from '@/lib/storage/mmkv-query-persister';
import { ensureAsyncStorageMigrated } from '@/lib/storage/migrate-async-storage';
import { warmSessionCacheFromDisk } from '@/lib/startup/warm-session-cache';

export { ErrorBoundary } from '@/components/error-boundary-screen';

markStartup('js_bundle_eval');
void ensureAsyncStorageMigrated();
warmSessionCacheFromDisk();

SplashScreen.preventAutoHideAsync();

function AppProviders({ children }: { children: React.ReactNode }) {
  const buster = useSyncExternalStore(
    subscribeQueryPersistBuster,
    getQueryPersistBuster,
    getQueryPersistBuster,
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: mmkvQueryPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        buster,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.queryKey[0] === 'realtime' || query.queryKey[0] === 'api',
        },
      }}
      onSuccess={() => {
        void queryClient.resumePausedMutations();
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <BottomSheetModalProvider>
            <AuthGate>{children}</AuthGate>
            <InAppBannerProvider />
            <ToastProvider />
          </BottomSheetModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppProviders>
          <RootNavigator />
        </AppProviders>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
