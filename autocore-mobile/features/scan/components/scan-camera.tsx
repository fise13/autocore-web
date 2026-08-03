import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager, Linking, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { Button, Text } from '@/components/ui';
import { usePreferredMacroLens } from '@/hooks/use-preferred-macro-lens';
import { scanPayloadKey } from '@/lib/scan/normalize-scan-payload';
import type { ScanDetection } from '@/services/scan';

import type { ScanCaptureMode } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

export type ScanCameraHandle = {
  takePicture: () => Promise<string | null>;
};

type ScanCameraProps = {
  torch: boolean;
  /** Mount CameraView while the Scan tab is focused. Unmount only on tab leave. */
  mounted: boolean;
  /** Pause the camera session (OCR) without tearing down the preview layer. */
  sessionActive: boolean;
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

/** Broadest set kept mounted in all modes; JS filters by mode / scanEnabled. */
const STABLE_BARCODE_TYPES = [
  ...PRODUCT_TYPES,
  'qr',
  'pdf417',
  'aztec',
  'datamatrix',
] as const;

const STABLE_BARCODE_SETTINGS = {
  barcodeTypes: [...STABLE_BARCODE_TYPES] as Array<(typeof STABLE_BARCODE_TYPES)[number]>,
};

const AUTO_TYPE_SET = new Set<string>(STABLE_BARCODE_TYPES);
const VIN_TYPE_SET = new Set<string>(['pdf417', 'code39', 'code128', 'qr', 'datamatrix']);

const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
const EMIT_COOLDOWN_MS = 60;
const MULTI_WINDOW_MS = 220;

function modeAllowsSymbology(mode: ScanCaptureMode, symbology: string): boolean {
  if (mode === 'document') return false;
  if (mode === 'vin') return VIN_TYPE_SET.has(symbology);
  return AUTO_TYPE_SET.has(symbology);
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
  { torch, mounted, sessionActive, scanEnabled, captureMode, onDetection, onDetections },
  ref,
) {
  const chrome = useScanChromeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const scanEnabledRef = useRef(scanEnabled);
  const captureModeRef = useRef(captureMode);
  const onDetectionRef = useRef(onDetection);
  const onDetectionsRef = useRef(onDetections);
  const lastEmitRef = useRef<{ key: string; at: number } | null>(null);
  const batchRef = useRef<{
    startedAt: number;
    byKey: Map<string, ScanDetection>;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  /**
   * Defer native barcode wiring until after the first paint + interactions.
   * Attaching the scanner on the same frame as CameraView mount stalls preview open.
   */
  const [barcodeArmed, setBarcodeArmed] = useState(false);

  const { selectedLens, onAvailableLensesChanged, refreshLenses } = usePreferredMacroLens(
    cameraRef,
    mounted,
  );

  useEffect(() => {
    scanEnabledRef.current = scanEnabled;
  }, [scanEnabled]);

  useEffect(() => {
    captureModeRef.current = captureMode;
  }, [captureMode]);

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

  useEffect(() => {
    if (!mounted || !sessionActive) {
      setBarcodeArmed(false);
      return;
    }
    let cancelled = false;
    const handle = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) setBarcodeArmed(true);
    });
    return () => {
      cancelled = true;
      handle.cancel?.();
    };
  }, [mounted, sessionActive]);

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
    if (!mounted) return;
    if (!permission?.granted && permission?.canAskAgain) {
      void requestPermission();
    }
  }, [mounted, permission, requestPermission]);

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
      if (!modeAllowsSymbology(captureModeRef.current, result.type)) return;

      const detection = toDetection(result);
      if (!detection) return;

      const key = scanPayloadKey(detection.payload);
      const now = Date.now();
      const last = lastEmitRef.current;
      if (last && last.key === key && now - last.at < EMIT_COOLDOWN_MS) return;
      lastEmitRef.current = { key, at: now };

      let batch = batchRef.current;
      if (!batch || now - batch.startedAt > MULTI_WINDOW_MS) {
        if (batch?.timer) clearTimeout(batch.timer);
        batch = {
          startedAt: now,
          byKey: new Map([[key, detection]]),
          timer: null,
        };
        batchRef.current = batch;
        batch.timer = setTimeout(flushBatch, 48);
        return;
      }

      const wasSingle = batch.byKey.size <= 1;
      batch.byKey.set(key, detection);

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

  // Stable settings object identity — never swap empty settings for document mode.
  const barcodeScannerSettings = useMemo(() => STABLE_BARCODE_SETTINGS, []);

  /**
   * Keep the native barcode callback mounted across Auto/VIN/Document so mode
   * switches don't rebuild ExpoCamera's scanner pipeline (main mode-switch lag).
   * Document / paused modes filter out in JS via refs.
   */
  const liveScan = barcodeArmed && sessionActive && mounted;

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
          <Button onPress={() => void requestPermission()} inline>
            Allow
          </Button>
        ) : (
          <Button variant="link" onPress={() => void Linking.openSettings()} inline>
            Open Settings
          </Button>
        )}
      </View>
    );
  }

  // CRITICAL: unmount CameraView only when leaving the Scan tab.
  // A living native camera layer steals touches from the tab bar and other screens.
  if (!mounted) {
    return <View style={[styles.fill, { backgroundColor: chrome.viewport }]} />;
  }

  return (
    <CameraView
      ref={cameraRef}
      style={styles.fill}
      facing="back"
      enableTorch={torch && sessionActive}
      // "off" = continuous autofocus (required for auto-macro switching).
      autofocus="off"
      selectedLens={selectedLens}
      onAvailableLensesChanged={onAvailableLensesChanged}
      active={sessionActive}
      barcodeScannerSettings={barcodeScannerSettings}
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
