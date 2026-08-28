/**
 * Native engine-intake inspection camera (AVFoundation + Liquid Glass HUD).
 *
 * Re-exports the local Expo module so feature code can import from the
 * engine-intake feature folder without reaching into `modules/`.
 */
export {
  EngineIntakeCamera,
  isNativeEngineIntakeCameraAvailable,
  useEngineIntakeCameraCapture,
  type EngineIntakeCameraCaptureEvent,
  type EngineIntakeCameraProps,
  type EngineIntakeCameraState,
  type EngineIntakeCameraStateEvent,
} from 'engine-intake-camera';
