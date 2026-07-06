import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { MailIcon } from '@/assets/icons';
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

export type TeamInviteSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type TeamInviteSheetProps = {
  companyId: string;
  userId: string;
  onShareCode: (code: string) => void;
  onShareLink: (url: string) => void;
};

const TTL_OPTIONS = [
  { value: 24, label: '24 ч' },
  { value: 72, label: '72 ч' },
  { value: 168, label: '7 дн' },
] as const;

export const TeamInviteSheet = forwardRef<TeamInviteSheetRef, TeamInviteSheetProps>(
  function TeamInviteSheet({ companyId, userId, onShareCode, onShareLink }, ref) {
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

    const resetForm = useCallback(() => {
      setEmail('');
      setInviteRole('mechanic');
      setTtlHours(72);
      setError(null);
      setSuccessMessage(null);
      setJoinUrl(null);
      setGeneratedCode(null);
    }, []);

    useImperativeHandle(ref, () => ({
      present: () => {
        resetForm();
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const renderBackdrop = sheet.renderBackdrop;

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

        if (result.kind === 'sent') {
          haptics.success();
          setSuccessMessage(`Приглашение отправлено на ${result.email}`);
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
        setError(nextError instanceof Error ? nextError.message : 'Не удалось отправить приглашение');
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
        void NotificationService.syncInbox();
        haptics.success();
      } catch (nextError) {
        haptics.warning();
        setError(nextError instanceof Error ? nextError.message : 'Не удалось создать код');
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
              Пригласить сотрудника
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 13, lineHeight: 18 }}>
              Отправьте приглашение на email или создайте код для ручной передачи.
            </Text>
          </View>

          <Input
            label="Email сотрудника"
            helperText="Сотрудник получит письмо со ссылкой для входа в команду."
            value={email}
            onChangeText={setEmail}
            placeholder="colleague@company.ru"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<MailIcon size="sm" color={colors.mutedForeground} strokeWidth={1.9} />}
          />
          <Button loading={busy} disabled={!email.trim()} onPress={() => void handleSendEmail()}>
            Отправить на email
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
                <Button variant="secondary" size="sm" onPress={() => onShareLink(joinUrl)}>
                  Поделиться ссылкой
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
            <Text variant="caption" color="muted" style={{ fontSize: 11, fontWeight: '600' }}>
              РОЛЬ НОВОГО СОТРУДНИКА
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
            <Text variant="caption" color="muted" style={{ fontSize: 11, fontWeight: '600' }}>
              СРОК ДЕЙСТВИЯ
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
            <Text variant="caption" color="muted" style={{ fontSize: 11, fontWeight: '600' }}>
              ИЛИ КОД
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
                Код для роли «{formatRole(inviteRole)}»
              </Text>
              <Text variant="heading" style={{ fontSize: 32, fontWeight: '800', letterSpacing: 4, fontVariant: ['tabular-nums'] }}>
                {generatedCode}
              </Text>
              <Button variant="secondary" size="sm" onPress={() => onShareCode(generatedCode)}>
                Поделиться кодом
              </Button>
            </View>
          ) : (
            <Button variant="outline" loading={busy} onPress={() => void handleCreateCode()}>
              Создать код приглашения
            </Button>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
