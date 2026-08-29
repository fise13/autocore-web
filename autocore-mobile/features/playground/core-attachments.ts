import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type CoreAttachment = {
  id: string;
  kind: 'image';
  name: string;
  uri: string;
};

const MAX_ATTACHMENTS = 8;

function attachmentId(): string {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
}

function nameFrom(uri: string, fallback: string): string {
  const leaf = uri.split('/').pop()?.split('?')[0];
  return leaf && leaf.length > 0 ? leaf : fallback;
}

function fromAsset(asset: ImagePicker.ImagePickerAsset, fallback: string): CoreAttachment {
  return {
    id: attachmentId(),
    kind: 'image',
    name: asset.fileName?.trim() || nameFrom(asset.uri, fallback),
    uri: asset.uri,
  };
}

export function roomForAttachments(current: number): number {
  return Math.max(0, MAX_ATTACHMENTS - current);
}

export async function pickPhotos(room: number): Promise<CoreAttachment[]> {
  if (room <= 0) return [];
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photos', 'Photo access is required to attach files.');
    return [];
  }
  const pick = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: room,
    quality: 0.85,
  });
  if (pick.canceled) return [];
  return pick.assets.filter((asset) => asset.uri).map((asset) => fromAsset(asset, 'Photo'));
}

export async function pickCamera(): Promise<CoreAttachment | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera', 'Camera access is required to attach a photo.');
    return null;
  }
  const pick = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (pick.canceled || !pick.assets[0]?.uri) return null;
  return fromAsset(pick.assets[0], 'Photo');
}
