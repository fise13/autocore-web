"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { CompanyAvatar } from "@/components/layout/company-switcher-menu";
import { AuthJourneyShell } from "@/components/auth/auth-journey-shell";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { clearInviteToken, storePendingInvite } from "@/lib/invites/pending-invite";
import { normalizeCompanyId } from "@/lib/company-id";
import { inviteRequiresEmailMatch, type InvitePreview } from "@autocore/org";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type InviteAcceptScreenProps = {
  token: string;
};

const ROLE_LABELS: Record<string, string> = {
  owner: userCopy.organization.invite.roles.owner,
  admin: userCopy.organization.invite.roles.admin,
  manager: userCopy.organization.invite.roles.manager,
  employee: userCopy.organization.invite.roles.employee,
  mechanic: userCopy.organization.invite.roles.mechanic,
  accountant: userCopy.organization.invite.roles.accountant,
  diagnostician: userCopy.organization.invite.roles.diagnostician,
};

export function InviteAcceptScreen({ token }: InviteAcceptScreenProps) {
  const router = useRouter();
  const { firebaseUser, logout, refreshProfile, profile } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<{ title: string; message: string; code?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const autoAcceptStarted = useRef(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      storePendingInvite({ token });
      const response = await fetch(`/api/invites/${encodeURIComponent(token)}`);
      const payload = await response.json();
      if (!response.ok) {
        setError({
          title: payload.title ?? userCopy.organization.invite.loadFailedTitle,
          message: payload.error ?? userCopy.organization.invite.loadFailedMessage,
          code: payload.code,
        });
        setPreview(null);
        return;
      }
      setPreview(payload.preview as InvitePreview);
    } catch {
      setError({
        title: userCopy.organization.invite.offlineTitle,
        message: userCopy.organization.invite.offlineMessage,
        code: "network_error",
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const userEmail = firebaseUser?.email?.trim().toLowerCase() ?? "";
  const emailMismatch =
    preview && firebaseUser ? inviteRequiresEmailMatch(preview.email, userEmail) : false;

  async function handleAccept(switchToCompany: boolean) {
    setBusy(true);
    setError(null);
    try {
      const idToken = await firebaseUser?.getIdToken();
      if (!idToken) {
        router.push(`/login?invite=${encodeURIComponent(token)}`);
        return;
      }
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token, switchToCompany }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError({
          title: payload.title ?? userCopy.organization.invite.acceptFailedTitle,
          message: payload.error ?? userCopy.organization.invite.acceptFailedMessage,
          code: payload.code,
        });
        return;
      }
      clearInviteToken();
      await refreshProfile?.();
      router.replace("/home");
    } catch {
      setError({
        title: userCopy.organization.invite.errorTitle,
        message: userCopy.organization.invite.errorMessage,
      });
    } finally {
      setBusy(false);
    }
  }

  const tryAutoAccept = useCallback(() => {
    if (autoAcceptStarted.current || loading || busy) return;
    if (!firebaseUser || !preview?.canAccept || emailMismatch) return;

    const activeCompanyId = normalizeCompanyId(profile?.companyId);
    const inviteCompanyId = normalizeCompanyId(preview.companyId);
    const hasOtherCompany = Boolean(
      activeCompanyId && activeCompanyId !== "default" && activeCompanyId !== inviteCompanyId,
    );
    if (hasOtherCompany) return;

    autoAcceptStarted.current = true;
    void handleAccept(true);
  }, [busy, emailMismatch, firebaseUser, loading, preview, profile?.companyId]);

  useEffect(() => {
    tryAutoAccept();
  }, [tryAutoAccept]);

  async function handleDecline() {
    setBusy(true);
    try {
      const idToken = await firebaseUser?.getIdToken();
      if (idToken) {
        await fetch("/api/invites/decline", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token }),
        });
      }
      clearInviteToken();
      router.replace("/home");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthJourneyShell stepKey={token} layout="center" contentWidth="md">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error && !preview ? (
          <>
            <ScreenHeading title={error.title} subtitle={error.message} />
            <div className="flex flex-col gap-3">
              <Button onClick={() => void loadPreview()}>{userCopy.organization.invite.retry}</Button>
              <Button variant="ghost" onClick={() => router.replace("/login")}>
                {userCopy.organization.invite.home}
              </Button>
            </div>
          </>
        ) : preview && !firebaseUser ? (
          <>
            <ScreenHeading
              title={userCopy.organization.invite.title}
              subtitle={userCopy.organization.invite.subtitle(preview.companyName)}
            />
            <InviteCompanyCard preview={preview} />
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  storePendingInvite({
                    token,
                    email: preview.email ?? undefined,
                    companyName: preview.companyName,
                  });
                  router.push(`/login?invite=${encodeURIComponent(token)}`);
                }}
              >
                {userCopy.organization.invite.signIn}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  storePendingInvite({
                    token,
                    email: preview.email ?? undefined,
                    companyName: preview.companyName,
                  });
                  router.push(`/login?mode=signup&invite=${encodeURIComponent(token)}`);
                }}
              >
                {userCopy.organization.invite.createAccount}
              </Button>
            </div>
          </>
        ) : preview && emailMismatch ? (
          <>
            <ScreenHeading title={userCopy.organization.invite.otherAccountTitle} subtitle={userCopy.organization.invite.otherAccountSubtitle} />
            <Alert>
              <AlertTitle>{userCopy.organization.invite.inviteFor}</AlertTitle>
              <AlertDescription>{preview.email}</AlertDescription>
            </Alert>
            <Alert>
              <AlertTitle>{userCopy.organization.invite.signedInAs}</AlertTitle>
              <AlertDescription>{userEmail}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => void handleAccept(false)} disabled={busy}>
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : userCopy.organization.invite.continueCurrent}
              </Button>
              <Button variant="ghost" onClick={() => void logout()}>
                {userCopy.organization.invite.switchAccount}
              </Button>
            </div>
          </>
        ) : preview && busy && preview.canAccept && !emailMismatch ? (
          <>
            <ScreenHeading
              title={userCopy.organization.invite.title}
              subtitle={userCopy.organization.invite.joiningSubtitle}
            />
            <InviteCompanyCard preview={preview} />
            <div className="flex justify-center py-2">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : preview ? (
          <>
            <ScreenHeading
              title={userCopy.organization.invite.title}
              subtitle={
                preview.canAccept ? userCopy.organization.invite.acceptToJoin : userCopy.organization.invite.inviteUnavailable
              }
            />
            <InviteCompanyCard preview={preview} />
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{error.title}</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-2">
              {preview.canAccept ? (
                <>
                  <Button onClick={() => void handleAccept(true)} disabled={busy}>
                    {busy ? <LoaderCircle className="size-4 animate-spin" /> : userCopy.organization.invite.acceptAndContinue}
                  </Button>
                  <Button variant="outline" onClick={() => void handleAccept(false)} disabled={busy}>
                    {userCopy.organization.invite.acceptWithoutSwitch}
                  </Button>
                  <Button variant="ghost" onClick={() => void handleDecline()} disabled={busy}>
                    {userCopy.organization.invite.decline}
                  </Button>
                </>
              ) : (
                <Button onClick={() => router.replace("/home")}>{userCopy.organization.invite.home}</Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AuthJourneyShell>
  );
}

function ScreenHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function InviteCompanyCard({ preview }: { preview: InvitePreview }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
        "flex flex-col gap-4",
      )}
    >
      <div className="flex items-center gap-3">
        <CompanyAvatar companyId={preview.companyId} name={preview.companyName} size="md" />
        <div>
          <p className="text-base font-semibold text-foreground">{preview.companyName}</p>
          <p className="text-sm text-muted-foreground">
            {userCopy.organization.invite.rolePrefix(ROLE_LABELS[preview.role] ?? preview.role)}
          </p>
        </div>
      </div>
      {preview.inviterName ? (
        <p className="text-sm text-muted-foreground">{userCopy.organization.invite.invitedBy(preview.inviterName)}</p>
      ) : null}
      {preview.email ? (
        <p className="text-sm text-muted-foreground">Email: {preview.email}</p>
      ) : null}
    </div>
  );
}
