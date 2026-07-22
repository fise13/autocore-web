import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { Text } from '@/components/ui';
import { usePreferredMacroLens } from '@/hooks/use-preferred-macro-lens';
import { useTheme } from '@/hooks';
import { scanPayloadKey } from '@/lib/scan/normalize-scan-payload';
import type { ScanDetection } from '@/services/scan';

export type ScanCameraHandle = {
  takePicture: () => Promise<string | null>;
};

type ScanCameraProps = {
  torch: boolean;
  active: boolean;
  scanEnabled: boolean;
  onDetection: (detection: ScanDetection) => void;
  onDetections: (detections: ScanDetection[]) => void;
};

const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'codabar',
] as const;

const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
const EMIT_COOLDOWN_MS = 60;

function toDetection(result: BarcodeScanningResult): ScanDetection | null {
  const payload = (result.data ?? '').replace(CONTROL_CHARS, '').trim();
  if (!payload) return null;
  return {
    payload,
    symbology: result.type,
    bounds: result.bounds ?? {
      origin: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
    },
    cornerPoints: result.cornerPoints ?? [],
  };
}

export const ScanCamera = forwardRef<ScanCameraHandle, ScanCameraProps>(function ScanCamera(
  { torch, active, scanEnabled, onDetection, onDetections: _onDetections },
  ref,
) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const scanEnabledRef = useRef(scanEnabled);
  const onDetectionRef = useRef(onDetection);
  const lastEmitRef = useRef<{ key: string; at: number } | null>(null);
  const { selectedLens, onAvailableLensesChanged, refreshLenses } = usePreferredMacroLens(
    cameraRef,
    active,
  );

  useEffect(() => {
    scanEnabledRef.current = scanEnabled;
  }, [scanEnabled]);

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
    if (!active) return;
    if (!permission?.granted && permission?.canAskAgain) {
      void requestPermission();
    }
  }, [active, permission, requestPermission]);

  const handleBarcode = useCallback((result: BarcodeScanningResult) => {
    if (!scanEnabledRef.current) return;

    const detection = toDetection(result);
    if (!detection) return;

    const key = scanPayloadKey(detection.payload);
    const now = Date.now();
    const last = lastEmitRef.current;
    if (last && last.key === key && now - last.at < EMIT_COOLDOWN_MS) return;
    lastEmitRef.current = { key, at: now };

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

  // CRITICAL: unmount CameraView when leaving the tab.
  // A living native camera layer steals touches from the tab bar and other screens.
  if (!active) {
    return <View style={[styles.fill, { backgroundColor: '#000' }]} />;
  }

  return (
    <CameraView
      ref={cameraRef}
      style={styles.fill}
      facing="back"
      enableTorch={torch}
      // "off" = continuous autofocus (required for auto-macro switching).
      autofocus="off"
      selectedLens={selectedLens}
      onAvailableLensesChanged={onAvailableLensesChanged}
      active
      barcodeScannerSettings={{
        barcodeTypes: [...BARCODE_TYPES],
      }}
      onBarcodeScanned={scanEnabled ? handleBarcode : undefined}
      onCameraReady={refreshLenses}
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
