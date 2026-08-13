import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { widgetsDirectory } from 'expo-widgets';

const ICON_FILENAME = 'autocore-app-icon.png';
const APP_ICON = require('../../assets/branding/app-icon.png');

let cachedUri: string | null | undefined;

/**
 * Copy the AutoCore app icon into the App Group so the Live Activity widget
 * can render it via `Image uiImage={...}`. Returns a file:// URI or null.
 */
export async function ensureLiveActivityAppIconUri(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  if (cachedUri !== undefined) return cachedUri;
  if (!widgetsDirectory) {
    cachedUri = null;
    return null;
  }

  try {
    const destination = new File(widgetsDirectory, ICON_FILENAME);
    if (!destination.exists) {
      const asset = Asset.fromModule(APP_ICON);
      await asset.downloadAsync();
      const localUri = asset.localUri ?? asset.uri;
      if (!localUri) {
        cachedUri = null;
        return null;
      }
      const source = new File(localUri);
      if (!source.exists) {
        cachedUri = null;
        return null;
      }
      source.copy(destination);
    }
    cachedUri = destination.uri;
    return cachedUri;
  } catch {
    cachedUri = null;
    return null;
  }
}
