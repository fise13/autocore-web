import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CopyIcon, ExternalLinkIcon, MailIcon, Share2Icon } from '@/assets/icons';
import { Button, Input, Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import {
  INVITE_ROLE_HINTS,
  INVITE_ROLES,
  formatRole,
} from '@/lib/team/format';
import { sendEmployeeInviteEmail } from '@/services/api/invites';
import { createCompanyInvite } from '@/services/firestore/invite-service';
import { NotificationService } from '@/services/notifications';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import type { UserRole } from '@/types/user';

import { profileLayout } from '../layout';

export type TeamInvitePresentOptions = {
  personName?: string;
  directoryPersonId?: string;
};

export type TeamInviteSheetRef = {
  present: (options?: TeamInvitePresentOptions) => void;
  dismiss: () => void;
};

type TeamInviteSheetProps = {
  companyId: string;
  userId: string;
  onShareCode: (code: string) => void;
  onShareLink: (url: string) => void;
  onInviteCreated?: (inviteId: string, directoryPersonId?: string) => void;
};

const TTL_OPTIONS = [
  { value: 24, label: '24 hr' },
  { value: 72, label: '72 hr' },
  { value: 168, label: '7 days' },
] as const;

export const TeamInviteSheet = forwardRef<TeamInviteSheetRef, TeamInviteSheetProps>(
  function TeamInviteSheet({ companyId, userId, onShareCode, onShareLink, onInviteCreated }, ref) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet();
    const sheetRef = useRef<BottomSheetModal>(null);

    const [email, setEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('mechanic');
    const [ttlHours, setTtlHours] = useState<number>(72);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [joinUrl, setJoinUrl] = useState<string | null>(null);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [personName, setPersonName] = useState<string | null>(null);
    const directoryPersonIdRef = useRef<string | undefined>(undefined);

    const resetForm = useCallback(() => {
      setEmail('');
      setInviteRole('mechanic');
      setTtlHours(72);
      setError(null);
      setSuccessMessage(null);
      setJoinUrl(null);
      setGeneratedCode(null);
      setPersonName(null);
      directoryPersonIdRef.current = undefined;
    }, []);

    useImperativeHandle(ref, () => ({
      present: (options) => {
        resetForm();
        if (options?.personName?.trim()) {
          setPersonName(options.personName.trim());
        }
        directoryPersonIdRef.current = options?.directoryPersonId;
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const renderBackdrop = sheet.renderBackdrop;

    const notifyInviteCreated = (inviteId?: string) => {
      if (!inviteId) return;
      onInviteCreated?.(inviteId, directoryPersonIdRef.current);
    };

    async function handleSendEmail() {
      setBusy(true);
      setError(null);
      setSuccessMessage(null);
      setJoinUrl(null);
      haptics.light();

      try {
        const result = await sendEmployeeInviteEmail({
          email,
          role: inviteRole,
          ttlHours,
        });

        notifyInviteCreated(result.inviteId);

        if (result.kind === 'sent') {
          haptics.success();
          setSuccessMessage(
            personName
              ? `Invite for ${personName} sent to ${result.email}`
              : `Invite sent to ${result.email}`,
          );
          setJoinUrl(result.joinUrl ?? null);
          setEmail('');
          void NotificationService.syncInbox();
        } else {
          setSuccessMessage(result.message);
          setJoinUrl(result.joinUrl);
          void NotificationService.syncInbox();
        }
      } catch (nextError) {
        haptics.warning();
        setError(nextError instanceof Error ? nextError.message : 'Failed to send invite');
      } finally {
        setBusy(false);
      }
    }

    async function handleCreateCode() {
      setBusy(true);
      setError(null);
      haptics.light();

      try {
        const invite = await createCompanyInvite({
          companyId,
          role: inviteRole,
          createdBy: userId,
          ttlHours,
        });
        setGeneratedCode(invite.code);
        notifyInviteCreated(invite.id);
        void NotificationService.syncInbox();
        haptics.success();
      } catch (nextError) {
        haptics.warning();
        setError(nextError instanceof Error ? nextError.message : 'Failed to create code');
      } finally {
        setBusy(false);
      }
    }

    return (
      <BottomSheetModal
        ref={sheetRef}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={sheet.formSnapPoints}
        topInset={sheet.topInset}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={sheet.backgroundStyle}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ ...sheet.formContentStyle, gap: 18 }}
        >
          <View style={{ gap: 4 }}>
            <Text variant="heading" style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }}>
              {personName ? `Invite ${personName}` : 'Invite'}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 13, lineHeight: 18 }}>
              Email a link or share a code.
            </Text>
          </View>

          <Input
            label="Email"
            helperText="They’ll get a link to join."
            value={email}
            onChangeText={setEmail}
            placeholder="colleague@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<MailIcon size="sm" color={colors.mutedForeground} strokeWidth={1.9} />}
          />
          <Button
            native={false}
            size="lg"
            loading={busy}
            disabled={!email.trim()}
            leftIcon={<MailIcon size="sm" color={colors.primaryForeground} strokeWidth={1.5} />}
            onPress={() => void handleSendEmail()}
          >
            Send email
          </Button>

          {successMessage ? (
            <View
              style={{
                borderRadius: 14,
                borderWidth: profileLayout.hairline,
                borderColor: toneBackground(colors.primary, 0.25),
                backgroundColor: toneBackground(colors.primary, 0.08),
                padding: 14,
                gap: 10,
              }}
            >
              <Text variant="body" style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                {successMessage}
              </Text>
              {joinUrl ? (
                <Button
                  native={false}
                  variant="secondary"
                  size="sm"
                  leftIcon={<ExternalLinkIcon size="sm" color={colors.foreground} strokeWidth={1.5} />}
                  onPress={() => onShareLink(joinUrl)}
                >
                  Share link
                </Button>
              ) : null}
            </View>
          ) : null}

          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}

          <View style={{ gap: 10 }}>
            <Text variant="footnote" color="muted" style={{ fontWeight: '500', letterSpacing: -0.08 }}>
              Role
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {INVITE_ROLES.map((role) => {
                const active = inviteRole === role;
                return (
                  <Pressable
                    key={role}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      haptics.selection();
                      setInviteRole(role);
                    }}
                    style={{
                      width: '48%',
                      borderRadius: 14,
                      borderWidth: profileLayout.hairline,
                      borderColor: active ? toneBackground(colors.primary, 0.45) : colors.border,
                      backgroundColor: active ? toneBackground(colors.primary, 0.08) : colors.background,
                      padding: 12,
                      gap: 4,
                    }}
                  >
                    <Text variant="body" style={{ fontSize: 14, fontWeight: '700' }}>
                      {formatRole(role)}
                    </Text>
                    {INVITE_ROLE_HINTS[role] ? (
                      <Text variant="caption" color="muted" style={{ fontSize: 11, lineHeight: 15 }}>
                        {INVITE_ROLE_HINTS[role]}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text variant="footnote" color="muted" style={{ fontWeight: '500', letterSpacing: -0.08 }}>
              Expires
            </Text>
            <View
              style={{
                flexDirection: 'row',
                borderRadius: 12,
                borderWidth: profileLayout.hairline,
                borderColor: colors.border,
                backgroundColor: colors.muted,
                padding: 4,
                gap: 4,
              }}
            >
              {TTL_OPTIONS.map((option) => {
                const active = ttlHours === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      haptics.selection();
                      setTtlHours(option.value);
                    }}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? colors.card : 'transparent',
                    }}
                  >
                    <Text variant="caption" style={{ fontWeight: active ? '700' : '500' }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text variant="footnote" color="muted" style={{ fontWeight: '500', letterSpacing: -0.08 }}>
              Or code
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {generatedCode ? (
            <View
              style={{
                borderRadius: 16,
                borderWidth: profileLayout.hairline,
                borderColor: toneBackground(colors.primary, 0.3),
                backgroundColor: toneBackground(colors.primary, 0.06),
                padding: 18,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text variant="caption" color="muted">
                {formatRole(inviteRole)} code
              </Text>
              <Text
                variant="heading"
                style={{ fontSize: 32, fontWeight: '800', letterSpacing: 4, fontVariant: ['tabular-nums'] }}
              >
                {generatedCode}
              </Text>
              <Button
                native={false}
                variant="secondary"
                size="sm"
                leftIcon={<Share2Icon size="sm" color={colors.foreground} strokeWidth={1.5} />}
                onPress={() => onShareCode(generatedCode)}
              >
                Share code
              </Button>
            </View>
          ) : (
            <Button
              native={false}
              variant="secondary"
              size="lg"
              loading={busy}
              leftIcon={<CopyIcon size="sm" color={colors.foreground} strokeWidth={1.5} />}
              onPress={() => void handleCreateCode()}
            >
              Create code
            </Button>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
