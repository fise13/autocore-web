import NetInfo from '@react-native-community/netinfo';
import { updateProfile, type User } from 'firebase/auth';
import { AppState } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { sendPasswordResetViaApi } from '@/services/api/auth-email';
import {
  resolveEmailSignInMethodsLookup,
  type ResolveEmailLookupResult,
} from '@/services/api/resolve-email';
import {
  fetchSignInMethodsForEmailAddress,
  refreshCurrentUser,
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogleIdToken,
  signUpWithEmail,
  signOutCurrentUser,
  subscribeToAuthState,
} from '@/services/firebase/auth';
import { configureNativeGoogleSignIn } from '@/services/auth/google-sign-in';
import { signInWithAppleNative } from '@/services/auth/apple-sign-in';
import { getFirebaseAuth, isFirebaseConfigured } from '@/services/firebase';
import { isProductionCompanyId } from '@/lib/company-id';
import { markSyncAuthPrepared, prepareSyncAuth } from '@/services/firebase/prepare-sync-auth';
import { hydrateEffectiveProfile, loadFastUserProfile } from '@/services/firebase/profile';
import { useAuthStore } from '@/store/auth-store';
import type { AuthStatus } from '@/types/auth';
import { mapAuthError } from '@/utils/auth-error';

type AuthContextValue = ReturnType<typeof useAuthController>;

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuthController() {
  const store = useAuthStore();
  const [isFirebaseReady] = useState(() => isFirebaseConfigured());
  const hydrateGenerationRef = useRef(0);
  const hydratedUidRef = useRef<string | null>(null);

  const hydrateUser = useCallback(async (user: User) => {
    if (
      hydratedUidRef.current === user.uid &&
      useAuthStore.getState().status === 'authenticated' &&
      Boolean(useAuthStore.getState().profile)
    ) {
      useAuthStore.getState().setFirebaseUser(user);
      return;
    }

    hydratedUidRef.current = user.uid;
    const generation = ++hydrateGenerationRef.current;

    useAuthStore.getState().setFirebaseUser(user);
    useAuthStore.getState().setHydrating(true);
    useAuthStore.getState().setStatus('booting');
    useAuthStore.getState().setError(null);

    try {
      const fastProfile = await loadFastUserProfile(user);
      if (generation !== hydrateGenerationRef.current) return;

      useAuthStore.getState().setHydration({
        profile: fastProfile,
        companyConfig: null,
        memberships: [],
        activeCompanyName: null,
      });

      try {
        const hydrated = await Promise.race([
          hydrateEffectiveProfile(user),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('auth/network-request-failed')), 15_000);
          }),
        ]);

        if (generation !== hydrateGenerationRef.current) return;

        useAuthStore.getState().setHydration(hydrated);
        if (hydrated.profile?.companyId && isProductionCompanyId(hydrated.profile.companyId)) {
          void prepareSyncAuth(user.uid)
            .then(() => markSyncAuthPrepared(user.uid))
            .catch((error) => {
              console.warn('RBAC bootstrap deferred:', error);
            });
        }
      } catch (error) {
        console.warn('Profile enrich deferred:', error);
      }
    } catch (error) {
      console.warn('Profile bootstrap deferred:', error);
      useAuthStore.getState().setError(mapAuthError(error));
    } finally {
      if (generation === hydrateGenerationRef.current) {
        useAuthStore.getState().setHydrating(false);
        if (useAuthStore.getState().status === 'booting') {
          useAuthStore.getState().setStatus(
            useAuthStore.getState().profile ? 'authenticated' : 'unauthenticated',
          );
        }
      }
    }
  }, []);

  useEffect(() => {
    configureNativeGoogleSignIn();
  }, []);

  useEffect(() => {
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      useAuthStore.getState().setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return unsubscribeNetwork;
  }, []);

  useEffect(() => {
    if (!isFirebaseReady) {
      useAuthStore.getState().setResolved({
        profile: null,
        companyConfig: null,
        memberships: [],
        activeCompanyName: null,
        status: 'unauthenticated',
      });
      useAuthStore.getState().setError('Firebase не настроен. Добавьте `EXPO_PUBLIC_FIREBASE_*` переменные.');
      return;
    }

    const unsubscribe = subscribeToAuthState(async (user) => {
      if (!user) {
        hydratedUidRef.current = null;
        useAuthStore.getState().reset();
        return;
      }
      await hydrateUser(user);
    });

    return unsubscribe;
  }, [hydrateUser, isFirebaseReady]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const currentUser = useAuthStore.getState().firebaseUser;
      if (!currentUser) return;
      try {
        await refreshCurrentUser(false);
        const refreshed = getFirebaseAuth().currentUser ?? currentUser;
        useAuthStore.getState().setFirebaseUser(refreshed);
        const hydrated = await hydrateEffectiveProfile(refreshed);
        useAuthStore.getState().setHydration(hydrated);
      } catch {
        // Keep current session; profile screens can retry on demand.
      }
    });

    return () => subscription.remove();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!store.isOnline) {
        throw new Error('Нет подключения к интернету.');
      }
      const user = await signInWithEmail(email.trim(), password);
      await hydrateUser(user);
    },
    [hydrateUser, store.isOnline],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      profile?: { firstName: string; lastName: string },
    ) => {
      if (!store.isOnline) {
        throw new Error('Нет подключения к интернету.');
      }

      const user = await signUpWithEmail(email.trim(), password);
      const fullName = [profile?.firstName?.trim(), profile?.lastName?.trim()].filter(Boolean).join(' ').trim();
      if (fullName) {
        await updateProfile(user, { displayName: fullName });
      }
      await hydrateUser(user);
    },
    [hydrateUser, store.isOnline],
  );

  const resolveEmailMethods = useCallback(
    async (email: string): Promise<ResolveEmailLookupResult> => {
      if (!store.isOnline) {
        throw new Error('Нет подключения к интернету.');
      }
      if (!isFirebaseReady) {
        throw new Error(mapAuthError(new Error('auth/operation-not-allowed')));
      }

      const trimmedEmail = email.trim().toLowerCase();
      const apiResult = await resolveEmailSignInMethodsLookup(trimmedEmail);
      if (apiResult.apiResolved) {
        return apiResult;
      }

      const clientMethods = await fetchSignInMethodsForEmailAddress(trimmedEmail);
      return { methods: clientMethods, apiResolved: false };
    },
    [isFirebaseReady, store.isOnline],
  );

  const signInWithGoogle = useCallback(
    async (idToken?: string) => {
      if (!store.isOnline) {
        throw new Error('Нет подключения к интернету.');
      }
      let token = idToken;
      if (!token) {
        const { signInWithGoogleNative } = await import('@/services/auth/google-sign-in');
        token = await signInWithGoogleNative();
      }
      const user = await signInWithGoogleIdToken(token);
      await hydrateUser(user);
    },
    [hydrateUser, store.isOnline],
  );

  const signInWithApple = useCallback(async () => {
    if (!store.isOnline) {
      throw new Error('Нет подключения к интернету.');
    }
    await signInWithAppleNative();
    const user = getFirebaseAuth().currentUser;
    if (user) {
      await hydrateUser(user);
    }
  }, [hydrateUser, store.isOnline]);

  const sendPasswordReset = useCallback(
    async (email: string) => {
      if (!store.isOnline) {
        throw new Error('Нет подключения к интернету.');
      }
      if (!isFirebaseReady) {
        throw new Error(mapAuthError(new Error('auth/operation-not-allowed')));
      }

      const delivery = await sendPasswordResetViaApi(email);
      if (delivery === 'firebase') {
        await requestPasswordReset(email.trim());
      }
    },
    [isFirebaseReady, store.isOnline],
  );

  const signOut = useCallback(async () => {
    hydratedUidRef.current = null;
    await signOutCurrentUser();
    useAuthStore.getState().reset();
  }, []);

  const refreshProfile = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;

    try {
      await refreshCurrentUser(false);
      const refreshed = getFirebaseAuth().currentUser ?? user;
      useAuthStore.getState().setFirebaseUser(refreshed);
      const hydrated = await hydrateEffectiveProfile(refreshed);
      useAuthStore.getState().setHydration(hydrated);
    } catch (error) {
      console.warn('Profile refresh deferred:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    useAuthStore.getState().setError(null);
  }, []);

  const isReady = store.status !== 'booting' && !store.isHydrating;
  const requiresCompanySelection = store.status === 'authenticated' && !store.profile?.companyId;
  const hasAccess =
    store.status === 'authenticated' &&
    store.profile?.isActive !== false &&
    isProductionCompanyId(store.profile?.companyId);

  return useMemo(
    () => ({
      ...store,
      isFirebaseReady,
      isReady,
      hasAccess,
      requiresCompanySelection,
      signIn,
      signUp,
      resolveSignInMethodsForEmail: resolveEmailMethods,
      signInWithGoogle,
      signInWithApple,
      sendPasswordResetForEmail: sendPasswordReset,
      sendPasswordReset,
      signOut,
      refreshProfile,
      clearError,
    }),
    [
      clearError,
      hasAccess,
      isFirebaseReady,
      isReady,
      refreshProfile,
      requiresCompanySelection,
      resolveEmailMethods,
      sendPasswordReset,
      signInWithApple,
      signInWithGoogle,
      signIn,
      signUp,
      signOut,
      store,
    ],
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthController();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function isAuthenticatedStatus(status: AuthStatus): boolean {
  return status === 'authenticated';
}
