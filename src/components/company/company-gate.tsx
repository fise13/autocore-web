"use client";

import { FormEvent, ReactNode, useState } from "react";

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
      setError(mapAuthError(e));
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="grid w-full max-w-5xl gap-4 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>{userCopy.company.connectTitle}</CardTitle>
            <CardDescription>{userCopy.company.connectDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => runAction(() => ensureDefaultCompany(), "Подключение к «Моей бухгалтерии»…")}
            >
              {userCopy.company.connectButton}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{userCopy.company.createTitle}</CardTitle>
            <CardDescription>{userCopy.company.createDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreateCompany} className="space-y-3">
              <Label htmlFor="companyName">Название компании</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Например: МоторЛенд"
                required
              />
              <Button type="submit" disabled={isSubmitting} className="w-full">
                Создать
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{userCopy.company.joinTitle}</CardTitle>
            <CardDescription>Если вас пригласили в существующую компанию.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onJoinCompany} className="space-y-3">
              <Label htmlFor="inviteCode">{userCopy.company.inviteLabel}</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Например: DUAVV5"
                required
              />
              <Button type="submit" variant="secondary" disabled={isSubmitting} className="w-full">
                Присоединиться
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
