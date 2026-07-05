import {
  EmailAuthProvider,
  OAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type Unsubscribe,
} from 'firebase/auth';

import { getFirebaseAuth } from './index';

type AuthWithStateReady = ReturnType<typeof getFirebaseAuth> & {
  authStateReady?: () => Promise<void>;
};

/** Ensures the ID token is attached before Firestore reads (RN auth persistence race). */
export async function ensureFirestoreAuthReady(expectedUser?: User): Promise<User> {
  const auth = getFirebaseAuth();

  const authStateReady = (auth as AuthWithStateReady).authStateReady;
  if (typeof authStateReady === 'function') {
    await authStateReady.call(auth);
  }

  const activeUser = auth.currentUser;
  const uid = expectedUser?.uid ?? activeUser?.uid;
  if (!uid || !activeUser || activeUser.uid !== uid) {
    throw new Error('auth/no-current-user');
  }

  await activeUser.getIdToken(true);
  return activeUser;
}

export function subscribeToAuthState(onChange: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), onChange);
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function fetchSignInMethodsForEmailAddress(email: string): Promise<string[]> {
  return fetchSignInMethodsForEmail(getFirebaseAuth(), email.trim().toLowerCase());
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(getFirebaseAuth(), credential);
  return result.user;
}

export async function signInWithAppleIdentityToken(idToken: string, rawNonce: string): Promise<User> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken,
    rawNonce,
  });
  const result = await signInWithCredential(getFirebaseAuth(), credential);
  return result.user;
}

export async function signInWithFirebaseCustomToken(customToken: string): Promise<User> {
  const result = await signInWithCustomToken(getFirebaseAuth(), customToken);
  return result.user;
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export async function refreshCurrentUser(forceTokenRefresh = false): Promise<User | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  await user.reload();
  if (forceTokenRefresh) {
    await user.getIdToken(true);
  }
  return getFirebaseAuth().currentUser;
}

export function getAuthProviderIds(user: User): string[] {
  return user.providerData.map((entry) => entry.providerId).filter(Boolean);
}

export async function reauthenticateWithPassword(user: User, password: string): Promise<void> {
  const email = user.email?.trim();
  if (!email) {
    throw new Error('Для удаления аккаунта нужен email и пароль.');
  }
  const credential = EmailAuthProvider.credential(email, password);
  await reauthenticateWithCredential(user, credential);
}

export async function reauthenticateWithGoogleIdToken(user: User, idToken: string): Promise<void> {
  const credential = GoogleAuthProvider.credential(idToken);
  await reauthenticateWithCredential(user, credential);
}

export async function reauthenticateWithAppleIdentityToken(
  user: User,
  idToken: string,
  rawNonce: string,
): Promise<void> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken, rawNonce });
  await reauthenticateWithCredential(user, credential);
}

/** Permanently deletes the Firebase Auth user. Requires recent reauthentication. */
export async function deleteCurrentAuthUser(user: User): Promise<void> {
  await deleteUser(user);
}
