"use client";

import { ReactNode } from "react";
import { Lock } from "lucide-react";

import { AnimatedUpgradeCta } from "@/components/billing/animated-upgrade-cta";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProBillingFeature } from "@/lib/billing/entitlements";
import { userCopy } from "@/lib/user-copy";

type ProFeatureGateProps = {
  feature: ProBillingFeature;
  title: string;
  description: string;
  children: ReactNode;
};

export function ProFeatureGate({ feature, title, description, children }: ProFeatureGateProps) {
  const { isPro, isLoading, requirePro } = useBillingGate();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{userCopy.billing.loading}</p>;
  }

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="size-5" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pb-8">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {userCopy.billing.paywall[feature].description}
        </p>
        <AnimatedUpgradeCta animated onClick={() => requirePro(feature)}>
          {userCopy.billing.viewPlans}
        </AnimatedUpgradeCta>
      </CardContent>
    </Card>
  );
}
