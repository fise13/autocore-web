/**
 * Re-applies AutoCore shutter-speed patches to expo-camera iOS sources.
 * CocoaPods compiles those files from node_modules, so this must run after install.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const optionsPath = join(root, 'node_modules/expo-camera/ios/Common/PictureOptions.swift');
const capturePath = join(root, 'node_modules/expo-camera/ios/Current/CameraPhotoCapture.swift');

function patchOptions(source) {
  if (source.includes('AUTOCORE_FAST_SHUTTER')) return source;
  return source.replace(
    `  @Field
  var pictureRef: Bool = false
}`,
    `  @Field
  var pictureRef: Bool = false

  // AUTOCORE_FAST_SHUTTER
  @Field
  var skipProcessing: Bool = false
}`,
  );
}

function patchCapture(source) {
  let next = source;
  if (!next.includes('AUTOCORE_FAST_SHUTTER: speed')) {
    next = next.replace(
      `      if photoOutput.availablePhotoCodecTypes.contains(AVVideoCodecType.hevc) {
        photoSettings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.hevc])
      }

      let requestedFlashMode = captureDelegate?.flashMode.toDeviceFlashMode() ?? .auto
      if photoOutput.supportedFlashModes.contains(requestedFlashMode) {
        photoSettings.flashMode = requestedFlashMode
      }

      if #available(iOS 16.0, *) {
        photoSettings.maxPhotoDimensions = photoOutput.maxPhotoDimensions
      }

      if !photoSettings.availablePreviewPhotoPixelFormatTypes.isEmpty,
      let previewFormat = photoSettings.__availablePreviewPhotoPixelFormatTypes.first {
        photoSettings.previewPhotoFormat = [kCVPixelBufferPixelFormatTypeKey as String: previewFormat]
      }

      if photoOutput.isHighResolutionCaptureEnabled {
        photoSettings.isHighResolutionPhotoEnabled = true
      }

      photoSettings.photoQualityPrioritization = .balanced`,
      `      if photoOutput.availablePhotoCodecTypes.contains(AVVideoCodecType.jpeg) {
        photoSettings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
      } else if photoOutput.availablePhotoCodecTypes.contains(AVVideoCodecType.hevc) {
        photoSettings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.hevc])
      }

      let requestedFlashMode = captureDelegate?.flashMode.toDeviceFlashMode() ?? .auto
      if photoOutput.supportedFlashModes.contains(requestedFlashMode) {
        photoSettings.flashMode = requestedFlashMode
      }

      // AUTOCORE_FAST_SHUTTER: speed over max megapixels — warehouse shots, not gallery prints.
      photoSettings.photoQualityPrioritization = .speed`,
    );
  }
  if (!next.includes('AUTOCORE_FAST_SHUTTER: write camera bytes')) {
    next = next.replace(
      `    guard let imageData, var takenImage = UIImage(data: imageData) else {
      throw CameraSavingImageException("Failed to process image data")
    }`,
      `    guard let imageData else {
      throw CameraSavingImageException("Failed to process image data")
    }

    // AUTOCORE_FAST_SHUTTER: write camera bytes, skip crop / re-encode.
    if options.skipProcessing {
      let path = FileSystemUtilities.generatePathInCache(
        captureDelegate.appContext,
        in: "Camera",
        extension: options.imageType.toExtension()
      )
      try imageData.write(to: URL(fileURLWithPath: path), options: .atomic)
      var response = [String: Any]()
      response["uri"] = URL(fileURLWithPath: path).absoluteString
      response["width"] = 0
      response["height"] = 0
      response["format"] = options.imageType.rawValue
      if options.fastMode {
        captureDelegate.onPictureSaved(["data": response, "id": options.id])
        return ()
      }
      return response
    }

    guard var takenImage = UIImage(data: imageData) else {
      throw CameraSavingImageException("Failed to process image data")
    }`,
    );
  }
  return next;
}

function apply(path, transform) {
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) return;
  writeFileSync(path, after);
}

apply(optionsPath, patchOptions);
apply(capturePath, patchCapture);
