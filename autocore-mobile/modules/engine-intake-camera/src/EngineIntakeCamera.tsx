import { requireNativeView } from 'expo';
import { Linking, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useCallback, useState, type ComponentType } from 'react';

export type EngineIntakeCameraState =
  | 'idle'
  | 'requestingPermission'
  | 'permissionDenied'
  | 'configuring'
  | 'running'
  | 'capturing'
  | 'unavailable';

export type EngineIntakeCameraCaptureEvent = {
  uri: string | null;
  success: boolean;
};

export type EngineIntakeCameraStateEvent = {
  state: EngineIntakeCameraState;
  sessionRunning: boolean;
  permissionsDenied: boolean;
  capturing: boolean;
  statusMessage: string;
};

export type EngineIntakeCameraProps = {
  style?: StyleProp<ViewStyle>;
  /** When false, the AVCaptureSession stops. Default true. */
  active?: boolean;
  /** Status capsule copy. Default: "Engine Intake Inspection". */
  title?: string;
  /** Engine serial shown under the status capsule. Long-press cancels. */
  serial?: string;
  /** Viewfinder caption above the zoom pills. Default: "Ready for Scan". */
  statusMessage?: string;
  failed?: boolean;
  canFinish?: boolean;
  /**
   * Accent for Finish and the selected zoom pill, as `#rrggbb`.
   *
   * Passed in rather than picked natively because
   * `@autocore/design-tokens` is the only place colour may be declared, and a
   * Swift file cannot read it.
   */
  tintColor?: string;
  /**
   * Bump this integer from JS to request a still (volume shutter).
   * Prefer `useEngineIntakeCameraCapture()` for a ready-made counter.
   */
  captureTrigger?: number;
  onClose?: () => void;
  onCapture?: (event: EngineIntakeCameraCaptureEvent) => void;
  onStateChange?: (event: EngineIntakeCameraStateEvent) => void;
  onTorchChange?: (torch: boolean) => void;
  onZoomChange?: (zoom: number) => void;
  onPickGallery?: () => void;
  onFinish?: () => void;
  onTitleLongPress?: () => void;
};

type NativeProps = {
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  title?: string;
  serial?: string;
  statusMessage?: string;
  failed?: boolean;
  canFinish?: boolean;
  tintColor?: string;
  captureTrigger?: number;
  onClose?: (event: { nativeEvent: Record<string, unknown> }) => void;
  onCapture?: (event: { nativeEvent: EngineIntakeCameraCaptureEvent }) => void;
  onStateChange?: (event: { nativeEvent: EngineIntakeCameraStateEvent }) => void;
  onTorchChange?: (event: { nativeEvent: { torch: boolean } }) => void;
  onZoomChange?: (event: { nativeEvent: { zoom: number } }) => void;
  onOpenSettings?: () => void;
  onPickGallery?: (event: { nativeEvent: Record<string, unknown> }) => void;
  onFinish?: (event: { nativeEvent: Record<string, unknown> }) => void;
  onTitleLongPress?: (event: { nativeEvent: Record<string, unknown> }) => void;
};

let NativeEngineIntakeCamera: ComponentType<NativeProps> | null = null;
if (Platform.OS === 'ios') {
  try {
    NativeEngineIntakeCamera = requireNativeView<NativeProps>(
      'EngineIntakeCamera',
      'EngineIntakeCameraView',
    );
  } catch {
    NativeEngineIntakeCamera = null;
  }
}

export function isNativeEngineIntakeCameraAvailable(): boolean {
  return Platform.OS === 'ios' && NativeEngineIntakeCamera != null;
}

/**
 * Native AVFoundation camera for engine intake inspection (iOS only).
 * Renders iOS Camera chrome (Liquid Glass) inside SwiftUI.
 */
export function EngineIntakeCamera({
  style,
  active = true,
  title = 'Engine Intake Inspection',
  serial = '',
  statusMessage = 'Ready for Scan',
  failed = false,
  canFinish = false,
  tintColor = '#4d96ff',
  captureTrigger = 0,
  onClose,
  onCapture,
  onStateChange,
  onTorchChange,
  onZoomChange,
  onPickGallery,
  onFinish,
  onTitleLongPress,
}: EngineIntakeCameraProps) {
  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  if (Platform.OS !== 'ios' || !NativeEngineIntakeCamera) {
    return <View style={[styles.fallback, style]} />;
  }

  return (
    <NativeEngineIntakeCamera
      style={[styles.fill, style]}
      active={active}
      title={title}
      serial={serial}
      statusMessage={statusMessage}
      failed={failed}
      canFinish={canFinish}
      tintColor={tintColor}
      captureTrigger={captureTrigger}
      onClose={() => onClose?.()}
      onCapture={(event) => {
        const { uri, success } = event.nativeEvent;
        onCapture?.({
          uri: typeof uri === 'string' ? uri : null,
          success: Boolean(success),
        });
      }}
      onStateChange={(event) => onStateChange?.(event.nativeEvent)}
      onTorchChange={(event) => onTorchChange?.(Boolean(event.nativeEvent.torch))}
      onZoomChange={(event) => onZoomChange?.(Number(event.nativeEvent.zoom) || 1)}
      onOpenSettings={openSettings}
      onPickGallery={() => onPickGallery?.()}
      onFinish={() => onFinish?.()}
      onTitleLongPress={() => onTitleLongPress?.()}
    />
  );
}

/** Imperative capture helper — pass `captureTrigger` into `EngineIntakeCamera`. */
export function useEngineIntakeCameraCapture(): {
  captureTrigger: number;
  requestCapture: () => void;
} {
  const [captureTrigger, setCaptureTrigger] = useState(0);
  return {
    captureTrigger,
    requestCapture: () => setCaptureTrigger((n) => n + 1),
  };
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fallback: { flex: 1, backgroundColor: '#000' },
});
