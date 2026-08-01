import { View } from 'react-native';

import { Button, Dialog, Input, Text } from '@/components/ui';
import { useTheme } from '@/hooks';

type DeleteAccountDialogProps = {
  open: boolean;
  password: string;
  loading: boolean;
  error: string | null;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteAccountDialog({
  open,
  password,
  loading,
  error,
  onPasswordChange,
  onConfirm,
  onCancel,
}: DeleteAccountDialogProps) {
  const { colors } = useTheme();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title="Confirm deletion"
      description="Enter your current password to permanently delete your account."
      footer={
        <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
          <Button variant="secondary" disabled={loading} onPress={onCancel} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            disabled={loading}
            loading={loading}
            onPress={onConfirm}
            style={{ flex: 1, backgroundColor: colors.destructive, borderColor: colors.destructive }}
          >
            Delete
          </Button>
        </View>
      }
    >
      <View style={{ gap: 10 }}>
        <Input
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Current password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          editable={!loading}
        />
        {error ? (
          <Text variant="caption" style={{ color: colors.destructive, lineHeight: 18 }}>
            {error}
          </Text>
        ) : null}
      </View>
    </Dialog>
  );
}
