import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

export type ImportCameraHandle = {
  takePicture: () => Promise<string | null>;
};

type ImportCameraProps = {
  torch: boolean;
  active: boolean;
};

export const ImportCamera = forwardRef<ImportCameraHandle, ImportCameraProps>(function ImportCamera(
  { torch, active },
  ref,
) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useImperativeHandle(ref, () => ({
    async takePicture() {
      if (!cameraRef.current || !readyRef.current) return null;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        return photo?.uri ?? null;
      } catch {
        return null;
      }
    },
  }));

  if (!permission) {
    return <View style={[styles.fill, { backgroundColor: '#000' }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.permission]}>
        <Text variant="body" style={{ color: '#f5f5f7', fontWeight: '600', marginBottom: 8 }}>
          Камера
        </Text>
        <Text variant="caption" style={{ color: '#9ca3af', textAlign: 'center', marginBottom: 16 }}>
          Нужен доступ к камере, чтобы сфотографировать документ.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void requestPermission()}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.primary,
            }}
          >
            <Text variant="caption" style={{ color: colors.primaryForeground, fontWeight: '600' }}>
              Разрешить
            </Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Открыть настройки
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <CameraView
      ref={cameraRef}
      style={styles.fill}
      facing="back"
      enableTorch={torch && active}
      autofocus="off"
      active={active}
      onCameraReady={() => {
        readyRef.current = true;
      }}
    />
  );
});

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#000',
  },
  permission: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
