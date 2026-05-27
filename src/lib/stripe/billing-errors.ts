import { FirebaseError } from "firebase/app";

import { userCopy } from "@/lib/user-copy";

export function mapBillingCallableError(error: unknown): string {
  if (error instanceof FirebaseError) {
    const code = error.code.replace("functions/", "");
    const message = error.message?.trim();

    if (message && code !== "internal" && message !== "Internal") {
      return message;
    }

    switch (code) {
      case "failed-precondition":
        return userCopy.billing.stripeNotConfigured;
      case "permission-denied":
        return userCopy.billing.askAdmin;
      case "unauthenticated":
        return "Войдите в аккаунт";
      case "not-found":
        return "Компания не найдена";
      case "invalid-argument":
        return message || userCopy.billing.checkoutError;
      case "internal":
        return userCopy.billing.checkoutUnavailable;
      default:
        return userCopy.billing.checkoutError;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return userCopy.billing.checkoutError;
}
