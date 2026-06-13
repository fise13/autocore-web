"use client";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Permission, UserEntity, UserRole } from "@/domain/user";
import {
  createCompany as createCompanyRecord,
  ensureDefaultCompany as assignDefaultCompany,
} from "@/infrastructure/firestore/company-service";
import {
  joinCompanyWithInviteCode,
  joinCompanyWithInviteToken,
} from "@/infrastructure/firestore/join-company-service";
import { getAppleAuthMode, isFirebaseHandlerAppleAuthMode } from "@/lib/auth/apple-auth-mode";
import { logAppleAuthError, logAppleAuthStep, logAppleJs } from "@/lib/auth/apple-auth-log";
import { signInWithAppleLikeMacOS } from "@/lib/auth/sign-in-with-apple-credential";
import { AppleJsRedirectStarted, isAppleUserCancellationError } from "@/lib/auth/apple-js-sign-in";
import { signInWithAppleFirebase } from "@/lib/auth/sign-in-with-apple-web";
import { mergeProfileWithEmployee, EmployeeProfileSlice } from "@/lib/auth/resolve-effective-profile";
import { markSyncAuthPrepared, prepareSyncAuth, resetSyncAuthCache } from "@/lib/auth/prepare-sync-auth";
import { claimPendingMarketingCheckout } from "@/lib/billing/claim-marketing-checkout";
import { mapAuthError } from "@/lib/user-copy";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
import {
  sendPasswordResetViaApi,
  sendVerificationEmailViaApi,
  verifyEmailCodeViaApi,
} from "@/lib/auth/send-auth-email";
import {
  markAuthSessionTransition,
  playAuthSessionLeave,
} from "@/lib/motion/auth-session-transition";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import {
  describeFirebaseUser,
  logAuthDebug,
} from "@/lib/auth/auth-debug";
import {
  getFirebaseAuth,
  getFirestoreDb,
  isFirebaseConfigured,
} from "@/infrastructure/firebase/client";

type AuthContextValue = {
  firebaseUser: User | null;
  profile: UserEntity | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    profile?: { firstName: string; lastName: string },
  ) => Promise<void>;
  resolveSignInMethodsForEmail: (email: string) => Promise<string[]>;
  sendPasswordResetForEmail: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  verifyEmailWithCode: (code: string) => Promise<boolean>;
  reloadFirebaseUser: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  sendPasswordReset: () => Promise<void>;
  logout: () => Promise<void>;
  createCompany: (name: string) => Promise<void>;
  joinCompanyWithInvite: (code: string) => Promise<void>;
  joinCompanyWithInviteToken: (token: string) => Promise<void>;
  ensureDefaultCompany: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isFirebaseReady: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

type UserDoc = {
  email: string;
  name?: string;
  phone?: string;
  photoURL?: string;
  companyId?: string;
  role?: UserRole;
  permissions?: Permission[];
  isActive?: boolean;
  onboardingCompleted?: boolean;
};

const defaultRole: UserRole = "employee";

function mapUserDoc(uid: string, user: User, userDoc: UserDoc | null): UserEntity {
  const docPhotoURL = typeof userDoc?.photoURL === "string" ? userDoc.photoURL.trim() : "";
  const authPhotoURL = user.photoURL?.trim() ?? "";
  return {
    id: uid,
    email: userDoc?.email ?? user.email ?? "",
    displayName: userDoc?.name ?? user.displayName,
    phone: typeof userDoc?.phone === "string" ? userDoc.phone.trim() || null : null,
    photoURL: docPhotoURL || authPhotoURL || null,
    role: userDoc?.role ?? defaultRole,
    companyId: userDoc?.companyId ?? null,
    permissions: Array.isArray(userDoc?.permissions) ? userDoc?.permissions : [],
    isActive: userDoc?.isActive ?? true,
  };
}

function assertEmailProvider(user: User) {
  const info = getAccountProviderInfo(user);
  if (info?.kind === "google") {
    throw new Error("Пароль меняется в настройках Google-аккаунта.");
  }
  if (info?.kind === "apple") {
    throw new Error("Пароль меняется в настройках Apple ID.");
  }
  if (info?.kind !== "email") {
    throw new Error("Смена пароля недоступна для этого способа входа.");
  }
}

async function reauthenticateEmailUser(user: User, password: string) {
  const email = user.email;
  if (!email) {
    throw new Error("auth/invalid-credential");
  }
  const credential = EmailAuthProvider.credential(email, password);
  await reauthenticateWithCredential(user, credential);
}

async function finalizeSignedInUser(
  auth: ReturnType<typeof getFirebaseAuth>,
  user: User,
  refreshProfile: () => Promise<void>,
  setFirebaseUser: (user: User) => void,
  setIsLoading: (loading: boolean) => void,
) {
  logAuthDebug("auth-provider", "finalizeSignedInUser", describeFirebaseUser(user));
  setFirebaseUser(user);
  setIsLoading(false);
  void auth.authStateReady().then(() => {
    logAuthDebug("auth-provider", "authStateReady after finalize", {
      currentUser: auth.currentUser?.uid ?? null,
    });
  });
  void refreshProfile()
    .then(() => logAuthDebug("auth-provider", "refreshProfile done"))
    .catch((error) => {
      logAuthDebug("auth-provider", "refreshProfile error", error);
      console.error("Failed to refresh profile after auth", error);
    });
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserEntity | null>(null);
  const [isLoading, setIsLoading] = useState(() => isFirebaseConfigured());
  const isFirebaseReady = isFirebaseConfigured();

  const upsertDefaultUserDoc = useCallback(async (user: User) => {
    const db = getFirestoreDb();
    const userRef = doc(db, "users", user.uid);
    const existing = await getDoc(userRef);

    if (!existing.exists()) {
      await setDoc(userRef, {
        name: user.displayName ?? "",
        email: user.email ?? "",
        ...(user.photoURL?.trim() ? { photoURL: user.photoURL.trim() } : {}),
        role: defaultRole,
        companyId: "",
        permissions: [],
        isActive: true,
        onboardingCompleted: true,
        createdAt: serverTimestamp(),
      });
      return;
    }

    const existingData = existing.data() as UserDoc;
    const missingEmail = !existingData.email && user.email;
    const missingName = !existingData.name && user.displayName;
    const missingPhoto = !existingData.photoURL?.trim() && user.photoURL?.trim();
    if (missingEmail || missingName || missingPhoto) {
      await updateDoc(userRef, {
        ...(missingEmail ? { email: user.email } : {}),
        ...(missingName ? { name: user.displayName } : {}),
        ...(missingPhoto ? { photoURL: user.photoURL!.trim() } : {}),
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      setProfile(null);
      return;
    }
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setProfile(null);
      return;
    }

    await upsertDefaultUserDoc(currentUser);

    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    const userDoc = snap.exists() ? (snap.data() as UserDoc) : null;
    const companyId = userDoc?.companyId?.trim();

    if (!companyId) {
      setProfile(mapUserDoc(currentUser.uid, currentUser, userDoc));
      markSyncAuthPrepared(currentUser.uid);
      return;
    }

    const companyRef = doc(db, "companies", companyId);
    const employeeRef = doc(db, "companies", companyId, "employees", currentUser.uid);

    const [companySnap, employeeSnap] = await Promise.all([getDoc(companyRef), getDoc(employeeRef)]);

    let isCompanyOwner = false;
    if (companySnap.exists()) {
      const ownerId = (companySnap.data() as { ownerId?: string }).ownerId;
      isCompanyOwner = ownerId === currentUser.uid;
    }

    let employeeDoc: EmployeeProfileSlice | null = null;
    if (employeeSnap.exists()) {
      const data = employeeSnap.data() as Record<string, unknown>;
      employeeDoc = {
        role: data.role as UserRole | undefined,
        permissions: Array.isArray(data.permissions) ? (data.permissions as Permission[]) : undefined,
        isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
        fullName: typeof data.fullName === "string" ? data.fullName : undefined,
      };
    }

    const mapped = mapUserDoc(currentUser.uid, currentUser, userDoc);
    setProfile({ ...mergeProfileWithEmployee(mapped, employeeDoc), isCompanyOwner });
    markSyncAuthPrepared(currentUser.uid);

    void prepareSyncAuth(currentUser.uid).catch((error) => {
      console.warn("Auth prep skipped during profile refresh:", error);
    });
  }, [upsertDefaultUserDoc]);

  const refreshProfileRef = useRef(refreshProfile);

  useEffect(() => {
    refreshProfileRef.current = refreshProfile;
  }, [refreshProfile]);

  useEffect(() => {
    if (!isFirebaseReady) {
      return;
    }

    const auth = getFirebaseAuth();
    logAuthDebug("auth-provider", "mount auth listener");

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      logAuthDebug("auth-provider", "onAuthStateChanged", describeFirebaseUser(nextUser));
      setFirebaseUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setIsLoading(false);
        resetSyncAuthCache();
        return;
      }

      void (async () => {
        try {
          await upsertDefaultUserDoc(nextUser);
          const db = getFirestoreDb();
          const snap = await getDoc(doc(db, "users", nextUser.uid));
          const userDoc = snap.exists() ? (snap.data() as UserDoc) : null;
          setProfile(mapUserDoc(nextUser.uid, nextUser, userDoc));
        } catch (error) {
          logAuthDebug("auth-provider", "fast profile load error", error);
          setProfile(mapUserDoc(nextUser.uid, nextUser, null));
        } finally {
          setIsLoading(false);
        }

        try {
          await refreshProfileRef.current();
        } catch (error) {
          logAuthDebug("auth-provider", "onAuthStateChanged refreshProfile error", error);
          console.error("Failed to refresh profile after auth", error);
        }
      })();
    });

    void auth.authStateReady().then(() => {
      logAuthDebug("auth-provider", "initial authStateReady", {
        currentUser: auth.currentUser?.uid ?? null,
      });
      if (auth.currentUser) {
        setFirebaseUser(auth.currentUser);
        return;
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [isFirebaseReady]);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      isLoading,
      isFirebaseReady,
      async signInWithGoogle() {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await finalizeSignedInUser(auth, result.user, refreshProfile, setFirebaseUser, setIsLoading);
      },
      async signInWithApple() {
        if (!isFirebaseReady) {
          const error = new Error("auth/operation-not-allowed");
          logAppleAuthError("auth-provider:not-ready", error);
          throw error;
        }
        const auth = getFirebaseAuth();
        const mode = getAppleAuthMode();
        logAppleJs("auth-provider-sign-in", { mode });

        try {
          if (isFirebaseHandlerAppleAuthMode()) {
            const result = await signInWithAppleFirebase(auth);
            if (!result) {
              logAppleAuthStep("redirect-started");
              return;
            }
            await finalizeSignedInUser(auth, result.user, refreshProfile, setFirebaseUser, setIsLoading);
            return;
          }

          const result = await signInWithAppleLikeMacOS(auth);
          await finalizeSignedInUser(auth, result.user, refreshProfile, setFirebaseUser, setIsLoading);
        } catch (error) {
          if (error instanceof AppleJsRedirectStarted) {
            logAppleJs("redirect-started-awaiting-return");
            return;
          }
          if (isAppleUserCancellationError(error)) {
            logAppleJs("sign-in-cancelled-by-user");
            throw error;
          }
          logAppleAuthError("auth-provider:signInWithApple", error);
          throw error;
        }
      },
      async signInWithEmail(email, password) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        try {
          const auth = getFirebaseAuth();
          const result = await signInWithEmailAndPassword(auth, email, password);
          await finalizeSignedInUser(auth, result.user, refreshProfile, setFirebaseUser, setIsLoading);
        } catch (error) {
          throw new Error(mapAuthError(error));
        }
      },
      async signUpWithEmail(email, password, profileNames) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        try {
          const auth = getFirebaseAuth();
          const db = getFirestoreDb();
          const result = await createUserWithEmailAndPassword(auth, email, password);
          const trimmedFirst = profileNames?.firstName?.trim() ?? "";
          const trimmedLast = profileNames?.lastName?.trim() ?? "";
          if (trimmedFirst && trimmedLast) {
            const fullName = `${trimmedFirst} ${trimmedLast}`;
            await updateProfile(result.user, { displayName: fullName });
            await setDoc(doc(db, "users", result.user.uid), {
              name: fullName,
              email: result.user.email ?? email.trim(),
              role: defaultRole,
              companyId: "",
              permissions: [],
              isActive: true,
              onboardingCompleted: true,
              createdAt: serverTimestamp(),
            });
          }
          await finalizeSignedInUser(auth, result.user, refreshProfile, setFirebaseUser, setIsLoading);
          try {
            await sendVerificationEmailViaApi(result.user);
          } catch (verificationError) {
            console.warn("Verification email send skipped:", verificationError);
          }
        } catch (error) {
          throw new Error(mapAuthError(error));
        }
      },
      async resolveSignInMethodsForEmail(email) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const trimmedEmail = email.trim().toLowerCase();
        try {
          const response = await fetch("/api/auth/resolve-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: trimmedEmail }),
          });
          if (response.ok) {
            const payload = (await response.json()) as { exists: boolean; methods: string[] };
            if (!payload.exists) return [];
            return payload.methods.length > 0 ? payload.methods : ["password"];
          }
        } catch (lookupError) {
          logAuthDebug("auth-provider", "resolve-email API fallback", lookupError);
        }
        const auth = getFirebaseAuth();
        return fetchSignInMethodsForEmail(auth, trimmedEmail);
      },
      async sendPasswordResetForEmail(email) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        await sendPasswordResetViaApi(email);
      },
      async sendEmailVerification() {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) throw new Error(mapAuthError(new Error("auth/invalid-credential")));
        assertEmailProvider(user);
        await sendVerificationEmailViaApi(user);
      },
      async verifyEmailWithCode(code) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) throw new Error(mapAuthError(new Error("auth/invalid-credential")));
        assertEmailProvider(user);
        await verifyEmailCodeViaApi(user, code);
        await user.reload();
        await user.getIdToken(true);
        setFirebaseUser(auth.currentUser);
        return Boolean(auth.currentUser?.emailVerified);
      },
      async reloadFirebaseUser() {
        if (!isFirebaseReady) return false;
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) return false;
        await user.reload();
        setFirebaseUser(auth.currentUser);
        return Boolean(auth.currentUser?.emailVerified);
      },
      async changePassword(currentPassword, newPassword) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) throw new Error(mapAuthError(new Error("auth/invalid-credential")));
        assertEmailProvider(user);
        if (newPassword.length < 6) {
          throw new Error(mapAuthError(new Error("auth/weak-password")));
        }
        await reauthenticateEmailUser(user, currentPassword);
        await updatePassword(user, newPassword);
      },
      async changeEmail(newEmail, currentPassword) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        const db = getFirestoreDb();
        const user = auth.currentUser;
        if (!user) throw new Error(mapAuthError(new Error("auth/invalid-credential")));
        assertEmailProvider(user);
        const trimmedEmail = newEmail.trim();
        if (!trimmedEmail) {
          throw new Error(mapAuthError(new Error("auth/invalid-email")));
        }
        await reauthenticateEmailUser(user, currentPassword);
        await updateEmail(user, trimmedEmail);
        await updateDoc(doc(db, "users", user.uid), { email: trimmedEmail });
        await refreshProfile();
      },
      async sendPasswordReset() {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user?.email) throw new Error(mapAuthError(new Error("auth/invalid-email")));
        assertEmailProvider(user);
        await sendPasswordResetViaApi(user.email);
      },
      async logout() {
        if (!isFirebaseReady) return;
        const auth = getFirebaseAuth();
        const uid = auth.currentUser?.uid;

        if (!prefersReducedMotion()) {
          try {
            await playAuthSessionLeave("sign-out");
          } catch {
            // Overlay may not be mounted.
          }
        }

        await signOut(auth);
        resetSyncAuthCache(uid);
        markAuthSessionTransition("sign-out");
        router.push("/login");
      },
      async createCompany(name) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        if (!auth.currentUser) throw new Error(mapAuthError(new Error("auth/invalid-credential")));
        const companyId = await createCompanyRecord(auth.currentUser.uid, name);
        try {
          await claimPendingMarketingCheckout(companyId);
        } catch (claimError) {
          console.warn("Marketing checkout claim skipped:", claimError);
        }
        await prepareSyncAuth(auth.currentUser.uid, { force: true });
        await refreshProfile();
      },
      async joinCompanyWithInvite(code) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        if (!auth.currentUser) throw new Error(mapAuthError(new Error("auth/invalid-credential")));

        await joinCompanyWithInviteCode(auth.currentUser.uid, code);
        await prepareSyncAuth(auth.currentUser.uid, { force: true });
        await refreshProfile();
      },
      async joinCompanyWithInviteToken(token) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        if (!auth.currentUser) throw new Error(mapAuthError(new Error("auth/invalid-credential")));

        await joinCompanyWithInviteToken(auth.currentUser.uid, token);
        await prepareSyncAuth(auth.currentUser.uid, { force: true });
        await refreshProfile();
      },
      async ensureDefaultCompany() {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        if (!auth.currentUser) throw new Error(mapAuthError(new Error("auth/invalid-credential")));
        await assignDefaultCompany(auth.currentUser.uid);
        await prepareSyncAuth(auth.currentUser.uid, { force: true });
        await refreshProfile();
      },
      refreshProfile,
    }),
    [firebaseUser, profile, isFirebaseReady, isLoading, refreshProfile, router],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
