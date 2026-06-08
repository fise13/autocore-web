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
    "Apple JS redirectURI = <APP_URL>/login (страница с appleid.auth.js).",
    "⚠️ Apple Developer НЕ принимает «localhost» в Domains.",
    `1. Apple Developer → Services ID com.wise.autocore.web → Sign in with Apple → Configure.`,
    "   Локально (через /etc/hosts):",
    "   - Domain: local.autocore.dev  (127.0.0.1 local.autocore.dev в /etc/hosts)",
    "   - Return URL: http://local.autocore.dev:3000/login",
    "   Prod / preview:",
    "   - Domain: autocore-web.vercel.app (или ваш домен)",
    "   - Return URL: https://<домен>/login",
    `   (Legacy Firebase handler, firebase_handler mode: ${firebaseHandler})`,
    "2. Firebase → Authentication → Apple → Services ID + Team ID + Key ID + .p8.",
    "3. Firebase → Authorized domains → local.autocore.dev, localhost, prod-домен.",
  ].join("\n");
}

export function isAppleWebAuthConfigured(): boolean {
  return isFirebaseConfigured() && Boolean(getFirebaseAppleRedirectUrl());
}
