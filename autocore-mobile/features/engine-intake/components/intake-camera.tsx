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
  takePicture: () => Promise<CameraCapturedPicture | null>;
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
      async takePicture() {
        if (!cameraRef.current || !active) return null;
        // Never pass `fastMode: true` without `onPictureSaved` — the promise
        // resolves with no uri ("Camera did not capture a photo").
        const shoot = (skipProcessing: boolean) =>
          cameraRef.current!.takePictureAsync({
            quality: 0.82,
            skipProcessing,
            shutterSound: false,
          });

        try {
          const fast = await shoot(true);
          if (fast?.uri) {
            readyRef.current = true;
            return fast;
          }
        } catch {
          // Fall through to the processed path.
        }

        try {
          const processed = await shoot(false);
          if (processed?.uri) {
            readyRef.current = true;
            return processed;
          }
          return null;
        } catch {
          return null;
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
