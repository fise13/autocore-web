import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import type { ScanDetection } from '@/services/scan';

export type ScanCameraHandle = {
  takePicture: () => Promise<string | null>;
};

type ScanCameraProps = {
  torch: boolean;
  active: boolean;
  onDetection: (detection: ScanDetection) => void;
};

const BARCODE_TYPES = [
  'qr',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'codabar',
  'datamatrix',
  'pdf417',
  'aztec',
] as const;

function toDetection(result: BarcodeScanningResult): ScanDetection | null {
  const payload = result.data?.trim();
  if (!payload) return null;
  return {
    payload,
    symbology: result.type,
    bounds: result.bounds,
    cornerPoints: result.cornerPoints ?? [],
  };
}

export const ScanCamera = forwardRef<ScanCameraHandle, ScanCameraProps>(function ScanCamera(
  { torch, active, onDetection },
  ref,
) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const activeRef = useRef(active);
  const onDetectionRef = useRef(onDetection);
  const readyRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onDetectionRef.current = onDetection;
  }, [onDetection]);

  useImperativeHandle(ref, () => ({
    async takePicture() {
      if (!cameraRef.current) return null;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: true,
        });
        return photo?.uri ?? null;
      } catch {
        return null;
      }
    },
  }));

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  // Keep handler stable — toggling undefined disables native barcodeScannerEnabled in release.
  const handleBarcode = useCallback((result: BarcodeScanningResult) => {
    if (!activeRef.current || !readyRef.current) return;
    const detection = toDetection(result);
    if (!detection) return;
    onDetectionRef.current(detection);
  }, []);

  if (!permission) {
    return <View style={[styles.fill, { backgroundColor: '#000' }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.permission, { backgroundColor: '#000' }]}>
        <Text variant="body" style={{ color: '#f5f5f7', fontWeight: '600', marginBottom: 8 }}>
          Камера
        </Text>
        <Text variant="caption" style={{ color: '#9ca3af', textAlign: 'center', marginBottom: 16 }}>
          Нужен доступ к камере для сканирования.
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
      enableTorch={torch}
      autofocus="on"
      active
      onCameraReady={() => {
        readyRef.current = true;
      }}
      barcodeScannerSettings={{
        barcodeTypes: [...BARCODE_TYPES],
      }}
      onBarcodeScanned={handleBarcode}
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
