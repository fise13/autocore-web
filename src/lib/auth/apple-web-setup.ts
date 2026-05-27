import { isFirebaseConfigured } from "@/infrastructure/firebase/client";

export function getFirebaseProjectId(): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  return projectId || null;
}

export function getFirebaseAppleRedirectUrl(): string | null {
  const projectId = getFirebaseProjectId();
  if (!projectId) return null;
  return `https://${projectId}.firebaseapp.com/__/auth/handler`;
}

export function getAppleWebSetupHint(): string {
  const firebaseHandler = getFirebaseAppleRedirectUrl();

  if (!firebaseHandler) {
    return "Проверьте NEXT_PUBLIC_FIREBASE_PROJECT_ID в .env.local.";
  }

  return [
    "Web входит через Firebase OAuth (как Google). macOS/iOS — нативный Sign in with Apple.",
    `1. Apple Developer → Services ID com.wise.AutoCore.app → Sign in with Apple → Configure.`,
    `   Domain: autocore-6066c.firebaseapp.com (без https://)`,
    `   Return URL: ${firebaseHandler} (точное совпадение, без слэша в конце)`,
    "2. Firebase → Authentication → Apple → Services ID + Team ID + Key ID + .p8 (OAuth code flow).",
    "3. Firebase → Authorized domains → localhost.",
  ].join("\n");
}

export function isAppleWebAuthConfigured(): boolean {
  return isFirebaseConfigured() && Boolean(getFirebaseAppleRedirectUrl());
}
