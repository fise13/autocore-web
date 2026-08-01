import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { Text } from '@/components/ui';
import { usePreferredMacroLens } from '@/hooks/use-preferred-macro-lens';
import { useTheme } from '@/hooks';
import { scanPayloadKey } from '@/lib/scan/normalize-scan-payload';
import type { ScanDetection } from '@/services/scan';

import type { ScanCaptureMode } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

export type ScanCameraHandle = {
  takePicture: () => Promise<string | null>;
};

type ScanCameraProps = {
  torch: boolean;
  active: boolean;
  scanEnabled: boolean;
  captureMode: ScanCaptureMode;
  onDetection: (detection: ScanDetection) => void;
  onDetections: (detections: ScanDetection[]) => void;
};

const PRODUCT_TYPES = [
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

const VIN_TYPES = ['pdf417', 'code39', 'code128', 'qr', 'datamatrix'] as const;

const AUTO_TYPES = [
  ...PRODUCT_TYPES,
  'qr',
  'pdf417',
  'aztec',
  'datamatrix',
] as const;

const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
const EMIT_COOLDOWN_MS = 60;
const MULTI_WINDOW_MS = 220;

function barcodeTypesForMode(mode: ScanCaptureMode): readonly string[] {
  if (mode === 'vin') return VIN_TYPES;
  if (mode === 'document') return [];
  return AUTO_TYPES;
}

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
  { torch, active, scanEnabled, captureMode, onDetection, onDetections },
  ref,
) {
  const { colors } = useTheme();
  const chrome = useScanChromeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const scanEnabledRef = useRef(scanEnabled);
  const onDetectionRef = useRef(onDetection);
  const onDetectionsRef = useRef(onDetections);
  const lastEmitRef = useRef<{ key: string; at: number } | null>(null);
  const batchRef = useRef<{
    startedAt: number;
    byKey: Map<string, ScanDetection>;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const { selectedLens, onAvailableLensesChanged, refreshLenses } = usePreferredMacroLens(
    cameraRef,
    active,
  );

  const barcodeTypes = barcodeTypesForMode(captureMode);
  const liveScan = scanEnabled && barcodeTypes.length > 0;

  useEffect(() => {
    scanEnabledRef.current = scanEnabled;
  }, [scanEnabled]);

  useEffect(() => {
    onDetectionRef.current = onDetection;
  }, [onDetection]);

  useEffect(() => {
    onDetectionsRef.current = onDetections;
  }, [onDetections]);

  useEffect(() => {
    return () => {
      if (batchRef.current?.timer) clearTimeout(batchRef.current.timer);
      batchRef.current = null;
    };
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
    if (!active) return;
    if (!permission?.granted && permission?.canAskAgain) {
      void requestPermission();
    }
  }, [active, permission, requestPermission]);

  const flushBatch = useCallback(() => {
    const batch = batchRef.current;
    batchRef.current = null;
    if (!batch) return;
    const list = [...batch.byKey.values()];
    if (list.length === 0) return;
    if (list.length === 1) {
      onDetectionRef.current(list[0]!);
      return;
    }
    onDetectionsRef.current(list);
  }, []);

  const handleBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (!scanEnabledRef.current) return;

      const detection = toDetection(result);
      if (!detection) return;

      const key = scanPayloadKey(detection.payload);
      const now = Date.now();
      const last = lastEmitRef.current;
      if (last && last.key === key && now - last.at < EMIT_COOLDOWN_MS) return;
      lastEmitRef.current = { key, at: now };

      let batch = batchRef.current;
      // First unique code in a window: start a short coalesce window so a second
      // distinct code can upgrade to the picker — but emit immediately if alone.
      if (!batch || now - batch.startedAt > MULTI_WINDOW_MS) {
        if (batch?.timer) clearTimeout(batch.timer);
        batch = {
          startedAt: now,
          byKey: new Map([[key, detection]]),
          timer: null,
        };
        batchRef.current = batch;
        // Prefer fast single-code path: flush on next tick, not after 220ms.
        batch.timer = setTimeout(flushBatch, 48);
        return;
      }

      const wasSingle = batch.byKey.size <= 1;
      batch.byKey.set(key, detection);

      // Second distinct code arrived — wait the full window to collect, then picker.
      if (wasSingle && batch.byKey.size > 1 && batch.timer) {
        clearTimeout(batch.timer);
        const elapsed = now - batch.startedAt;
        batch.timer = setTimeout(flushBatch, Math.max(0, MULTI_WINDOW_MS - elapsed));
      }
    },
    [flushBatch],
  );

  useEffect(() => {
    if (scanEnabled) return;
    if (batchRef.current?.timer) clearTimeout(batchRef.current.timer);
    batchRef.current = null;
  }, [scanEnabled]);

  if (!permission) {
    return <View style={[styles.fill, { backgroundColor: chrome.viewport }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.permission, { backgroundColor: chrome.viewport }]}>
        <Text
          variant="body"
          style={{ color: chrome.permissionTitle, fontWeight: '600', marginBottom: 8 }}
        >
          Camera
        </Text>
        <Text
          variant="caption"
          style={{ color: chrome.permissionBody, textAlign: 'center', marginBottom: 16 }}
        >
          Camera access is needed to scan.
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
              Allow
            </Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Open Settings
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  // CRITICAL: unmount CameraView when leaving the tab.
  // A living native camera layer steals touches from the tab bar and other screens.
  if (!active) {
    return <View style={[styles.fill, { backgroundColor: chrome.viewport }]} />;
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
      barcodeScannerSettings={
        barcodeTypes.length > 0
          ? {
              barcodeTypes: [...barcodeTypes] as Array<
                (typeof AUTO_TYPES)[number]
              >,
            }
          : undefined
      }
      onBarcodeScanned={liveScan ? handleBarcode : undefined}
      onCameraReady={refreshLenses}
    />
  );
});

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  permission: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
