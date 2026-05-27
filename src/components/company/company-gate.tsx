"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Laptop, Users } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { mapAuthError, userCopy } from "@/lib/user-copy";

type CompanyGateProps = {
  children: ReactNode;
};

export function CompanyGate({ children }: CompanyGateProps) {
  const { profile, createCompany, joinCompanyWithInvite, ensureDefaultCompany, isLoading } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || profile === null) {
    return <AppLoadingScreen message={userCopy.auth.completing} />;
  }

  const hasCompany = Boolean(profile.companyId && profile.companyId.trim().length > 0);
  if (hasCompany) return <>{children}</>;

  if (isSubmitting) {
    return <AppLoadingScreen message={submitMessage ?? userCopy.auth.completing} />;
  }

  async function runAction(action: () => Promise<void>, message: string) {
    setIsSubmitting(true);
    setSubmitMessage(message);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(mapAuthError(e, { surface: "onboarding" }));
      setIsSubmitting(false);
      setSubmitMessage(null);
    }
  }

  async function onCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyName.trim()) return;
    await runAction(async () => {
      await createCompany(companyName.trim());
      setCompanyName("");
    }, "Создание компании…");
  }

  async function onJoinCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    await runAction(async () => {
      await joinCompanyWithInvite(inviteCode.trim());
      setInviteCode("");
    }, "Присоединение к компании…");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <AppLogo size={40} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{userCopy.company.welcomeTitle}</h1>
            <p className="text-sm text-muted-foreground">{userCopy.company.welcomeDescription}</p>
          </div>
        </div>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background">
                <Laptop className="size-4 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">{userCopy.company.macQuestion}</CardTitle>
                <CardDescription>{userCopy.company.macDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Button
              type="button"
              className="w-full"
              disabled={isSubmitting}
              onClick={() =>
                runAction(() => ensureDefaultCompany(), "Подключение к «Моей бухгалтерии»…")
              }
            >
              {userCopy.company.macButton}
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{userCopy.company.newTeamTitle}</CardTitle>
            <CardDescription>{userCopy.company.newTeamDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreateCompany} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="companyName">{userCopy.company.companyNameLabel}</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder={userCopy.company.companyNamePlaceholder}
                  required
                />
              </div>
              <Button type="submit" variant="secondary" disabled={isSubmitting} className="w-full">
                {userCopy.company.createButton}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
            onClick={() => setShowInvite((current) => !current)}
          >
            {userCopy.company.inviteLink}
          </button>
        </div>

        {showInvite ? (
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
                  <Users className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{userCopy.company.inviteTitle}</CardTitle>
                  <CardDescription>{userCopy.company.inviteDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={onJoinCompany} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inviteCode">{userCopy.company.inviteLabel}</Label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="Например: DUAVV5"
                    required
                  />
                </div>
                <Button type="submit" variant="outline" disabled={isSubmitting} className="w-full">
                  Присоединиться
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
