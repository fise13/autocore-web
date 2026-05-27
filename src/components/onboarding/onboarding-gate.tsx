"use client";

import { ReactNode } from "react";

import { WebTutorial } from "@/components/onboarding/web-tutorial";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useAuth } from "@/components/providers/auth-provider";
import { userCopy } from "@/lib/user-copy";

type OnboardingGateProps = {
  children: ReactNode;
};

function OnboardingGateInner({
  uid,
  children,
}: {
  uid: string;
  children: ReactNode;
}) {
  const { isLoading, isCompleted, completeOnboarding } = useOnboarding(uid);

  if (isLoading) {
    return <AppLoadingScreen message={userCopy.onboarding.loading} />;
  }

  if (!isCompleted) {
    return <WebTutorial onComplete={() => void completeOnboarding()} />;
  }

  return <>{children}</>;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { profile } = useAuth();
  const uid = profile?.id;

  if (!uid) {
    return <>{children}</>;
  }

  return (
    <OnboardingGateInner key={uid} uid={uid}>
      {children}
    </OnboardingGateInner>
  );
}
