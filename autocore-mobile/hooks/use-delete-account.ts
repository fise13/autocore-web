import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/authentication/auth-provider';
import { accountUsesPassword } from '@/services/auth/delete-account';
import { haptics } from '@/theme';
import { getAuthErrorCode, mapAuthError } from '@/utils/auth-error';

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
        await deleteAccount(pwd);
        setPasswordOpen(false);
        setPassword('');
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
      'This action can\'t be undone. Your profile and access to AutoCore will be removed. Company data will remain with other members.',
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
