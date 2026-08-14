import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Linking, View } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type CameraCapturedPicture,
} from 'expo-camera';

import { Button, Text } from '@/components/ui';
import { usePreferredMacroLens } from '@/hooks/use-preferred-macro-lens';
import { getColors, spacing } from '@/theme';

export type IntakeCameraHandle = {
  /**
   * Issues a still immediately. Resolves when the native capture is queued —
   * not when the JPEG is on disk. `onSaved` receives the file (or null).
   */
  capturePhoto: (
    onSaved: (shot: CameraCapturedPicture | null) => void,
  ) => Promise<void>;
};

type IntakeCameraProps = {
  active: boolean;
  torch: boolean;
};

export const IntakeCamera = forwardRef<IntakeCameraHandle, IntakeCameraProps>(
  function IntakeCamera({ active, torch }, ref) {
    const chrome = getColors('dark');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const readyRef = useRef(false);
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
      async capturePhoto(onSaved) {
        if (!cameraRef.current || !active) {
          onSaved(null);
          return;
        }
        let delivered = false;
        const deliver = (shot: CameraCapturedPicture | null) => {
          if (delivered) return;
          delivered = true;
          onSaved(shot?.uri ? shot : null);
        };
        const timeout = setTimeout(() => deliver(null), 10_000);
        try {
          const shot = await cameraRef.current.takePictureAsync({
            quality: 0.7,
            skipProcessing: true,
            shutterSound: false,
            onPictureSaved: (saved) => {
              clearTimeout(timeout);
              deliver(saved);
            },
          });
          // Unpatched iOS still waits here; patched fastMode returns {} immediately.
          if (shot?.uri) {
            clearTimeout(timeout);
            deliver(shot);
          }
          readyRef.current = true;
        } catch {
          clearTimeout(timeout);
          deliver(null);
        }
      },
    }));

    if (!permission) {
      return <View style={{ flex: 1, backgroundColor: chrome.background }} />;
    }

    if (!permission.granted) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            gap: spacing[4],
            paddingHorizontal: spacing[6],
            backgroundColor: chrome.background,
          }}
        >
          <Text variant="heading" style={{ color: chrome.foreground, textAlign: 'center' }}>
            Camera access needed
          </Text>
          <Text variant="body" style={{ color: chrome.mutedForeground, textAlign: 'center' }}>
            Engine intake needs the camera to photograph engines. You can also add photos from the library.
          </Text>
          <Button
            onPress={() => {
              if (permission.canAskAgain) {
                void requestPermission();
              } else {
                void Linking.openSettings();
              }
            }}
          >
            {permission.canAskAgain ? 'Allow camera' : 'Open settings'}
          </Button>
        </View>
      );
    }

    return (
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        mode="picture"
        animateShutter={false}
        enableTorch={torch}
        selectedLens={selectedLens}
        onAvailableLensesChanged={onAvailableLensesChanged}
        onCameraReady={() => {
          readyRef.current = true;
          refreshLenses();
        }}
      />
    );
  },
);
