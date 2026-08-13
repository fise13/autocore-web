import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type VolumeButtonEvent = {
  direction?: 'up' | 'down';
};

type HardwareButtonsModule = {
  attachCameraButton?: () => void;
  detachCameraButton?: () => void;
  addListener: (
    event: 'onVolumeButton' | 'onCameraButton',
    listener: (event: VolumeButtonEvent) => void,
  ) => { remove: () => void };
};

function loadHardwareButtons(): HardwareButtonsModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    const mod = require('expo-hardware-buttons') as {
      default?: HardwareButtonsModule;
    } & HardwareButtonsModule;
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

/**
 * Volume-up (and iPhone 16 Camera Control) fire the same shutter as the on-screen button.
 * No-ops until the native module is in this binary.
 */
export function useVolumeShutter(onShutter: () => void, enabled: boolean): void {
  const onShutterRef = useRef(onShutter);
  onShutterRef.current = onShutter;

  useEffect(() => {
    if (!enabled) return;
    const buttons = loadHardwareButtons();
    if (!buttons) return;

    buttons.attachCameraButton?.();
    const volume = buttons.addListener('onVolumeButton', (event) => {
      if (event.direction && event.direction !== 'up') return;
      onShutterRef.current();
    });
    const camera = buttons.addListener('onCameraButton', () => {
      onShutterRef.current();
    });

    return () => {
      volume.remove();
      camera.remove();
      buttons.detachCameraButton?.();
    };
  }, [enabled]);
}
