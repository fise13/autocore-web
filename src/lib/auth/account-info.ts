import { User } from "firebase/auth";

export type AuthProviderKind = "email" | "google" | "apple" | "unknown";

export type AccountProviderInfo = {
  kind: AuthProviderKind;
  label: string;
  photoURL: string | null;
  email: string;
  displayName: string | null;
};

const providerLabels: Record<AuthProviderKind, string> = {
  email: "Email и пароль",
  google: "Google",
  apple: "Apple ID",
  unknown: "Другой способ",
};

function mapProviderId(providerId: string): AuthProviderKind {
  if (providerId === "password") return "email";
  if (providerId === "google.com") return "google";
  if (providerId === "apple.com") return "apple";
  return "unknown";
}

export function getAccountProviderInfo(user: User | null): AccountProviderInfo | null {
  if (!user) return null;

  const providers = user.providerData.map((provider) => mapProviderId(provider.providerId));
  const kind =
    providers.find((provider) => provider === "google") ??
    providers.find((provider) => provider === "apple") ??
    providers.find((provider) => provider === "email") ??
    "unknown";

  return {
    kind,
    label: providerLabels[kind],
    photoURL: user.photoURL,
    email: user.email ?? "",
    displayName: user.displayName,
  };
}

export function getAccountInitials(displayName: string | null | undefined, email: string): string {
  const trimmedName = displayName?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return trimmedName.slice(0, 2).toUpperCase();
  }

  const localPart = email.split("@")[0] ?? "";
  return (localPart.slice(0, 2) || "AC").toUpperCase();
}
