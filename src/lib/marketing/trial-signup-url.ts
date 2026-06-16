import { appLoginUrl } from "@/lib/site-urls";

export function marketingTrialSignupUrl(): string {
  return `${appLoginUrl()}?signup=1&billing=trial`;
}

export function marketingProSignupUrl(interval: "monthly" | "yearly" = "monthly"): string {
  const params = new URLSearchParams({ signup: "1", billing: "pro", interval });
  return `${appLoginUrl()}?${params.toString()}`;
}
