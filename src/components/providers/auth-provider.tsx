"use client";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
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

import { CompanyEntity } from "@/domain/company";
import { Permission, ROLE_PERMISSIONS, UserEntity, UserRole } from "@/domain/user";
import { ensureDefaultCompany as assignDefaultCompany } from "@/infrastructure/firestore/company-service";
import { joinCompanyWithInviteCode } from "@/infrastructure/firestore/join-company-service";
import { ensureRbacBootstrap } from "@/infrastructure/firestore/rbac-bootstrap";
import { signInWithAppleLikeMacOS } from "@/lib/auth/sign-in-with-apple-credential";
import { signInWithAppleWeb } from "@/lib/auth/sign-in-with-apple-web";
import { mapAuthError } from "@/lib/user-copy";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
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
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  sendPasswordReset: () => Promise<void>;
  logout: () => Promise<void>;
  createCompany: (name: string) => Promise<void>;
  joinCompanyWithInvite: (code: string) => Promise<void>;
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
  companyId?: string;
  role?: UserRole;
  permissions?: Permission[];
  isActive?: boolean;
  onboardingCompleted?: boolean;
};

const defaultRole: UserRole = "employee";

function mapUserDoc(uid: string, user: User, userDoc: UserDoc | null): UserEntity {
  return {
    id: uid,
    email: userDoc?.email ?? user.email ?? "",
    displayName: userDoc?.name ?? user.displayName,
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

function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: string }).code);
  }
  if (error instanceof Error && error.message.startsWith("auth/")) {
    return error.message;
  }
  return "";
}

function shouldFallbackToAppleJs(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  return code === "auth/popup-blocked" || code === "auth/cancelled-popup-request";
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
  await auth.authStateReady();
  logAuthDebug("auth-provider", "authStateReady after finalize", {
    currentUser: auth.currentUser?.uid ?? null,
  });
  try {
    await refreshProfile();
    logAuthDebug("auth-provider", "refreshProfile done");
  } catch (error) {
    logAuthDebug("auth-provider", "refreshProfile error", error);
    console.error("Failed to refresh profile after auth", error);
  }
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
        role: defaultRole,
        companyId: "",
        permissions: [],
        isActive: true,
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
      });
      return;
    }

    const existingData = existing.data() as UserDoc;
    const missingEmail = !existingData.email && user.email;
    const missingName = !existingData.name && user.displayName;
    if (missingEmail || missingName) {
      await updateDoc(userRef, {
        ...(missingEmail ? { email: user.email } : {}),
        ...(missingName ? { name: user.displayName } : {}),
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
    if (!auth.currentUser) {
      setProfile(null);
      return;
    }
    const currentUser = auth.currentUser;
    await upsertDefaultUserDoc(currentUser);

    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    const userDoc = snap.exists() ? (snap.data() as UserDoc) : null;

    if (!userDoc?.companyId?.trim()) {
      setProfile(mapUserDoc(currentUser.uid, currentUser, userDoc));
      return;
    }

    try {
      await ensureRbacBootstrap(currentUser.uid);
    } catch (error) {
      console.error("Failed to ensure RBAC bootstrap", error);
    }

    try {
      await currentUser.getIdToken(true);
    } catch (error) {
      console.error("Failed to refresh auth token", error);
    }

    const refreshedSnap = await getDoc(userRef);
    const refreshedDoc = refreshedSnap.exists() ? (refreshedSnap.data() as UserDoc) : userDoc;
    setProfile(mapUserDoc(currentUser.uid, currentUser, refreshedDoc));
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

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      logAuthDebug("auth-provider", "onAuthStateChanged", describeFirebaseUser(nextUser));
      setFirebaseUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        await refreshProfileRef.current();
      } catch (error) {
        logAuthDebug("auth-provider", "onAuthStateChanged refreshProfile error", error);
        console.error("Failed to refresh profile after auth", error);
        setProfile(mapUserDoc(nextUser.uid, nextUser, null));
      } finally {
        setIsLoading(false);
      }
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
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();

        try {
          const result = await signInWithAppleWeb(auth);
          await finalizeSignedInUser(auth, result.user, refreshProfile, setFirebaseUser, setIsLoading);
          return;
        } catch (error) {
          const code = getAuthErrorCode(error);
          if (code === "auth/popup-closed-by-user") {
            throw new Error(mapAuthError(error, { provider: "apple" }));
          }

          if (shouldFallbackToAppleJs(error)) {
            try {
              const result = await signInWithAppleLikeMacOS(auth);
              await finalizeSignedInUser(auth, result.user, refreshProfile, setFirebaseUser, setIsLoading);
              return;
            } catch (fallbackError) {
              throw new Error(mapAuthError(fallbackError, { provider: "apple" }));
            }
          }

          throw new Error(mapAuthError(error, { provider: "apple" }));
        }
      },
      async signInWithEmail(email, password) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        const result = await signInWithEmailAndPassword(auth, email, password);
        await finalizeSignedInUser(auth, result.user, refreshProfile, setFirebaseUser, setIsLoading);
      },
      async signUpWithEmail(email, password) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await finalizeSignedInUser(auth, result.user, refreshProfile, setFirebaseUser, setIsLoading);
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
        await sendPasswordResetEmail(auth, user.email);
      },
      async logout() {
        if (!isFirebaseReady) return;
        const auth = getFirebaseAuth();
        await signOut(auth);
        router.push("/login");
      },
      async createCompany(name) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        const db = getFirestoreDb();
        if (!auth.currentUser) throw new Error(mapAuthError(new Error("auth/invalid-credential")));
        const companyRef = doc(collection(db, "companies"));
        const companyPayload: CompanyEntity = {
          id: companyRef.id,
          name: name.trim(),
          ownerId: auth.currentUser.uid,
        };
        try {
          await setDoc(companyRef, {
            ...companyPayload,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : "Не удалось создать компанию",
          );
        }

        try {
          await setDoc(
            doc(db, "companies", companyRef.id, "employees", auth.currentUser.uid),
            {
              uid: auth.currentUser.uid,
              companyId: companyRef.id,
              email: auth.currentUser.email ?? "",
              fullName: auth.currentUser.displayName ?? "",
              role: "owner",
              permissions: [],
              invitedBy: auth.currentUser.uid,
              isActive: true,
              createdAt: serverTimestamp(),
              lastActiveAt: serverTimestamp(),
            },
            { merge: false },
          );
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : "Не удалось создать профиль владельца",
          );
        }

        try {
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            companyId: companyRef.id,
            role: "owner",
            permissions: [],
            isActive: true,
          });
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : "Не удалось привязать аккаунт к компании",
          );
        }

        try {
          for (const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
            await setDoc(
              doc(db, "companies", companyRef.id, "roles", role),
              {
                companyId: companyRef.id,
                role,
                permissions: ROLE_PERMISSIONS[role],
                isSystem: true,
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
        } catch (error) {
          console.error("Failed to seed default roles during onboarding", error);
        }

        await refreshProfile();
      },
      async joinCompanyWithInvite(code) {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        if (!auth.currentUser) throw new Error(mapAuthError(new Error("auth/invalid-credential")));

        await joinCompanyWithInviteCode(auth.currentUser.uid, code);

        try {
          await auth.currentUser.getIdToken(true);
        } catch (error) {
          console.error("Failed to refresh auth token after join", error);
        }
        await refreshProfile();
      },
      async ensureDefaultCompany() {
        if (!isFirebaseReady) throw new Error(mapAuthError(new Error("auth/operation-not-allowed")));
        const auth = getFirebaseAuth();
        if (!auth.currentUser) throw new Error(mapAuthError(new Error("auth/invalid-credential")));
        await assignDefaultCompany(auth.currentUser.uid);
        await auth.currentUser.getIdToken(true);
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
