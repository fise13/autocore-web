"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Building2, CreditCard, Loader2, Users } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table";
import { AnimatedUpgradeCta } from "@/components/billing/animated-upgrade-cta";
import { CompanyTeamTabs, type CompanyTeamTab } from "@/components/settings/company-team-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBillingActions } from "@/hooks/use-billing-actions";
import { useCompanyOverviewMetrics } from "@/hooks/use-company-overview-metrics";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { formatNextBillingDate } from "@/lib/billing/format-renewal";
import { canViewEmployees } from "@/lib/auth/permissions";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { isStripeBillingConfigured } from "@/lib/stripe/prices";
import { userCopy } from "@/lib/user-copy";

type CompanySettingsPanelProps = {
  companyId: string;
  uid: string;
  showPlansInitially?: boolean;
  initialTeamTab?: CompanyTeamTab;
  onStatus?: (message: string | null) => void;
};

function billingIntervalLabel(interval: string | null | undefined): string {
  if (interval === "monthly") return userCopy.billing.planComparison.monthly;
  if (interval === "yearly") return userCopy.billing.planComparison.yearly;
  return "—";
}

export function CompanySettingsPanel({
  companyId,
  uid,
  showPlansInitially = false,
  initialTeamTab = "employees",
  onStatus,
}: CompanySettingsPanelProps) {
  const { profile, refreshProfile } = useAuth();
  const { subscription, isPro, isLoading, canManageBilling, error } = useBillingGate();
  const { name, isLoading: nameLoading } = useCompanyProfile(companyId);
  const { overview, isLoading: statsLoading } = useCompanyOverviewMetrics(companyId, uid);
  const { pending, openPortal } = useBillingActions({ companyId, onStatus });
  const [companyNameDraft, setCompanyNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showPlans, setShowPlans] = useState(showPlansInitially);
  const stripeReady = isStripeBillingConfigured();
  const renewalDate = formatNextBillingDate(subscription?.currentPeriodEnd);
  const canViewTeam = canViewEmployees(profile) && isPro;

  useEffect(() => {
    if (showPlansInitially) setShowPlans(true);
  }, [showPlansInitially]);

  async function updateCompanyName() {
    if (!companyNameDraft.trim()) return;
    setSavingName(true);
    onStatus?.(null);
    try {
      const db = getFirestoreDb();
      await updateDoc(doc(db, "companies", companyId), {
        name: companyNameDraft.trim(),
      });
      setCompanyNameDraft("");
      onStatus?.(userCopy.settings.companyNameUpdated);
      await refreshProfile();
    } catch (updateError) {
      onStatus?.(updateError instanceof Error ? updateError.message : userCopy.settings.companyNameError);
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="space-y-5">
      <FadeIn>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <CardTitle>{userCopy.settings.company}</CardTitle>
            </div>
            <CardDescription>{userCopy.settings.companyDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/10 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {userCopy.company.companyNameLabel}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {nameLoading ? "…" : name || userCopy.defaultCompanyName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder={userCopy.company.companyNamePlaceholder}
                value={companyNameDraft}
                onChange={(event) => setCompanyNameDraft(event.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => void updateCompanyName()} disabled={savingName || !companyNameDraft.trim()}>
                {savingName ? <Loader2 className="size-4 animate-spin" /> : null}
                {userCopy.settings.companyNameSave}
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={50}>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                <CardTitle>{userCopy.billing.title}</CardTitle>
              </div>
              {isLoading ? (
                <Badge variant="secondary">…</Badge>
              ) : (
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? userCopy.billing.planPro : userCopy.billing.planFree}
                </Badge>
              )}
            </div>
            <CardDescription>{userCopy.billing.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!isLoading ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {subscription?.status === "past_due" ? (
                  <Badge variant="destructive">{userCopy.billing.pastDue}</Badge>
                ) : null}
                {isPro ? (
                  <>
                    <span>
                      {userCopy.billing.planComparison.billingInterval}:{" "}
                      {billingIntervalLabel(subscription?.billingInterval)}
                    </span>
                    <span>·</span>
                    <span>
                      {userCopy.billing.nextChargeLabel}:{" "}
                      {renewalDate === "—" ? userCopy.billing.nextChargeUnknown : renewalDate}
                    </span>
                  </>
                ) : (
                  <span>{userCopy.billing.freeActiveHint}</span>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {!showPlans && !isPro ? (
                <AnimatedUpgradeCta animated size="sm" onClick={() => setShowPlans(true)}>
                  {userCopy.billing.viewPlans}
                </AnimatedUpgradeCta>
              ) : (
                <Button variant={showPlans ? "default" : "outline"} size="sm" onClick={() => setShowPlans((v) => !v)}>
                  {showPlans ? userCopy.billing.planComparison.hidePlans : userCopy.billing.viewPlans}
                </Button>
              )}
              {isPro && canManageBilling && stripeReady ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending !== null}
                  onClick={() => void openPortal()}
                >
                  {pending === "portal" ? <Loader2 className="size-4 animate-spin" /> : null}
                  {userCopy.billing.manageButton}
                </Button>
              ) : null}
            </div>

            {showPlans ? (
              <PlanComparisonTable companyId={companyId} onStatus={onStatus} />
            ) : null}
          </CardContent>
        </Card>
      </FadeIn>

      {!isPro ? (
        <FadeIn delay={100}>
          <Card>
            <CardHeader>
              <CardTitle>{userCopy.settings.companyStatsTitle}</CardTitle>
              <CardDescription>{userCopy.settings.companyStatsDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <p className="text-sm text-muted-foreground">{userCopy.billing.loading}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatTile label={userCopy.settings.statMotors} value={overview.activeInventoryCount} />
                  <StatTile label={userCopy.settings.statBalance} value={Math.round(overview.totalBalance)} />
                  <StatTile label={userCopy.settings.statChangesToday} value={overview.changesToday} />
                </div>
              )}
              <p className="mt-4 text-sm text-muted-foreground">{userCopy.settings.companyProHint}</p>
            </CardContent>
          </Card>
        </FadeIn>
      ) : null}

      {canViewTeam ? (
        <FadeIn delay={150}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <CardTitle>{userCopy.settings.companyTeamTitle}</CardTitle>
              </div>
              <CardDescription>{userCopy.settings.companyTeamDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CompanyTeamTabs initialTab={initialTeamTab} />
            </CardContent>
          </Card>
        </FadeIn>
      ) : null}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-muted/10 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
