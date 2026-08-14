/**
 * Re-applies AutoCore shutter-speed patches to expo-camera iOS sources.
 * CocoaPods compiles those files from node_modules, so this must run after install.
 *
 * Stock expo-camera waits for JPEG encode before resolving takePictureAsync, and
 * only allows one in-flight still. Warehouse intake needs Camera.app timing:
 * shutter returns immediately, files land via onPictureSaved, overlapping shots.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const optionsPath = join(root, 'node_modules/expo-camera/ios/Common/PictureOptions.swift');
const capturePath = join(root, 'node_modules/expo-camera/ios/Current/CameraPhotoCapture.swift');
const sessionPath = join(root, 'node_modules/expo-camera/ios/Current/CameraSessionManager.swift');

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
  if (!next.includes('AUTOCORE_FAST_SHUTTER: overlap')) {
    next = next.replace(
      `  private var photoCaptureOptions: TakePictureOptions?
  private var photoCapturedContinuation: CheckedContinuation<Any, Error>?
`,
      `  // AUTOCORE_FAST_SHUTTER: overlap
  private struct PendingPhotoCapture {
    let options: TakePictureOptions
    var continuation: CheckedContinuation<Any, Error>?
  }

  private var pendingPhotoCaptures: [Int64: PendingPhotoCapture] = [:]
  private let pendingPhotoLock = NSLock()
`,
    );
    next = next.replace(
      `  func takePicture(options: TakePictureOptions, photoOutput: AVCapturePhotoOutput) async throws -> Any {
    guard photoCapturedContinuation == nil else {
      throw CameraNotReadyException()
    }

    return try await withCheckedThrowingContinuation { continuation in
      photoCapturedContinuation = continuation
      photoCaptureOptions = options

      let connection = photoOutput.connection(with: .video)
      let orientation = captureDelegate?.responsiveWhenOrientationLocked == true ?
        captureDelegate?.physicalOrientation ?? .unknown : UIDevice.current.orientation
      connection?.videoOrientation = ExpoCameraUtils.videoOrientation(for: orientation)

      // options.mirror is deprecated but should continue to work until removed
      connection?.isVideoMirrored = captureDelegate?.presetCamera == .front &&
        ((captureDelegate?.mirror ?? false) || options.mirror)
      var photoSettings = AVCapturePhotoSettings()

      if photoOutput.availablePhotoCodecTypes.contains(AVVideoCodecType.jpeg) {
        photoSettings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
      } else if photoOutput.availablePhotoCodecTypes.contains(AVVideoCodecType.hevc) {
        photoSettings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.hevc])
      }

      let requestedFlashMode = captureDelegate?.flashMode.toDeviceFlashMode() ?? .auto
      if photoOutput.supportedFlashModes.contains(requestedFlashMode) {
        photoSettings.flashMode = requestedFlashMode
      }

      // AUTOCORE_FAST_SHUTTER: speed over max megapixels — warehouse shots, not gallery prints.
      photoSettings.photoQualityPrioritization = .speed

      photoOutput.capturePhoto(with: photoSettings, delegate: self)
    }
  }

  func photoOutput(_ output: AVCapturePhotoOutput, willCapturePhotoFor resolvedSettings: AVCaptureResolvedPhotoSettings) {
    if photoCaptureOptions?.shutterSound == false {
      AudioServicesDisposeSystemSoundID(1108)
    }
  }

  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishProcessingPhoto photo: AVCapturePhoto,
    error: Error?
    ) {
    guard let options = photoCaptureOptions, let continuation = photoCapturedContinuation else {
      return
    }

    photoCapturedContinuation = nil
    photoCaptureOptions = nil

    if error != nil {
      continuation.resume(throwing: CameraImageCaptureException())
      return
    }

    do {
      let result = try processImageData(
        imageData: photo.fileDataRepresentation(),
        metadata: photo.metadata,
        options: options
      )
      continuation.resume(returning: result)
    } catch {
      continuation.resume(throwing: error)
    }
  }
`,
      `  func takePicture(options: TakePictureOptions, photoOutput: AVCapturePhotoOutput) async throws -> Any {
    pendingPhotoLock.lock()
    let inFlight = pendingPhotoCaptures.count
    pendingPhotoLock.unlock()
    if inFlight >= 6 {
      throw CameraNotReadyException()
    }

    let connection = photoOutput.connection(with: .video)
    let orientation = captureDelegate?.responsiveWhenOrientationLocked == true ?
      captureDelegate?.physicalOrientation ?? .unknown : UIDevice.current.orientation
    connection?.videoOrientation = ExpoCameraUtils.videoOrientation(for: orientation)

    connection?.isVideoMirrored = captureDelegate?.presetCamera == .front &&
      ((captureDelegate?.mirror ?? false) || options.mirror)
    var photoSettings = AVCapturePhotoSettings()

    if photoOutput.availablePhotoCodecTypes.contains(AVVideoCodecType.jpeg) {
      photoSettings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
    } else if photoOutput.availablePhotoCodecTypes.contains(AVVideoCodecType.hevc) {
      photoSettings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.hevc])
    }

    let requestedFlashMode = captureDelegate?.flashMode.toDeviceFlashMode() ?? .auto
    if photoOutput.supportedFlashModes.contains(requestedFlashMode) {
      photoSettings.flashMode = requestedFlashMode
    }

    photoSettings.photoQualityPrioritization = .speed
    if #available(iOS 16.0, *) {
      let max = photoOutput.maxPhotoDimensions
      let longEdge = Swift.max(max.width, max.height)
      if longEdge > 2560 {
        let scale = 2560.0 / Double(longEdge)
        photoSettings.maxPhotoDimensions = CMVideoDimensions(
          width: Int32((Double(max.width) * scale).rounded()),
          height: Int32((Double(max.height) * scale).rounded())
        )
      } else {
        photoSettings.maxPhotoDimensions = max
      }
    }

    let uniqueID = photoSettings.uniqueID
    let pending = PendingPhotoCapture(
      options: options,
      continuation: nil
    )

    if options.fastMode {
      pendingPhotoLock.lock()
      pendingPhotoCaptures[uniqueID] = pending
      pendingPhotoLock.unlock()
      photoOutput.capturePhoto(with: photoSettings, delegate: self)
      return [:]
    }

    return try await withCheckedThrowingContinuation { continuation in
      var waiting = pending
      waiting.continuation = continuation
      pendingPhotoLock.lock()
      pendingPhotoCaptures[uniqueID] = waiting
      pendingPhotoLock.unlock()
      photoOutput.capturePhoto(with: photoSettings, delegate: self)
    }
  }

  func photoOutput(_ output: AVCapturePhotoOutput, willCapturePhotoFor resolvedSettings: AVCaptureResolvedPhotoSettings) {
    pendingPhotoLock.lock()
    let options = pendingPhotoCaptures[resolvedSettings.uniqueID]?.options
    pendingPhotoLock.unlock()
    if options?.shutterSound == false {
      AudioServicesDisposeSystemSoundID(1108)
    }
  }

  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishProcessingPhoto photo: AVCapturePhoto,
    error: Error?
    ) {
    pendingPhotoLock.lock()
    let pending = pendingPhotoCaptures.removeValue(forKey: photo.resolvedSettings.uniqueID)
    pendingPhotoLock.unlock()
    guard let pending else {
      return
    }

    if error != nil {
      pending.continuation?.resume(throwing: CameraImageCaptureException())
      return
    }

    let imageData = photo.fileDataRepresentation()
    let metadata = photo.metadata
    let options = pending.options
    let continuation = pending.continuation
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self else {
        continuation?.resume(throwing: CameraSavingImageException("Photo Capture delegate unavailable"))
        return
      }
      do {
        let result = try self.processImageData(
          imageData: imageData,
          metadata: metadata,
          options: options
        )
        continuation?.resume(returning: result)
      } catch {
        continuation?.resume(throwing: error)
      }
    }
  }
`,
    );
    next = next.replace(
      `  func cleanup() {
    photoCapturedContinuation?.resume(throwing: CameraUnmountedException())
    self.photoCapturedContinuation = nil
  }
`,
      `  func cleanup() {
    pendingPhotoLock.lock()
    let pending = pendingPhotoCaptures
    pendingPhotoCaptures.removeAll()
    pendingPhotoLock.unlock()
    for item in pending.values {
      item.continuation?.resume(throwing: CameraUnmountedException())
    }
  }
`,
    );
  }
  return next;
}

function patchSession(source) {
  if (source.includes('AUTOCORE_FAST_SHUTTER: photo output')) return source;
  return source.replace(
    `    let photoOutput = AVCapturePhotoOutput()
    photoOutput.isLivePhotoCaptureEnabled = false
    session.beginConfiguration()
    if session.canAddOutput(photoOutput) {
      session.addOutput(photoOutput)
      self.photoOutput = photoOutput
    }`,
    `    let photoOutput = AVCapturePhotoOutput()
    photoOutput.isLivePhotoCaptureEnabled = false
    session.beginConfiguration()
    if session.canAddOutput(photoOutput) {
      session.addOutput(photoOutput)
      // AUTOCORE_FAST_SHUTTER: photo output
      photoOutput.maxPhotoQualityPrioritization = .speed
      if #available(iOS 17.0, *) {
        if photoOutput.isAutoDeferredPhotoDeliverySupported {
          photoOutput.isAutoDeferredPhotoDeliveryEnabled = false
        }
        if photoOutput.isZeroShutterLagSupported {
          photoOutput.isZeroShutterLagEnabled = true
        }
        if photoOutput.isResponsiveCaptureSupported {
          photoOutput.isResponsiveCaptureEnabled = true
        }
        if photoOutput.isFastCapturePrioritizationSupported {
          photoOutput.isFastCapturePrioritizationEnabled = true
        }
      }
      self.photoOutput = photoOutput
    }`,
  );
}

function apply(path, transform) {
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) return;
  writeFileSync(path, after);
}

apply(optionsPath, patchOptions);
apply(capturePath, patchCapture);
apply(sessionPath, patchSession);
