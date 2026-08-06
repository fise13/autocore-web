import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type MutableRefObject,
} from 'react';
import { Linking, View } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type CameraCapturedPicture,
} from 'expo-camera';

import { Button, Text } from '@/components/ui';
import { usePreferredMacroLens } from '@/hooks/use-preferred-macro-lens';
import { getColors, spacing } from '@/theme';

export type IntakeCameraHandle = {
  takePicture: () => Promise<CameraCapturedPicture | null>;
};

type IntakeCameraProps = {
  active: boolean;
  torch: boolean;
  scanLocation: boolean;
  onLocationCode: (value: string) => void;
};

const LOCATION_BARCODE_TYPES = ['qr', 'code128', 'code39', 'datamatrix'] as const;
const LOCATION_BARCODE_SETTINGS = {
  barcodeTypes: [...LOCATION_BARCODE_TYPES],
};

export const IntakeCamera = forwardRef<IntakeCameraHandle, IntakeCameraProps>(
  function IntakeCamera({ active, torch, scanLocation, onLocationCode }, ref) {
    const chrome = getColors('dark');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const readyRef = useRef(false);
    const lastLocationRef = useRef<{ value: string; at: number } | null>(null);
    const callbackRef = useRef(onLocationCode) as MutableRefObject<typeof onLocationCode>;
    callbackRef.current = onLocationCode;
    const { selectedLens, onAvailableLensesChanged, refreshLenses } = usePreferredMacroLens(
      cameraRef,
      active,
    );

    useEffect(() => {
      if (!permission?.granted && permission?.canAskAgain) {
        void requestPermission();
      }
    }, [permission, requestPermission]);

    useImperativeHandle(ref, () => ({
      async takePicture() {
        if (!cameraRef.current || !readyRef.current || !active || scanLocation) return null;
        try {
          return await cameraRef.current.takePictureAsync({
            quality: 0.86,
            skipProcessing: false,
          });
        } catch {
          return null;
        }
      },
    }));

    const handleBarcode = (result: BarcodeScanningResult) => {
      if (!scanLocation) return;
      const value = result.data.trim();
      if (!value) return;
      const now = Date.now();
      const last = lastLocationRef.current;
      if (last && last.value === value && now - last.at < 2_000) return;
      lastLocationRef.current = { value, at: now };
      callbackRef.current(value);
    };

    if (!permission) {
      return <View style={{ flex: 1, backgroundColor: chrome.background }} />;
    }

    if (!permission.granted) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[6],
            gap: spacing[4],
            backgroundColor: chrome.background,
          }}
        >
          <Text variant="heading" style={{ color: chrome.foreground }}>
            Camera access required
          </Text>
          <Text variant="body" style={{ color: chrome.mutedForeground, textAlign: 'center' }}>
            Engine evidence stays on this device until it can sync.
          </Text>
          {permission.canAskAgain ? (
            <Button onPress={() => void requestPermission()} inline>
              Allow camera
            </Button>
          ) : (
            <Button variant="outline" onPress={() => void Linking.openSettings()} inline>
              Open Settings
            </Button>
          )}
        </View>
      );
    }

    return (
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        active={active}
        enableTorch={torch && active}
        autofocus="off"
        selectedLens={selectedLens}
        onAvailableLensesChanged={onAvailableLensesChanged}
        barcodeScannerSettings={LOCATION_BARCODE_SETTINGS}
        onBarcodeScanned={scanLocation ? handleBarcode : undefined}
        onCameraReady={() => {
          readyRef.current = true;
          refreshLenses();
        }}
      />
    );
  },
);
