import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/authentication/auth-provider';
import { accountUsesPassword, type DeleteAccountResult } from '@/services/auth/delete-account';
import { haptics } from '@/theme';
import { getAuthErrorCode, mapAuthError } from '@/utils/auth-error';

const SUPPORT_EMAIL = 'support@myautocore.com';

/**
 * The account is gone in every branch below — these messages only differ in
 * what they can promise about the data that went with it. Saying "everything is
 * deleted" when a write was refused would be the one thing App Review is
 * actually checking for, so a partial result says so and offers a way to finish.
 */
function describeOutcome(result: DeleteAccountResult): { title: string; message: string } {
  if (!result.dataFullyRemoved) {
    return {
      title: 'Account deleted',
      message:
        'Your sign-in has been removed and you are signed out. Some profile records could not ' +
        `be reached and may take a moment to clear. If anything remains, contact ${SUPPORT_EMAIL}.`,
    };
  }

  if (result.appleRevocation === 'failed' || result.appleRevocation === 'not-configured') {
    return {
      title: 'Account deleted',
      message:
        'Your account and profile data have been deleted. AutoCore may still appear under ' +
        'Settings → Apple Account → Sign in with Apple; you can remove it there.',
    };
  }

  return {
    title: 'Account deleted',
    message: 'Your account and profile data have been permanently deleted.',
  };
}

export function useDeleteAccount() {
  const { firebaseUser, deleteAccount } = useAuth();
  const needsPassword = accountUsesPassword(firebaseUser);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDelete = useCallback(
    async (pwd?: string) => {
      setLoading(true);
      setError(null);
      try {
        haptics.warning();
        const result = await deleteAccount(pwd);
        setPasswordOpen(false);
        setPassword('');
        const { title, message } = describeOutcome(result);
        Alert.alert(title, message);
      } catch (deleteError) {
        if (getAuthErrorCode(deleteError) === 'auth/cancelled') {
          setPasswordOpen(false);
          return;
        }
        const message = mapAuthError(deleteError);
        setError(message);
        if (!passwordOpen) {
          Alert.alert('Could not delete account', message);
        }
      } finally {
        setLoading(false);
      }
    },
    [deleteAccount, passwordOpen],
  );

  const requestDelete = useCallback(() => {
    setError(null);
    Alert.alert(
      'Delete account?',
      "This can't be undone. Your profile, sign-in, saved preferences, and access to AutoCore " +
        'are permanently deleted, and you are removed from every company you belong to. ' +
        'Work your company already recorded — stock, orders, documents — stays with that company.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (needsPassword) {
              setPassword('');
              setPasswordOpen(true);
              return;
            }
            void runDelete();
          },
        },
      ],
    );
  }, [needsPassword, runDelete]);

  const confirmPasswordDelete = useCallback(() => {
    if (!password.trim()) {
      setError('Enter your current password.');
      return;
    }
    void runDelete(password);
  }, [password, runDelete]);

  const cancelPasswordDelete = useCallback(() => {
    if (loading) return;
    setPasswordOpen(false);
    setPassword('');
    setError(null);
  }, [loading]);

  return {
    needsPassword,
    passwordOpen,
    password,
    setPassword,
    loading,
    error,
    requestDelete,
    confirmPasswordDelete,
    cancelPasswordDelete,
  };
}
