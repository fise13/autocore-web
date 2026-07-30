import NetInfo from '@react-native-community/netinfo';
import { reload, updateProfile, type User } from 'firebase/auth';
import { AppState, InteractionManager } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { sendPasswordResetViaApi, sendVerificationEmailViaApi, verifyEmailCodeViaApi } from '@/services/api/auth-email';
import { createCompanyViaApi } from '@/services/api/create-company';
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
import { deleteAccountForCurrentUser } from '@/services/auth/delete-account';
import { getFirebaseAuth, isFirebaseConfigured } from '@/services/firebase';
import { isProductionCompanyId, normalizeCompanyId } from '@/lib/company-id';
import { hasEstablishedWorkspace, mergeSessionHydration, resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { markStartup } from '@/lib/performance/startup-tracer';
import { preloadSessionSnapshots } from '@/lib/realtime/preload-session-snapshots';
import {
  readSessionSnapshot,
  readSessionSnapshotSync,
  writeSessionSnapshot,
} from '@/lib/session/session-snapshot-cache';
import { clearLocalSessionCaches } from '@/lib/storage/clear-local-caches';
import { setQueryPersistBuster } from '@/lib/storage/mmkv-query-persister';
import { ensureAsyncStorageMigrated } from '@/lib/storage/migrate-async-storage';
import { markSyncAuthPrepared, prepareSyncAuth } from '@/services/firebase/prepare-sync-auth';
import { ensureRbacBootstrap } from '@/services/firebase/rbac-bootstrap';
import { buildFallbackProfile, hydrateEffectiveProfile, loadFastSessionBootstrap, resolveOwnedCompanyId, updateUserProfileName } from '@/services/firebase/profile';
import { fetchSessionBootstrapFromApi } from '@/services/api/session-bootstrap';
import { useAuthStore } from '@/store/auth-store';
import type { AuthStatus } from '@/types/auth';
import type { CompanyAppConfig } from '@/types/company-config';
import type { UserCompanyMembership } from '@/types/rbac';
import type { UserEntity } from '@/types/user';
import type { WorkspaceAccessBlock } from '@/types/workspace-access';
import { mapAuthError } from '@/utils/auth-error';

export type AuthActions = {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    profile?: { firstName: string; lastName: string },
  ) => Promise<void>;
  resolveSignInMethodsForEmail: (email: string) => Promise<ResolveEmailLookupResult>;
  signInWithGoogle: (idToken?: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  sendPasswordResetForEmail: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  verifyEmailWithCode: (code: string) => Promise<boolean>;
  createCompany: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  isFirebaseReady: boolean;
};

const AuthActionsContext = createContext<AuthActions | null>(null);

const FAST_PROFILE_TIMEOUT_MS = 2_500;
const SESSION_ENRICH_TIMEOUT_MS = 30_000;
const SESSION_SYNC_MAX_MS = 45_000;
const ENRICH_RETRY_DELAYS_MS = [2_000, 5_000] as const;

type HydrationPayload = {
  profile: UserEntity | null;
  companyConfig: CompanyAppConfig | null;
  memberships: UserCompanyMembership[];
  activeCompanyName: string | null;
  workspaceBlock?: WorkspaceAccessBlock | null;
};

function readHydrationFromStore(): HydrationPayload {
  const state = useAuthStore.getState();
  return {
    profile: state.profile,
    companyConfig: state.companyConfig,
    memberships: state.memberships,
    activeCompanyName: state.activeCompanyName,
    workspaceBlock: state.workspaceBlock,
  };
}

async function persistSessionSnapshot(uid: string, payload: HydrationPayload): Promise<void> {
  if (!payload.profile) return;
  await writeSessionSnapshot(uid, {
    profile: payload.profile,
    companyConfig: payload.companyConfig,
    memberships: payload.memberships,
    activeCompanyName: payload.activeCompanyName,
  });
}

function withTimeout<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

async function recoverSessionWorkspace(
  user: User,
  base: HydrationPayload,
): Promise<HydrationPayload> {
  let hydration = base;

  const apiHydrated = await fetchSessionBootstrapFromApi(user);
  if (apiHydrated) {
    hydration = mergeSessionHydration(hydration, apiHydrated);
  }

  if (!hasEstablishedWorkspace(hydration)) {
    const fast = await loadFastSessionBootstrap(user);
    hydration = mergeSessionHydration(hydration, {
      profile: fast.profile,
      companyConfig: null,
      memberships: fast.memberships,
      activeCompanyName: null,
    });
  }

  if (!hasEstablishedWorkspace(hydration)) {
    const ownedCompanyId = await resolveOwnedCompanyId(user.uid);
    if (ownedCompanyId && hydration.profile) {
      try {
        await ensureRbacBootstrap(user.uid, { companyId: ownedCompanyId });
      } catch (error) {
        console.warn('RBAC bootstrap during recovery:', error);
      }
      hydration = mergeSessionHydration(hydration, {
        profile: {
          ...hydration.profile,
          companyId: ownedCompanyId,
          role: 'owner',
          isCompanyOwner: true,
        },
        companyConfig: hydration.companyConfig,
        memberships: hydration.memberships,
        activeCompanyName: hydration.activeCompanyName,
      });
    }
  }

  return hydration;
}

function useAuthActionsController(): AuthActions {
  const [isFirebaseReady] = useState(() => isFirebaseConfigured());
  const hydrateGenerationRef = useRef(0);
  const hydratedUidRef = useRef<string | null>(null);
  const requireFullSessionRef = useRef(false);
  const manualOAuthHydrateRef = useRef(false);
  const hydrateInflightRef = useRef(new Map<string, Promise<void>>());

  const hydrateUser = useCallback(async (user: User) => {
    const inflight = hydrateInflightRef.current.get(user.uid);
    if (inflight) return inflight;

    const currentState = useAuthStore.getState();
    if (
      hydratedUidRef.current === user.uid &&
      currentState.status === 'authenticated' &&
      currentState.profile &&
      hasEstablishedWorkspace(readHydrationFromStore()) &&
      !requireFullSessionRef.current &&
      !currentState.isHydrating
    ) {
      useAuthStore.getState().setFirebaseUser(user);
      return;
    }

    const task = (async () => {
    hydratedUidRef.current = user.uid;
    const generation = ++hydrateGenerationRef.current;
    const requireFull = requireFullSessionRef.current;

    const finishBoot = () => {
      if (generation !== hydrateGenerationRef.current) return;
      useAuthStore.getState().setHydrating(false);
      if (useAuthStore.getState().status === 'booting') {
        useAuthStore.getState().setStatus(
          useAuthStore.getState().profile ? 'authenticated' : 'unauthenticated',
        );
      }
    };

    const applyHydration = async (payload: HydrationPayload) => {
      const current = readHydrationFromStore();
      const merged = mergeSessionHydration(current, payload);
      useAuthStore.getState().setHydration(merged);
      await persistSessionSnapshot(user.uid, merged);
      const companyId = resolveSessionCompanyId(merged.profile, merged.memberships);
      if (companyId) {
        preloadSessionSnapshots(companyId, user.uid);
      }
      if (isProductionCompanyId(companyId)) {
        if (requireFull) {
          try {
            await prepareSyncAuth(user.uid);
            markSyncAuthPrepared(user.uid);
          } catch (bootstrapError) {
            console.warn('RBAC bootstrap during session sync:', bootstrapError);
          }
        } else {
          void prepareSyncAuth(user.uid)
            .then(() => markSyncAuthPrepared(user.uid))
            .catch((bootstrapError) => {
              console.warn('RBAC bootstrap deferred:', bootstrapError);
            });
        }
      }
      return merged;
    };

    const enrichInBackground = (attempt = 0) => {
      void (async () => {
        try {
          const apiHydrated = await fetchSessionBootstrapFromApi(user);
          if (apiHydrated?.profile && generation === hydrateGenerationRef.current) {
            await applyHydration(apiHydrated);
            return;
          }

          const current = readHydrationFromStore();
          const hydrated = await Promise.race([
            hydrateEffectiveProfile(user),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('auth/network-request-failed')), SESSION_ENRICH_TIMEOUT_MS);
            }),
          ]);

          if (generation !== hydrateGenerationRef.current) return;

          await applyHydration(hydrated);
        } catch (error) {
          console.warn('Profile enrich deferred:', error);
          if (generation !== hydrateGenerationRef.current) return;

          try {
            const apiHydrated = await fetchSessionBootstrapFromApi(user);
            if (apiHydrated?.profile) {
              await applyHydration(apiHydrated);
              return;
            }
          } catch {
            // API fallback failed too.
          }

          const current = readHydrationFromStore();
          if (!hasEstablishedWorkspace(current)) {
            try {
              await user.getIdToken(true);
              const fast = await loadFastSessionBootstrap(user);
              const merged = mergeSessionHydration(current, {
                profile: fast.profile,
                companyConfig: null,
                memberships: fast.memberships,
                activeCompanyName: null,
              });
              if (hasEstablishedWorkspace(merged)) {
                useAuthStore.getState().setHydration(merged);
                await persistSessionSnapshot(user.uid, merged);
              }
            } catch {
              // Fast bootstrap retry failed.
            }
          }

          const retryDelay = ENRICH_RETRY_DELAYS_MS[attempt];
          if (retryDelay != null) {
            setTimeout(() => {
              if (generation === hydrateGenerationRef.current) {
                enrichInBackground(attempt + 1);
              }
            }, retryDelay);
          }
        }
      })();
    };

    const enrichSessionBlocking = async () => {
      const syncStartedAt = Date.now();

      for (let attempt = 0; attempt <= ENRICH_RETRY_DELAYS_MS.length; attempt += 1) {
        if (generation !== hydrateGenerationRef.current) return;
        if (Date.now() - syncStartedAt > SESSION_SYNC_MAX_MS) {
          console.warn('Session sync timed out — continuing with partial hydration');
          return;
        }

        try {
          const apiHydrated = await fetchSessionBootstrapFromApi(user);
          if (apiHydrated?.profile) {
            await applyHydration(apiHydrated);
            return;
          }

          const hydrated = await Promise.race([
            hydrateEffectiveProfile(user),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('auth/network-request-failed')), SESSION_ENRICH_TIMEOUT_MS);
            }),
          ]);
          await applyHydration(hydrated);
          return;
        } catch (error) {
          console.warn('Session sync attempt failed:', error);
          if (attempt < ENRICH_RETRY_DELAYS_MS.length) {
            await new Promise((resolve) => {
              setTimeout(resolve, ENRICH_RETRY_DELAYS_MS[attempt]);
            });
            continue;
          }

          const current = readHydrationFromStore();
          if (!hasEstablishedWorkspace(current)) {
            try {
              await user.getIdToken(true);
              const recovered = await recoverSessionWorkspace(user, current);
              await applyHydration(recovered);
            } catch (recoveryError) {
              console.warn('Session sync recovery failed:', recoveryError);
            }
          }
        }
      }
    };

    const finalizeSession = async () => {
      if (requireFull) {
        await enrichSessionBlocking();
      } else {
        enrichInBackground();
      }
    };

    useAuthStore.getState().setFirebaseUser(user);
    useAuthStore.getState().setError(null);
    setQueryPersistBuster(user.uid);

    const cached = readSessionSnapshotSync(user.uid);
    markStartup('session_cache_read');
    if (generation !== hydrateGenerationRef.current) return;

    const canUseCacheFastPath = (hydration: HydrationPayload) =>
      !requireFull && hasEstablishedWorkspace(hydration);

    if (cached) {
      const cachedHydration: HydrationPayload = {
        profile: cached.profile,
        companyConfig: cached.companyConfig,
        memberships: cached.memberships,
        activeCompanyName: cached.activeCompanyName,
      };

      if (canUseCacheFastPath(cachedHydration)) {
        useAuthStore.getState().setHydration(cachedHydration);
        const companyId = resolveSessionCompanyId(cached.profile, cached.memberships);
        if (companyId) {
          preloadSessionSnapshots(companyId, user.uid);
        }
        finishBoot();
        enrichInBackground();
        void ensureAsyncStorageMigrated();
        return;
      }

      useAuthStore.getState().setHydrating(true);
      try {
        const recovered = await recoverSessionWorkspace(user, cachedHydration);
        await applyHydration(recovered);
        await finalizeSession();
      } catch (error) {
        console.warn('Session cache recovery deferred:', error);
        useAuthStore.getState().setHydration(cachedHydration);
      } finally {
        finishBoot();
      }
      void ensureAsyncStorageMigrated();
      return;
    }

    void ensureAsyncStorageMigrated();
    const cachedAfterMigration = readSessionSnapshotSync(user.uid);
    if (cachedAfterMigration) {
      const cachedHydration: HydrationPayload = {
        profile: cachedAfterMigration.profile,
        companyConfig: cachedAfterMigration.companyConfig,
        memberships: cachedAfterMigration.memberships,
        activeCompanyName: cachedAfterMigration.activeCompanyName,
      };

      if (canUseCacheFastPath(cachedHydration)) {
        useAuthStore.getState().setHydration(cachedHydration);
        const companyId = resolveSessionCompanyId(
          cachedAfterMigration.profile,
          cachedAfterMigration.memberships,
        );
        if (companyId) {
          preloadSessionSnapshots(companyId, user.uid);
        }
        finishBoot();
        enrichInBackground();
        return;
      }

      useAuthStore.getState().setHydrating(true);
      try {
        const recovered = await recoverSessionWorkspace(user, cachedHydration);
        await applyHydration(recovered);
        await finalizeSession();
      } catch (error) {
        console.warn('Session cache recovery deferred:', error);
        useAuthStore.getState().setHydration(cachedHydration);
      } finally {
        finishBoot();
      }
      return;
    }

    useAuthStore.getState().setHydrating(true);
    useAuthStore.getState().setStatus('booting');

    try {
      let hydration: HydrationPayload = await withTimeout(
        loadFastSessionBootstrap(user).then((fastSession) => ({
          profile: fastSession.profile,
          companyConfig: null,
          memberships: fastSession.memberships,
          activeCompanyName: null,
        })),
        {
          profile: buildFallbackProfile(user),
          companyConfig: null,
          memberships: [],
          activeCompanyName: null,
        },
        FAST_PROFILE_TIMEOUT_MS,
      );
      if (generation !== hydrateGenerationRef.current) return;

      if (!hasEstablishedWorkspace(hydration)) {
        hydration = await recoverSessionWorkspace(user, hydration);
      }

      await applyHydration(hydration);
      await finalizeSession();
    } catch (error) {
      console.warn('Profile bootstrap deferred:', error);
      useAuthStore.getState().setHydration({
        profile: buildFallbackProfile(user),
        companyConfig: null,
        memberships: [],
        activeCompanyName: null,
      });
      useAuthStore.getState().setError(mapAuthError(error));
      if (requireFull) {
        await enrichSessionBlocking().catch(() => undefined);
      } else {
        enrichInBackground();
      }
    } finally {
      finishBoot();
    }
    })();

    hydrateInflightRef.current.set(user.uid, task);
    try {
      await task;
    } finally {
      hydrateInflightRef.current.delete(user.uid);
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
      useAuthStore.getState().setError('Firebase is not configured. Add the `EXPO_PUBLIC_FIREBASE_*` variables.');
      return;
    }

    const auth = getFirebaseAuth();
    const immediateUser = auth.currentUser;
    if (immediateUser) {
      void hydrateUser(immediateUser);
    }

    const unsubscribe = subscribeToAuthState(async (user) => {
      if (!user) {
        hydratedUidRef.current = null;
        void clearLocalSessionCaches();
        useAuthStore.getState().reset();
        return;
      }
      if (manualOAuthHydrateRef.current) {
        return;
      }
      await hydrateUser(user);
    });

    return unsubscribe;
  }, [hydrateUser, isFirebaseReady]);

  useEffect(() => {
    let cancelled = false;
    let resumeTask: { cancel: () => void } | null = null;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const currentUser = useAuthStore.getState().firebaseUser;
      if (!currentUser) return;

      // Defer network refresh until after first interactions so resume stays tappable.
      resumeTask?.cancel();
      resumeTask = InteractionManager.runAfterInteractions(() => {
        void (async () => {
          try {
            await refreshCurrentUser(false);
            if (cancelled) return;
            const refreshed = getFirebaseAuth().currentUser ?? currentUser;
            useAuthStore.getState().setFirebaseUser(refreshed);

            const current = readHydrationFromStore();
            const apiHydrated = await fetchSessionBootstrapFromApi(refreshed);
            if (cancelled) return;
            const merged = mergeSessionHydration(
              current,
              apiHydrated?.profile
                ? apiHydrated
                : await hydrateEffectiveProfile(refreshed),
            );
            if (cancelled) return;

            const sameCompany =
              resolveSessionCompanyId(current.profile, current.memberships) ===
              resolveSessionCompanyId(merged.profile, merged.memberships);
            const sameUid = current.profile?.id === merged.profile?.id;
            if (!sameCompany || !sameUid || current.memberships.length !== merged.memberships.length) {
              useAuthStore.getState().setHydration(merged);
            }
            await persistSessionSnapshot(refreshed.uid, merged);
          } catch {
            // Keep current session; profile screens can retry on demand.
          }
        })();
      });
    });

    return () => {
      cancelled = true;
      resumeTask?.cancel();
      subscription.remove();
    };
  }, []);

  const withFullSessionHydration = useCallback(
    async (authenticate: () => Promise<User>) => {
      manualOAuthHydrateRef.current = true;
      try {
        const user = await authenticate();

        requireFullSessionRef.current = true;
        useAuthStore.getState().setHydrating(true);
        try {
          await hydrateUser(user);
        } catch (error) {
          useAuthStore.getState().setHydrating(false);
          throw error;
        } finally {
          requireFullSessionRef.current = false;
        }
      } catch (error) {
        useAuthStore.getState().setHydrating(false);
        throw error;
      } finally {
        manualOAuthHydrateRef.current = false;
      }
    },
    [hydrateUser],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!useAuthStore.getState().isOnline) {
        throw new Error('No internet connection.');
      }
      await withFullSessionHydration(() => signInWithEmail(email.trim(), password));
    },
    [withFullSessionHydration],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      profile?: { firstName: string; lastName: string },
    ) => {
      if (!useAuthStore.getState().isOnline) {
        throw new Error('No internet connection.');
      }

      await withFullSessionHydration(async () => {
        const user = await signUpWithEmail(email.trim(), password);
        const fullName = [profile?.firstName?.trim(), profile?.lastName?.trim()].filter(Boolean).join(' ').trim();
        if (fullName) {
          await updateProfile(user, { displayName: fullName });
          await updateUserProfileName(user.uid, fullName);
          await reload(user);
        }
        try {
          await sendVerificationEmailViaApi();
        } catch (verificationError) {
          console.warn('Verification email send skipped:', verificationError);
        }
        return user;
      });
    },
    [withFullSessionHydration],
  );

  const resolveEmailMethods = useCallback(
    async (email: string): Promise<ResolveEmailLookupResult> => {
      if (!useAuthStore.getState().isOnline) {
        throw new Error('No internet connection.');
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
    [isFirebaseReady],
  );

  const signInWithGoogle = useCallback(
    async (idToken?: string) => {
      if (!useAuthStore.getState().isOnline) {
        throw new Error('No internet connection.');
      }
      await withFullSessionHydration(async () => {
        let token = idToken;
        if (!token) {
          const { signInWithGoogleNative } = await import('@/services/auth/google-sign-in');
          token = await signInWithGoogleNative();
        }
        return signInWithGoogleIdToken(token);
      });
    },
    [withFullSessionHydration],
  );

  const signInWithApple = useCallback(async () => {
    if (!useAuthStore.getState().isOnline) {
      throw new Error('No internet connection.');
    }
    await withFullSessionHydration(signInWithAppleNative);
  }, [withFullSessionHydration]);

  const sendPasswordReset = useCallback(
    async (email: string) => {
      if (!useAuthStore.getState().isOnline) {
        throw new Error('No internet connection.');
      }
      if (!isFirebaseReady) {
        throw new Error(mapAuthError(new Error('auth/operation-not-allowed')));
      }

      const delivery = await sendPasswordResetViaApi(email);
      if (delivery === 'firebase') {
        await requestPasswordReset(email.trim());
      }
    },
    [isFirebaseReady],
  );

  const sendEmailVerification = useCallback(async () => {
    if (!useAuthStore.getState().isOnline) {
      throw new Error('No internet connection.');
    }
    if (!isFirebaseReady) {
      throw new Error(mapAuthError(new Error('auth/operation-not-allowed')));
    }
    await sendVerificationEmailViaApi();
  }, [isFirebaseReady]);

  const verifyEmailWithCode = useCallback(
    async (code: string) => {
      if (!isFirebaseReady) {
        throw new Error(mapAuthError(new Error('auth/operation-not-allowed')));
      }
      await verifyEmailCodeViaApi(code);
      const user = await refreshCurrentUser(true);
      if (user) {
        useAuthStore.getState().setFirebaseUser(user);
      }
      return Boolean(user?.emailVerified);
    },
    [isFirebaseReady],
  );

  const signOut = useCallback(async () => {
    hydratedUidRef.current = null;
    await signOutCurrentUser();
    void clearLocalSessionCaches();
    useAuthStore.getState().reset();
  }, []);

  const deleteAccount = useCallback(async (password?: string) => {
    if (!useAuthStore.getState().isOnline) {
      throw new Error('No internet connection.');
    }
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      throw new Error('Authorization required.');
    }

    await deleteAccountForCurrentUser(user, { password });
    hydratedUidRef.current = null;
    void clearLocalSessionCaches();
    useAuthStore.getState().reset();
  }, []);

  const refreshProfile = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;

    try {
      await refreshCurrentUser(false);
      const refreshed = getFirebaseAuth().currentUser ?? user;
      useAuthStore.getState().setFirebaseUser(refreshed);

      const current = readHydrationFromStore();
      const apiHydrated = await fetchSessionBootstrapFromApi(refreshed);
      const merged = mergeSessionHydration(
        current,
        apiHydrated?.profile ? apiHydrated : await hydrateEffectiveProfile(refreshed),
      );
      useAuthStore.getState().setHydration(merged);
      await persistSessionSnapshot(refreshed.uid, merged);

      const companyId = resolveSessionCompanyId(merged.profile, merged.memberships);
      if (isProductionCompanyId(companyId)) {
        await prepareSyncAuth(refreshed.uid).catch(() => undefined);
      }
    } catch (error) {
      console.warn('Profile refresh deferred:', error);
      try {
        const apiHydrated = await fetchSessionBootstrapFromApi(user);
        if (apiHydrated?.profile) {
          const current = readHydrationFromStore();
          const merged = mergeSessionHydration(current, apiHydrated);
          useAuthStore.getState().setHydration(merged);
          await persistSessionSnapshot(user.uid, merged);
          return;
        }

        await user.getIdToken(true);
        const current = readHydrationFromStore();
        const fast = await loadFastSessionBootstrap(user);
        const merged = mergeSessionHydration(current, {
          profile: fast.profile,
          companyConfig: null,
          memberships: fast.memberships,
          activeCompanyName: null,
        });
        if (hasEstablishedWorkspace(merged)) {
          useAuthStore.getState().setHydration(merged);
          await persistSessionSnapshot(user.uid, merged);
        }
      } catch {
        // Keep current session.
      }
    }
  }, []);

  const createCompany = useCallback(
    async (name: string) => {
      if (!useAuthStore.getState().isOnline) {
        throw new Error('No internet connection.');
      }
      if (!isFirebaseReady) {
        throw new Error(mapAuthError(new Error('auth/operation-not-allowed')));
      }
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        throw new Error(mapAuthError(new Error('auth/invalid-credential')));
      }

      await createCompanyViaApi(name);
      try {
        await prepareSyncAuth(user.uid, { force: true });
      } catch (prepError) {
        console.warn('createCompany auth prep skipped:', prepError);
      }
      await refreshProfile();
    },
    [isFirebaseReady, refreshProfile],
  );

  const clearError = useCallback(() => {
    useAuthStore.getState().setError(null);
  }, []);

  return useMemo(
    () => ({
      isFirebaseReady,
      signIn,
      signUp,
      resolveSignInMethodsForEmail: resolveEmailMethods,
      signInWithGoogle,
      signInWithApple,
      sendPasswordResetForEmail: sendPasswordReset,
      sendPasswordReset,
      sendEmailVerification,
      verifyEmailWithCode,
      createCompany,
      signOut,
      deleteAccount,
      refreshProfile,
      clearError,
    }),
    [
      clearError,
      createCompany,
      deleteAccount,
      isFirebaseReady,
      refreshProfile,
      resolveEmailMethods,
      sendEmailVerification,
      sendPasswordReset,
      signInWithApple,
      signInWithGoogle,
      signIn,
      signUp,
      signOut,
      verifyEmailWithCode,
    ],
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const actions = useAuthActionsController();
  return <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>;
}

export function useAuthActions(): AuthActions {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within AuthProvider');
  }
  return context;
}

/** Derived auth readiness — does not subscribe to unrelated store fields. */
export function useAuthReady(): boolean {
  const status = useAuthStore((s) => s.status);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  return status !== 'booting' && !isHydrating;
}

/** Derived production access flag. */
export function useAuthHasAccess(): boolean {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const memberships = useAuthStore((s) => s.memberships);
  const workspaceBlock = useAuthStore((s) => s.workspaceBlock);
  const companyId = resolveSessionCompanyId(profile, memberships);

  return (
    status === 'authenticated' &&
    !workspaceBlock &&
    profile?.isActive !== false &&
    isProductionCompanyId(companyId)
  );
}

/**
 * Combined auth state + actions. Prefer `useAuthStore` selectors or `useSession`
 * when you only need state — avoids coupling to action context updates.
 */
export function useAuth() {
  const actions = useAuthActions();
  const status = useAuthStore((s) => s.status);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const companyConfig = useAuthStore((s) => s.companyConfig);
  const memberships = useAuthStore((s) => s.memberships);
  const activeCompanyName = useAuthStore((s) => s.activeCompanyName);
  const workspaceBlock = useAuthStore((s) => s.workspaceBlock);
  const isOnline = useAuthStore((s) => s.isOnline);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const error = useAuthStore((s) => s.error);

  const isReady = status !== 'booting' && !isHydrating;
  const requiresCompanySelection =
    status === 'authenticated' && !isProductionCompanyId(resolveSessionCompanyId(profile, memberships));
  const hasAccess =
    status === 'authenticated' &&
    !workspaceBlock &&
    profile?.isActive !== false &&
    isProductionCompanyId(resolveSessionCompanyId(profile, memberships));

  return useMemo(
    () => ({
      status,
      firebaseUser,
      profile,
      companyConfig,
      memberships,
      activeCompanyName,
      workspaceBlock,
      isOnline,
      isHydrating,
      error,
      isReady,
      hasAccess,
      requiresCompanySelection,
      ...actions,
    }),
    [
      actions,
      activeCompanyName,
      companyConfig,
      error,
      firebaseUser,
      hasAccess,
      isHydrating,
      isOnline,
      isReady,
      memberships,
      profile,
      requiresCompanySelection,
      status,
      workspaceBlock,
    ],
  );
}

export function isAuthenticatedStatus(status: AuthStatus): boolean {
  return status === 'authenticated';
}
