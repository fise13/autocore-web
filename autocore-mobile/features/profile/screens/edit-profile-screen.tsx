import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';

import { ArrowLeftIcon, ImagesIcon } from '@/assets/icons';
import { UserAvatar } from '@/components/account/user-avatar';
import { Button, IconButton, Input, Text } from '@/components/ui';
import { useAuth } from '@/authentication/auth-provider';
import { useTheme, useUserPhotoUrl } from '@/hooks';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import { uploadUserAvatar } from '@/services/api/account';
import { getFirebaseAuth } from '@/services/firebase';
import { updateUserAccountProfile } from '@/services/firebase/profile';
import { mapAuthError } from '@/utils/auth-error';
import { haptics } from '@/theme';

import { profileLayout } from '../layout';

function isEmailProvider(providerIds: string[]): boolean {
  return providerIds.includes('password') || providerIds.length === 0;
}

export function EditProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { firebaseUser, profile, refreshProfile, sendPasswordResetForEmail } = useAuth();
  const photoURL = useUserPhotoUrl();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const providerIds = firebaseUser?.providerData.map((entry) => entry.providerId) ?? [];
  const emailProvider = isEmailProvider(providerIds);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile?.displayName, profile?.phone]);

  const pickAndUploadAvatar = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Нужен доступ к фото.');
      return;
    }

    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (pick.canceled || !pick.assets[0]?.uri) return;

    const asset = pick.assets[0];

    try {
      setUploadingPhoto(true);
      await uploadUserAvatar(asset.uri);
      await refreshProfile();
      haptics.success();
      setStatus('Фото профиля обновлено.');
    } catch (uploadError) {
      setError(mapAuthError(uploadError));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      if (!firebaseUser) {
        throw new Error('Требуется авторизация');
      }
      await updateUserAccountProfile(firebaseUser, {
        name: displayName.trim() || null,
        phone: phone.trim() || null,
      });
      await refreshProfile();
      setStatus('Профиль сохранён.');
    } catch (saveError) {
      setError(mapAuthError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      setError('Пароль слишком короткий (минимум 6 символов).');
      return;
    }

    const user = getFirebaseAuth().currentUser;
    if (!user?.email) {
      setError('Недоступно для этого способа входа.');
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setStatus('Пароль обновлён.');
    } catch (passwordError) {
      setError(mapAuthError(passwordError));
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    const email = profile?.email ?? firebaseUser?.email;
    if (!email) return;
    setSaving(true);
    setError(null);
    try {
      await sendPasswordResetForEmail(email);
      setStatus('Ссылка для сброса пароля отправлена на email.');
    } catch (resetError) {
      setError(mapAuthError(resetError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: profileLayout.pad,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <IconButton accessibilityLabel="Назад" variant="ghost" size="sm" onPress={() => goBackOrReplace(router)}>
          <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
        </IconButton>
        <Text variant="heading" style={{ fontSize: 20, fontWeight: '700' }}>
          Редактировать профиль
        </Text>
      </View>

      <View style={{ paddingHorizontal: profileLayout.pad, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <View style={{ position: 'relative' }}>
            <UserAvatar
              photoURL={photoURL}
              displayName={displayName || profile?.displayName}
              email={profile?.email ?? firebaseUser?.email ?? ''}
              seed={profile?.id ?? firebaseUser?.uid}
              size="2xl"
            />
            {uploadingPhoto ? (
              <View
                style={{
                  ...StyleSheet.absoluteFill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                }}
              >
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickAndUploadAvatar()}
            disabled={uploadingPhoto}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.secondary,
              opacity: uploadingPhoto ? 0.6 : 1,
            }}
          >
            <ImagesIcon size="sm" color={colors.foreground} strokeWidth={2} />
            <Text variant="caption" style={{ fontWeight: '600' }}>
              Изменить фото
            </Text>
          </Pressable>
          <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 18 }}>
            Фото синхронизируется между устройствами через ваш аккаунт.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="caption" color="muted">
            Имя и фамилия
          </Text>
          <Input value={displayName} onChangeText={setDisplayName} autoCapitalize="words" placeholder="Имя Фамилия" />
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="caption" color="muted">
            Телефон
          </Text>
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+7 …" />
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="caption" color="muted">
            Email
          </Text>
          <Input value={profile?.email ?? firebaseUser?.email ?? ''} editable={false} />
        </View>

        <Button loading={saving} onPress={saveProfile}>
          Сохранить профиль
        </Button>

        {emailProvider ? (
          <View
            style={{
              gap: 12,
              marginTop: 8,
              padding: 16,
              borderRadius: profileLayout.cardRadius,
              borderWidth: profileLayout.hairline,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text variant="body" style={{ fontWeight: '600' }}>
              Пароль
            </Text>
            <Input
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Текущий пароль"
              autoCapitalize="none"
            />
            <Input
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Новый пароль"
              autoCapitalize="none"
            />
            <Button variant="secondary" loading={saving} onPress={changePassword}>
              Сменить пароль
            </Button>
            <Button variant="link" onPress={resetPassword}>
              Отправить ссылку для сброса
            </Button>
          </View>
        ) : null}

        {status ? (
          <Text variant="caption" style={{ color: colors.success }}>
            {status}
          </Text>
        ) : null}
        {error ? (
          <Text variant="caption" style={{ color: colors.destructive }}>
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
