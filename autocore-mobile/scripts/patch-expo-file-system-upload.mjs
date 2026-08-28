/**
 * expo-file-system cancels the URLSession task when the JS SharedObject is
 * released. Swiping the app away releases every in-flight intake PUT, which is
 * why leave-app photo sync looked dead. Background session tasks must outlive
 * the process — the daemon already has the file body.
 *
 * CocoaPods compiles this file from node_modules, so re-apply after install.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const uploadPath = join(root, 'node_modules/expo-file-system/ios/FileSystemUploadTask.swift');

const FROM = `  override func sharedObjectWillRelease() {
    uploadTask?.cancel()
  }`;

const TO = `  override func sharedObjectWillRelease() {
    // AUTOCORE_INTAKE_UPLOAD: do not cancel a background URLSession task.
    // Hermes dropping this SharedObject on process death is how swipe-away
    // aborted every in-flight engine photo.
    if sessionType == .foreground {
      uploadTask?.cancel()
    }
  }`;

function patch(source) {
  if (source.includes('AUTOCORE_INTAKE_UPLOAD')) return source;
  if (!source.includes(FROM)) return source;
  return source.replace(FROM, TO);
}

if (!existsSync(uploadPath)) process.exit(0);
const before = readFileSync(uploadPath, 'utf8');
const after = patch(before);
if (after !== before) writeFileSync(uploadPath, after);
if (!readFileSync(uploadPath, 'utf8').includes('AUTOCORE_INTAKE_UPLOAD')) {
  throw new Error(`expo-file-system upload patch did not apply: ${uploadPath}`);
}
