import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';

import { ImagesIcon } from '@/assets/icons';
import { UserAvatar } from '@/components/account/user-avatar';
import {
  Button,
  Input,
  ListSection,
  StackScreen,
  Text,
} from '@/components/ui';
import { useAuth } from '@/authentication/auth-provider';
import { useTheme, useUserPhotoUrl } from '@/hooks';
import { uploadUserAvatar } from '@/services/api/account';
import { getFirebaseAuth } from '@/services/firebase';
import { updateUserAccountProfile } from '@/services/firebase/profile';
import { mapAuthError } from '@/utils/auth-error';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';

function isEmailProvider(providerIds: string[]): boolean {
  return providerIds.includes('password') || providerIds.length === 0;
}

export function EditProfileScreen() {
  const { colors } = useTheme();
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
      setError('Photo access is required.');
      return;
    }

    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (pick.canceled || !pick.assets[0]?.uri) return;

    try {
      setUploadingPhoto(true);
      await uploadUserAvatar(pick.assets[0].uri);
      await refreshProfile();
      haptics.success();
      setStatus('Profile photo updated.');
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
      if (!firebaseUser) throw new Error('Authentication required');
      await updateUserAccountProfile(firebaseUser, {
        name: displayName.trim() || null,
        phone: phone.trim() || null,
      });
      await refreshProfile();
      haptics.success();
      setStatus('Profile saved.');
    } catch (saveError) {
      setError(mapAuthError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      setError('Password is too short (minimum 6 characters).');
      return;
    }

    const user = getFirebaseAuth().currentUser;
    if (!user?.email) {
      setError('Not available for this sign-in method.');
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
      haptics.success();
      setStatus('Password updated.');
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
      setStatus('Password reset link sent to your email.');
    } catch (resetError) {
      setError(mapAuthError(resetError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StackScreen title="Edit Profile" subtitle="Name, photo, and password">
      <View style={{ alignItems: 'center', gap: tokens.space.stack, paddingVertical: tokens.space.stack }}>
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
            borderRadius: tokens.radius.full,
            backgroundColor: colors.card,
            opacity: uploadingPhoto ? 0.6 : 1,
          }}
        >
          <ImagesIcon size="sm" color={colors.foreground} strokeWidth={1.75} />
          <Text variant="caption" style={{ fontWeight: '600' }}>
            Change photo
          </Text>
        </Pressable>
      </View>

      <ListSection title="Profile" footer="Your photo syncs across devices through your account.">
        <View style={{ padding: tokens.space.stack + 2, gap: tokens.space.stack }}>
          <View style={{ gap: tokens.space.inline }}>
            <Text variant="footnote" color="muted">
              Full name
            </Text>
            <Input
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              placeholder="First Last"
            />
          </View>
          <View style={{ gap: tokens.space.inline }}>
            <Text variant="footnote" color="muted">
              Phone
            </Text>
            <Input
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+1 …"
            />
          </View>
          <View style={{ gap: tokens.space.inline }}>
            <Text variant="footnote" color="muted">
              Email
            </Text>
            <Input value={profile?.email ?? firebaseUser?.email ?? ''} editable={false} />
          </View>
        </View>
      </ListSection>

      {emailProvider ? (
        <ListSection title="Password" footer="Use a strong password you do not reuse elsewhere.">
          <View style={{ padding: tokens.space.stack + 2, gap: tokens.space.stack }}>
            <Input
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Current password"
              autoCapitalize="none"
            />
            <Input
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="New password"
              autoCapitalize="none"
            />
            <Button variant="secondary" loading={saving} onPress={() => void changePassword()}>
              Change password
            </Button>
            <Button variant="link" onPress={() => void resetPassword()}>
              Send reset link
            </Button>
          </View>
        </ListSection>
      ) : null}

      {status ? (
        <Text
          variant="caption"
          style={{
            color: colors.success,
            marginHorizontal: tokens.space.screenX,
            marginBottom: tokens.space.stack,
          }}
        >
          {status}
        </Text>
      ) : null}
      {error ? (
        <Text
          variant="caption"
          style={{
            color: colors.destructive,
            marginHorizontal: tokens.space.screenX,
            marginBottom: tokens.space.stack,
          }}
        >
          {error}
        </Text>
      ) : null}

      <View style={{ marginHorizontal: tokens.space.screenX, marginBottom: tokens.space.section }}>
        <Button
          native={false}
          loading={saving}
          onPress={() => void saveProfile()}
        >
          Save changes
        </Button>
      </View>
    </StackScreen>
  );
}
