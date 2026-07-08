import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { normalizeScanPayload } from '@/lib/scan/normalize-scan-payload';
import { preferIphoneMacroLens } from '@/lib/scan/prefer-iphone-macro-lens';
import type { ScanDetection } from '@/services/scan';

export type ScanCameraHandle = {
  takePicture: () => Promise<string | null>;
};

type ScanCameraProps = {
  torch: boolean;
  active: boolean;
  onDetection: (detection: ScanDetection) => void;
  onDetections: (detections: ScanDetection[]) => void;
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

const MULTI_CODE_WINDOW_MS = 70;
const MULTI_CODE_FLUSH_MS = 35;

function toDetection(result: BarcodeScanningResult): ScanDetection | null {
  const payload = normalizeScanPayload(result.data ?? '');
  if (!payload) return null;
  return {
    payload,
    symbology: result.type,
    bounds: result.bounds,
    cornerPoints: result.cornerPoints ?? [],
  };
}

export const ScanCamera = forwardRef<ScanCameraHandle, ScanCameraProps>(function ScanCamera(
  { torch, active, onDetection, onDetections },
  ref,
) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const activeRef = useRef(active);
  const onDetectionRef = useRef(onDetection);
  const onDetectionsRef = useRef(onDetections);
  const readyRef = useRef(false);
  const recentRef = useRef<Map<string, ScanDetection & { seenAt: number }>>(new Map());
  const multiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedLens, setSelectedLens] = useState<string | undefined>(undefined);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onDetectionRef.current = onDetection;
  }, [onDetection]);

  useEffect(() => {
    onDetectionsRef.current = onDetections;
  }, [onDetections]);

  useEffect(() => {
    return () => {
      if (multiTimerRef.current) {
        clearTimeout(multiTimerRef.current);
      }
    };
  }, []);

  const applyMacroLens = useCallback(async () => {
    if (Platform.OS !== 'ios' || !cameraRef.current) return;
    try {
      const lenses = await cameraRef.current.getAvailableLensesAsync();
      const preferred = preferIphoneMacroLens(lenses);
      if (preferred) {
        setSelectedLens(preferred);
      }
    } catch {
      // Keep default lens.
    }
  }, []);

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

  const flushMultiCodes = useCallback(() => {
    multiTimerRef.current = null;
    if (!activeRef.current || !readyRef.current) {
      recentRef.current.clear();
      return;
    }

    const detections = Array.from(recentRef.current.values()).map(({ seenAt: _seenAt, ...detection }) => detection);
    recentRef.current.clear();
    if (detections.length >= 2) {
      onDetectionsRef.current(detections);
    }
  }, []);

  const pruneRecent = useCallback((now: number) => {
    for (const [payload, detection] of recentRef.current) {
      if (now - detection.seenAt > MULTI_CODE_WINDOW_MS) {
        recentRef.current.delete(payload);
      }
    }
  }, []);

  const handleBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (!activeRef.current || !readyRef.current) return;
      const detection = toDetection(result);
      if (!detection) return;

      const now = Date.now();
      recentRef.current.set(detection.payload, { ...detection, seenAt: now });
      pruneRecent(now);

      const uniqueCount = recentRef.current.size;
      if (uniqueCount >= 2) {
        if (multiTimerRef.current) {
          clearTimeout(multiTimerRef.current);
        }
        multiTimerRef.current = setTimeout(flushMultiCodes, MULTI_CODE_FLUSH_MS);
        return;
      }

      onDetectionRef.current(detection);
    },
    [flushMultiCodes, pruneRecent],
  );

  const handleCameraReady = useCallback(() => {
    readyRef.current = true;
    void applyMacroLens();
  }, [applyMacroLens]);

  const handleAvailableLensesChanged = useCallback(
    (event: { lenses: string[] }) => {
      const preferred = preferIphoneMacroLens(event.lenses);
      if (preferred && preferred !== selectedLens) {
        setSelectedLens(preferred);
      }
    },
    [selectedLens],
  );

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
      autofocus="off"
      active
      selectedLens={selectedLens}
      onCameraReady={handleCameraReady}
      onAvailableLensesChanged={handleAvailableLensesChanged}
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
