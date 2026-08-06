import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';

import { getString, setString } from '@/lib/storage/kv';

const DEVICE_ID_KEY = 'engine-intake:device-id';

export function engineIntakeId(prefix: string): string {
  return `${prefix}_${Crypto.randomUUID()}`;
}

export function getEngineIntakeDeviceId(): string {
  const existing = getString(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = engineIntakeId('device');
  setString(DEVICE_ID_KEY, next);
  return next;
}

export function getEngineIntakeDeviceName(): string | null {
  return Device.deviceName?.trim() || Device.modelName?.trim() || null;
}
