import { useEffect, useSyncExternalStore } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';

import { thumbCacheKey, thumbPixelWidth } from './thumb-key';

/**
 * Local thumbnail files for SwiftUI rows.
 *
 * A native `List` row cannot show a remote photo: `@expo/ui`'s `Image` takes an
 * SF Symbol, an asset name, or a local file read **synchronously on the main
 * thread**, and there is no `AsyncImage`. Work Orders never met this because
 * its rows draw a symbol; any list with real photographs does.
 *
 * So this keeps a small JPEG derivative per photo on disk and hands the row a
 * `file://` URI. The derivative matters as much as the locality: the originals
 * are full-resolution camera JPEGs, and a synchronous decode of one of those
 * per row would stall scrolling on the UI thread.
 *
 * Resolution is one-per-URL-per-install: the file survives launches, so the
 * second time a yard opens the list the rows paint immediately.
 */

const DIRECTORY = 'swiftui-thumbs';

/** cacheKey → local file uri, or null once we know there will not be one. */
const resolved = new Map<string, string | null>();
/** In-flight work, so four rows sharing a photo generate it once. */
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

/**
 * Bumped on every resolution so `useSyncExternalStore` sees a changed
 * snapshot. The map itself is mutated in place — copying it per thumbnail
 * would allocate a new map for every row in a long list.
 */
let revision = 0;

function notify(): void {
  revision += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getRevision(): number {
  return revision;
}

function directory(): Directory {
  const dir = new Directory(Paths.cache, DIRECTORY);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

/** `getCachePathAsync` answers with a bare path; the manipulator wants a URI. */
function asUri(path: string): string {
  return path.startsWith('file://') || path.includes('://') ? path : `file://${path}`;
}

function isLocal(url: string): boolean {
  return url.startsWith('file://') || url.startsWith('/');
}

type ImageManipulatorApi = typeof import('expo-image-manipulator');

function loadImageManipulator(): ImageManipulatorApi | null {
  try {
    return require('expo-image-manipulator') as ImageManipulatorApi;
  } catch {
    return null;
  }
}

/**
 * Where the original bytes are on this device, downloading them if needed.
 *
 * `expo-image` already owns a disk cache for every URL the RN side has ever
 * shown, so the common case costs a lookup rather than a download.
 */
async function localSource(url: string): Promise<string | null> {
  if (isLocal(url)) return asUri(url);
  const cached = await Image.getCachePathAsync(url);
  if (cached) return asUri(cached);
  const ok = await Image.prefetch(url, 'disk').catch(() => false);
  if (!ok) return null;
  const afterPrefetch = await Image.getCachePathAsync(url);
  return afterPrefetch ? asUri(afterPrefetch) : null;
}

async function generate(url: string, pointSize: number, key: string): Promise<void> {
  const destination = new File(directory(), `${key}.jpg`);
  if (destination.exists && (destination.size ?? 0) > 0) {
    resolved.set(key, destination.uri);
    notify();
    return;
  }

  const manipulator = loadImageManipulator();
  const source = await localSource(url);
  if (!source) {
    resolved.set(key, null);
    notify();
    return;
  }

  // No manipulator in this binary: the original is still a local file, so the
  // row can show it. Worse for scrolling than a derivative, and far better than
  // an empty tile.
  if (!manipulator) {
    resolved.set(key, source);
    notify();
    return;
  }

  try {
    const rendered = await manipulator.ImageManipulator.manipulate(source)
      .resize({ width: thumbPixelWidth(pointSize) })
      .renderAsync();
    const saved = await rendered.saveAsync({
      compress: 0.8,
      format: manipulator.SaveFormat.JPEG,
    });
    const produced = new File(saved.uri);
    try {
      produced.moveSync(destination);
    } catch {
      produced.copySync(destination);
    }
    resolved.set(key, destination.exists ? destination.uri : saved.uri);
  } catch {
    // Fall back to the full-size local file rather than showing nothing.
    resolved.set(key, source);
  }
  notify();
}

function request(url: string, pointSize: number): void {
  const key = thumbCacheKey(url, pointSize);
  if (resolved.has(key) || inflight.has(key)) return;
  const run = generate(url, pointSize, key)
    .catch(() => {
      resolved.set(key, null);
      notify();
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, run);
}

/**
 * A local file the SwiftUI row can draw, or `null` while there is none.
 *
 * Callers render an SF Symbol placeholder for `null` — the same shape the RN
 * thumbnail already uses while its image decodes.
 */
export function useNativeThumbnail(url: string | null, pointSize: number): string | null {
  useSyncExternalStore(subscribe, getRevision, getRevision);

  useEffect(() => {
    if (!url) return;
    request(url, pointSize);
  }, [pointSize, url]);

  if (!url) return null;
  return resolved.get(thumbCacheKey(url, pointSize)) ?? null;
}

