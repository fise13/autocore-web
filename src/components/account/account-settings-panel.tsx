"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Loader2, Mail, RefreshCw, Shield } from "lucide-react";

import { UserAvatar } from "@/components/account/user-avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { uploadUserAvatar } from "@/infrastructure/firestore/user-profile-service";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
import { formatRole, mapAuthError, userCopy } from "@/lib/user-copy";

type AccountSettingsPanelProps = {
  onStatus?: (message: string | null) => void;
};

export function AccountSettingsPanel({ onStatus }: AccountSettingsPanelProps) {
  const {
    firebaseUser,
    profile,
    refreshProfile,
    logout,
    changePassword,
    changeEmail,
    sendPasswordReset,
  } = useAuth();
  const uid = profile?.id ?? "";
  const { updateAccountProfile } = useUserPreferences(uid);

  const accountInfo = getAccountProviderInfo(firebaseUser);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? accountInfo?.displayName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarPreviewRef = useRef<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState(profile?.email ?? accountInfo?.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (busy || uploadingAvatar) return;
    setDisplayName(profile?.displayName ?? accountInfo?.displayName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile, accountInfo?.displayName, busy, uploadingAvatar]);

  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current);
      }
    };
  }, []);

  const photoURL = avatarPreview ?? profile?.photoURL ?? accountInfo?.photoURL ?? null;

  function setStatus(message: string | null) {
    setLocalStatus(message);
    onStatus?.(message);
  }

  async function runAction(action: () => Promise<void>, successMessage: string) {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus(successMessage);
    } catch (error) {
      setStatus(mapAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    await runAction(async () => {
      await updateAccountProfile({
        name: displayName.trim() || null,
        phone: phone.trim() || null,
      });
      await refreshProfile();
    }, userCopy.account.profileSaved);
  }

  async function handleAvatarChange(file: File | null) {
    if (!file) return;

    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current);
    }
    const nextPreview = URL.createObjectURL(file);
    avatarPreviewRef.current = nextPreview;
    setAvatarPreview(nextPreview);

    setUploadingAvatar(true);
    setStatus(userCopy.account.avatarUploading);

    try {
      await uploadUserAvatar(file);
      setAvatarPreview(null);
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current);
        avatarPreviewRef.current = null;
      }
      await refreshProfile();
      setStatus(userCopy.account.avatarSaved);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось загрузить фото");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDialogError(null);
    if (newPassword.length < 6) {
      setDialogError(userCopy.authErrors.weakPassword);
      return;
    }
    if (newPassword !== confirmPassword) {
      setDialogError(userCopy.account.passwordMismatch);
      return;
    }

    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus(userCopy.account.passwordChanged);
    } catch (error) {
      setDialogError(mapAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  async function onChangeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDialogError(null);

    setBusy(true);
    try {
      await changeEmail(newEmail.trim(), emailPassword);
      setEmailDialogOpen(false);
      setEmailPassword("");
      setStatus(userCopy.account.emailChanged);
      await refreshProfile();
    } catch (error) {
      setDialogError(mapAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  const isEmailProvider = accountInfo?.kind === "email";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <CardTitle>{userCopy.settings.account}</CardTitle>
          </div>
          <CardDescription>{userCopy.account.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-start gap-4 rounded-xl border bg-muted/15 p-4">
            <div className="relative">
              <input
                ref={avatarInputRef}
                id="profile-avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={busy || uploadingAvatar}
                className="sr-only"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  void handleAvatarChange(nextFile);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={busy || uploadingAvatar}
                title="Нажмите, чтобы сменить фото"
                aria-label={userCopy.account.avatar}
                onClick={() => avatarInputRef.current?.click()}
                className="group relative rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
              >
                <UserAvatar
                  photoURL={photoURL}
                  displayName={displayName}
                  email={profile?.email ?? accountInfo?.email}
                  provider={accountInfo?.kind}
                  showProviderBadge
                  size="lg"
                />
                {!uploadingAvatar ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/45">
                    <Camera className="size-5 text-white opacity-0 transition group-hover:opacity-100" />
                  </span>
                ) : null}
              </button>
              {uploadingAvatar ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1 text-sm">
                <p className="font-medium">{displayName || profile?.email || "—"}</p>
                <p className="truncate text-muted-foreground">{profile?.email ?? accountInfo?.email ?? "—"}</p>
                {phone ? <p className="text-muted-foreground">{phone}</p> : null}
                <p className="text-xs text-muted-foreground">
                  {userCopy.account.signInMethod}: {accountInfo?.label ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userCopy.settings.role}: {formatRole(profile?.role)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="profile-name">{userCopy.account.displayName}</Label>
              <Input
                id="profile-name"
                placeholder="Например, Виктор"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-phone">{userCopy.account.phone}</Label>
              <Input
                id="profile-phone"
                placeholder="+7 ..."
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={busy}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => void saveProfile()} disabled={busy || uploadingAvatar}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {userCopy.account.saveProfile}
              </Button>
              <Button variant="outline" onClick={() => void refreshProfile()} disabled={busy}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              <p className="text-sm font-medium">{userCopy.account.securityTitle}</p>
            </div>

            {isEmailProvider ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setPasswordDialogOpen(true)} disabled={busy}>
                  {userCopy.account.changePassword}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewEmail(profile?.email ?? accountInfo?.email ?? "");
                    setEmailDialogOpen(true);
                  }}
                  disabled={busy}
                >
                  <Mail className="size-4" />
                  {userCopy.account.changeEmail}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void runAction(() => sendPasswordReset(), userCopy.account.resetEmailSent)
                  }
                  disabled={busy || !profile?.email}
                >
                  {userCopy.account.sendResetEmail}
                </Button>
              </div>
            ) : accountInfo?.kind === "google" ? (
              <p className="text-sm text-muted-foreground">{userCopy.account.googlePasswordHint}</p>
            ) : accountInfo?.kind === "apple" ? (
              <p className="text-sm text-muted-foreground">{userCopy.account.applePasswordHint}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{userCopy.account.genericPasswordHint}</p>
            )}
          </div>

          <Button variant="outline" onClick={() => logout()} disabled={busy}>
            {userCopy.account.signOut}
          </Button>

          {localStatus ? <p className="text-sm text-muted-foreground">{localStatus}</p> : null}
        </CardContent>
      </Card>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userCopy.account.changePassword}</DialogTitle>
            <DialogDescription>{userCopy.account.changePasswordHint}</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onChangePassword}>
            <div className="space-y-1">
              <Label htmlFor="current-password">{userCopy.account.currentPassword}</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password">{userCopy.account.newPassword}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-password">{userCopy.account.confirmPassword}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            {dialogError ? <p className="text-sm text-destructive">{dialogError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPasswordDialogOpen(false)} disabled={busy}>
                Отмена
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {userCopy.account.savePassword}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userCopy.account.changeEmail}</DialogTitle>
            <DialogDescription>{userCopy.account.changeEmailHint}</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onChangeEmail}>
            <div className="space-y-1">
              <Label htmlFor="new-email">{userCopy.account.emailLabel}</Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-password">{userCopy.account.currentPassword}</Label>
              <Input
                id="email-password"
                type="password"
                autoComplete="current-password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                required
              />
            </div>
            {dialogError ? <p className="text-sm text-destructive">{dialogError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEmailDialogOpen(false)} disabled={busy}>
                Отмена
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {userCopy.account.saveEmail}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
