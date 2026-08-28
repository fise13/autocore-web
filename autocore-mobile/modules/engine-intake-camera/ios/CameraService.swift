import AVFoundation
import Combine
import UIKit

#if os(iOS)

/// Session / permission / capture state published to SwiftUI on the main actor.
enum CameraSessionState: String, Equatable, Sendable {
  case idle
  case requestingPermission
  case permissionDenied
  case configuring
  case running
  case capturing
  case unavailable
}

/// Owns `AVCaptureSession` on a dedicated serial queue; UI state is published on the main actor.
/// `@unchecked Sendable` — session work is confined to `sessionQueue`; UI publishers to MainActor.
final class CameraService: NSObject, ObservableObject, @unchecked Sendable {
  @MainActor @Published private(set) var state: CameraSessionState = .idle
  @MainActor @Published private(set) var torchOn = false
  @MainActor @Published private(set) var zoomFactor: CGFloat = 1
  @MainActor @Published private(set) var supportsTorch = false
  @MainActor @Published private(set) var minZoom: CGFloat = 1
  @MainActor @Published private(set) var maxZoom: CGFloat = 2
  @MainActor @Published private(set) var statusMessage = "Ready for Scan"
  /// The optical points this device actually has, in the units a person reads
  /// off the pills — 0.5×, 1×, 3× on a triple camera; 1×, 2× on a single lens.
  @MainActor @Published private(set) var zoomStops: [CGFloat] = [1, 2]
  /// Whether the hardware will accept another frame right now.
  ///
  /// With responsive capture the answer is usually yes *while the previous
  /// photo is still being processed*, which is the whole point: a yard hand
  /// photographing twenty blocks should never wait on the encoder.
  @MainActor @Published private(set) var isCaptureReady = true

  @MainActor
  var canCapture: Bool {
    (state == .running || state == .capturing) && isCaptureReady
  }

  let session = AVCaptureSession()

  private let sessionQueue = DispatchQueue(label: "com.autocore.engine-intake.camera", qos: .userInitiated)
  private let photoOutput = AVCapturePhotoOutput()
  /// Touched only on `sessionQueue`.
  private var captureDevice: AVCaptureDevice?
  /// Keyed by `AVCapturePhotoSettings.uniqueID`, because more than one photo
  /// can be in flight at once now.
  @MainActor private var pendingCaptures: [Int64: CheckedContinuation<URL?, Never>] = [:]
  private var isConfigured = false
  private var wantsRunning = false
  private var subjectAreaToken: NSObjectProtocol?
  /// Device zoom factor that a person would call "1×". On a virtual camera the
  /// widest constituent lens sits at 1.0, so 1× is the first switch-over point.
  @MainActor private var zoomBase: CGFloat = 1
  /// Whether a person (or a restart) has picked a zoom yet, so the opening
  /// choice below is not re-applied over their selection.
  @MainActor private var hasChosenZoom = false
  @MainActor private var activeDevice: AVCaptureDevice?
  @MainActor private var readinessCoordinatorStorage: AnyObject?
  @MainActor private var rotationCoordinatorStorage: AnyObject?
  @MainActor private var rotationObservation: NSKeyValueObservation?
  @MainActor private var previewLayerStorage: AVCaptureVideoPreviewLayer?

  @available(iOS 17.0, *)
  @MainActor
  private var readinessCoordinator: AVCapturePhotoOutputReadinessCoordinator? {
    get { readinessCoordinatorStorage as? AVCapturePhotoOutputReadinessCoordinator }
    set { readinessCoordinatorStorage = newValue }
  }

  // MARK: - Lifecycle

  @MainActor
  func prepareAndStart() {
    wantsRunning = true
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      configureIfNeededAndStart()
    case .notDetermined:
      state = .requestingPermission
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        Task { @MainActor in
          guard let self else { return }
          if granted {
            self.configureIfNeededAndStart()
          } else {
            self.state = .permissionDenied
            self.statusMessage = "Camera access denied"
          }
        }
      }
    case .denied, .restricted:
      state = .permissionDenied
      statusMessage = "Camera access denied"
    @unknown default:
      state = .unavailable
      statusMessage = "Camera unavailable"
    }
  }

  @MainActor
  func stop() {
    wantsRunning = false
    torchOn = false
    applyTorchLocked(false)
    sessionQueue.async { [weak self] in
      guard let self, self.session.isRunning else { return }
      self.session.stopRunning()
      Task { @MainActor in
        if self.state == .running || self.state == .capturing {
          self.state = .idle
        }
      }
    }
  }

  // MARK: - Controls

  @MainActor
  func setTorch(_ enabled: Bool) {
    guard supportsTorch else { return }
    torchOn = enabled
    applyTorchLocked(enabled)
  }

  @MainActor
  func toggleTorch() {
    setTorch(!torchOn)
  }

  /// Zoom, in the units on the pills. Instant — for a pinch or a drag, where
  /// the finger is already supplying the motion.
  @MainActor
  func setZoom(_ factor: CGFloat) {
    let clamped = min(max(factor, minZoom), maxZoom)
    zoomFactor = clamped
    hasChosenZoom = true
    let target = clamped * zoomBase
    sessionQueue.async { [weak self] in
      guard let device = self?.captureDevice else { return }
      do {
        try device.lockForConfiguration()
        device.cancelVideoZoomRamp()
        device.videoZoomFactor = min(max(target, device.minAvailableVideoZoomFactor), device.maxAvailableVideoZoomFactor)
        device.unlockForConfiguration()
      } catch {}
    }
  }

  /// Zoom to a fixed point, the way tapping a pill in Camera does.
  ///
  /// Ramped rather than assigned: jumping `videoZoomFactor` snaps the frame,
  /// and on a virtual camera it snaps the lens hand-over with it. `ramp` is the
  /// hardware's own interpolation, and it is what makes Apple's pills feel like
  /// the lens moved rather than the picture changed.
  @MainActor
  func rampZoom(to factor: CGFloat) {
    let clamped = min(max(factor, minZoom), maxZoom)
    zoomFactor = clamped
    hasChosenZoom = true
    let target = clamped * zoomBase
    sessionQueue.async { [weak self] in
      guard let device = self?.captureDevice else { return }
      do {
        try device.lockForConfiguration()
        device.ramp(
          toVideoZoomFactor: min(max(target, device.minAvailableVideoZoomFactor), device.maxAvailableVideoZoomFactor),
          withRate: 12
        )
        device.unlockForConfiguration()
      } catch {}
    }
  }

  // MARK: - Orientation

  /// Hand the preview layer over so capture can be levelled against gravity.
  @MainActor
  func attachPreviewLayer(_ layer: AVCaptureVideoPreviewLayer) {
    previewLayerStorage = layer
    bindRotationCoordinator()
  }

  /// Orients the photo by where the phone actually is, not by the interface.
  ///
  /// The capture connection used to be pinned to portrait, so an engine shot
  /// held sideways — which is how anyone photographs something longer than it
  /// is tall — was written out rotated. `RotationCoordinator` is the system's
  /// answer: it tracks the device against gravity rather than against the
  /// interface orientation, so it is right even on a screen that cannot rotate.
  @MainActor
  private func bindRotationCoordinator() {
    guard #available(iOS 17.0, *),
          rotationCoordinatorStorage == nil,
          let device = activeDevice,
          let layer = previewLayerStorage
    else { return }

    let coordinator = AVCaptureDevice.RotationCoordinator(device: device, previewLayer: layer)
    rotationCoordinatorStorage = coordinator
    applyCaptureRotation(coordinator.videoRotationAngleForHorizonLevelCapture)
    rotationObservation = coordinator.observe(
      \.videoRotationAngleForHorizonLevelCapture,
      options: [.new]
    ) { [weak self] _, change in
      guard let angle = change.newValue else { return }
      Task { @MainActor in
        self?.applyCaptureRotation(angle)
      }
    }
  }

  @MainActor
  private func applyCaptureRotation(_ angle: CGFloat) {
    guard #available(iOS 17.0, *) else { return }
    sessionQueue.async { [weak self] in
      guard let connection = self?.photoOutput.connection(with: .video),
            connection.isVideoRotationAngleSupported(angle)
      else { return }
      connection.videoRotationAngle = angle
    }
  }

  /// The system zoom slider on the Camera Control button drives the device
  /// itself and tells us afterwards; this keeps the pills honest.
  @MainActor
  func noteSystemZoom(deviceFactor: CGFloat) {
    let display = zoomBase > 0 ? deviceFactor / zoomBase : deviceFactor
    zoomFactor = min(max(display, minZoom), maxZoom)
  }

  /// Tap-to-focus / tap-to-expose, same as Camera. Returns to continuous AF
  /// when the subject area changes.
  @MainActor
  func focus(atDevicePoint point: CGPoint) {
    let poi = CGPoint(
      x: min(max(point.x, 0), 1),
      y: min(max(point.y, 0), 1)
    )
    sessionQueue.async { [weak self] in
      guard let self, let device = self.captureDevice else { return }
      do {
        try device.lockForConfiguration()
        if device.isFocusPointOfInterestSupported {
          device.focusPointOfInterest = poi
          if device.isFocusModeSupported(.autoFocus) {
            device.focusMode = .autoFocus
          }
        }
        if device.isExposurePointOfInterestSupported {
          device.exposurePointOfInterest = poi
          if device.isExposureModeSupported(.autoExpose) {
            device.exposureMode = .autoExpose
          }
        }
        device.isSubjectAreaChangeMonitoringEnabled = true
        device.unlockForConfiguration()
      } catch {}
    }
  }

  // MARK: - Capture

  @MainActor
  func capturePhoto() async -> URL? {
    guard canCapture else { return nil }

    let settings = AVCapturePhotoSettings()
    // `.balanced` rather than `.quality`, and that is not a compromise here: it
    // is the setting fast-capture prioritisation is allowed to work under, so
    // the second and third shots of a burst are not queued behind the first.
    // What this camera is for is a legible stamped serial, not a print.
    settings.photoQualityPrioritization = .balanced
    let id = settings.uniqueID

    // Told before the shot rather than after: the coordinator counts requests,
    // so the shutter reads as busy from the tap, not from the callback.
    if #available(iOS 17.0, *) {
      readinessCoordinator?.startTrackingCaptureRequest(using: settings)
    }

    state = .capturing
    statusMessage = "Capturing…"

    // The settings object is built here because the readiness coordinator has
    // to see it on the main queue, and used once on the session queue. That is
    // a hand-over, not sharing — nothing touches it again on this side — which
    // is what the box asserts to the compiler.
    let handover = CameraSendableBox(settings)
    let url: URL? = await withCheckedContinuation { continuation in
      pendingCaptures[id] = continuation
      sessionQueue.async { [weak self] in
        guard let self else { return }
        self.photoOutput.capturePhoto(with: handover.value, delegate: self)
      }
    }

    // Only the last one out turns the light off — with responsive capture
    // several photos are in the air at once.
    if pendingCaptures.isEmpty {
      state = session.isRunning ? .running : .idle
      statusMessage = url == nil ? "Capture failed" : "Ready for Scan"
    }
    return url
  }

  // MARK: - Private configuration

  @MainActor
  private func configureIfNeededAndStart() {
    state = .configuring
    statusMessage = "Starting camera…"
    let shouldRun = wantsRunning
    sessionQueue.async { [weak self] in
      guard let self else { return }
      do {
        if !self.isConfigured {
          try self.configureSession()
          self.isConfigured = true
        }
        guard shouldRun else { return }
        if !self.session.isRunning {
          self.session.startRunning()
        }
        let device = self.captureDevice
        Task { @MainActor in
          self.refreshDeviceCapabilities(device)
          self.attachReadinessCoordinator()
          self.state = .running
          self.statusMessage = "Ready for Scan"
          self.setZoom(self.zoomFactor)
        }
      } catch {
        Task { @MainActor in
          self.state = .unavailable
          self.statusMessage = "Camera unavailable"
        }
      }
    }
  }

  /// Must run on `sessionQueue`.
  private func configureSession() throws {
    session.automaticallyConfiguresApplicationAudioSession = false
    session.beginConfiguration()
    defer { session.commitConfiguration() }

    if session.canSetSessionPreset(.hd1920x1080) {
      session.sessionPreset = .hd1920x1080
    } else if session.canSetSessionPreset(.photo) {
      session.sessionPreset = .photo
    }

    session.inputs.forEach { session.removeInput($0) }
    session.outputs.forEach { session.removeOutput($0) }

    guard let device = Self.preferredInspectionDevice() else {
      throw CameraServiceError.noDevice
    }

    let input = try AVCaptureDeviceInput(device: device)
    guard session.canAddInput(input) else { throw CameraServiceError.cannotAddInput }
    session.addInput(input)
    captureDevice = device

    guard session.canAddOutput(photoOutput) else { throw CameraServiceError.cannotAddOutput }
    session.addOutput(photoOutput)
    if #available(iOS 16.0, *) {
      photoOutput.maxPhotoQualityPrioritization = .quality
    }
    Self.configureThroughput(photoOutput)
    if let photoConnection = photoOutput.connection(with: .video),
       photoConnection.isVideoOrientationSupported
    {
      photoConnection.videoOrientation = .portrait
    }

    try Self.configureFocusForInspection(device)
    observeSubjectArea(device)
    configureSystemControls(for: device)
  }

  /// The three switches that separate a camera you can shoot with from one you
  /// wait for. All iOS 17, all off by default, and they have to be turned on in
  /// this order — responsive capture is only offered once zero shutter lag is
  /// on, and fast-capture prioritisation only once responsive capture is.
  ///
  /// Zero shutter lag returns the frame from when the shutter was *pressed*
  /// rather than when the encoder got around to it. Responsive capture lets the
  /// next press start while the previous photo is still being processed. Fast
  /// capture prioritisation lets the system quietly trade quality for keeping
  /// up when someone is firing faster than the hardware can sustain.
  private static func configureThroughput(_ output: AVCapturePhotoOutput) {
    guard #available(iOS 17.0, *) else { return }
    if output.isZeroShutterLagSupported {
      output.isZeroShutterLagEnabled = true
    }
    if output.isResponsiveCaptureSupported {
      output.isResponsiveCaptureEnabled = true
    }
    if output.isFastCapturePrioritizationSupported {
      output.isFastCapturePrioritizationEnabled = true
    }
  }

  /// Camera Control (iPhone 16 and later): a swipe on the hardware button opens
  /// a zoom slider and an exposure slider that the *system* draws — Apple's own
  /// control, with Apple's haptics, which no amount of SwiftUI reproduces.
  ///
  /// The press itself is already handled in JavaScript through
  /// `expo-hardware-buttons`; this is only the sliders the press reveals.
  private func configureSystemControls(for device: AVCaptureDevice) {
    guard #available(iOS 18.0, *), session.supportsControls else { return }
    session.setControlsDelegate(self, queue: sessionQueue)
    for control in session.controls {
      session.removeControl(control)
    }
    let zoom = AVCaptureSystemZoomSlider(device: device) { [weak self] factor in
      Task { @MainActor in
        self?.noteSystemZoom(deviceFactor: factor)
      }
    }
    let exposure = AVCaptureSystemExposureBiasSlider(device: device)
    for control in [zoom, exposure] where session.canAddControl(control) {
      session.addControl(control)
    }
  }

  @MainActor
  private func refreshDeviceCapabilities(_ device: AVCaptureDevice?) {
    guard let device else { return }
    activeDevice = device
    supportsTorch = device.hasTorch && device.isTorchAvailable

    // On a virtual camera the widest constituent lens sits at device factor
    // 1.0 and the first hand-over point is the wide lens — which is the one a
    // person calls 1×. Everything the UI shows is in those units; everything
    // the device is told is multiplied back by this.
    let switchOvers = device.virtualDeviceSwitchOverVideoZoomFactors.map { CGFloat(truncating: $0) }
    zoomBase = switchOvers.first ?? 1

    let deviceMin = device.minAvailableVideoZoomFactor
    let deviceMax = device.activeFormat.videoMaxZoomFactor
    minZoom = deviceMin / zoomBase
    maxZoom = min(deviceMax / zoomBase, 8)
    zoomStops = Self.zoomStops(
      base: zoomBase,
      switchOvers: switchOvers,
      minZoom: minZoom,
      maxZoom: maxZoom
    )

    if !hasChosenZoom {
      // Open on the widest glass the body has — on a virtual camera that is
      // the ultra-wide, which is the lens this screen has always used and the
      // one that focuses close enough to read a casting number.
      zoomFactor = minZoom
      hasChosenZoom = true
    } else if zoomFactor < minZoom || zoomFactor > maxZoom {
      zoomFactor = min(max(1, minZoom), maxZoom)
    }

    // The preview layer usually arrives before the device does; whichever is
    // last binds the pair.
    bindRotationCoordinator()
  }

  /// The points the pills offer.
  ///
  /// Taken from the device rather than written down: a phone with three lenses
  /// hands over at its own factors, and hardcoding 1×/2× on it would put a pill
  /// where no lens is and hide the one that exists.
  private static func zoomStops(
    base: CGFloat,
    switchOvers: [CGFloat],
    minZoom: CGFloat,
    maxZoom: CGFloat
  ) -> [CGFloat] {
    // A single physical lens has no hand-over points at all; 1× and a 2× crop
    // is the pair iOS offers on those, and the pair intake has always had.
    let candidates: [CGFloat] = switchOvers.isEmpty
      ? [1, 2]
      : [minZoom] + switchOvers.map { $0 / base }

    var stops: [CGFloat] = []
    for stop in candidates.sorted() where stop >= minZoom - 0.01 && stop <= maxZoom + 0.01 {
      if !stops.contains(where: { abs($0 - stop) < 0.05 }) {
        stops.append(stop)
      }
    }
    return stops.isEmpty ? [1] : stops
  }

  private func applyTorchLocked(_ enabled: Bool) {
    sessionQueue.async { [weak self] in
      guard let device = self?.captureDevice, device.hasTorch else { return }
      do {
        try device.lockForConfiguration()
        if enabled, device.isTorchModeSupported(.on) {
          try device.setTorchModeOn(level: 1.0)
        } else {
          device.torchMode = .off
        }
        device.unlockForConfiguration()
      } catch {
        Task { @MainActor in
          self?.torchOn = false
        }
      }
    }
  }

  /// Prefer a virtual camera that contains the ultra-wide; else the ultra-wide
  /// alone; else the wide.
  ///
  /// The ultra-wide is what makes close work on a stamped serial focus, and
  /// picking it directly is the obvious way to guarantee it. The cost is that a
  /// single physical lens has no hand-over points, so the phone's other lenses
  /// are unreachable and the zoom pills have nothing real to offer beyond a
  /// digital crop.
  ///
  /// A virtual device gives both: its widest constituent *is* the ultra-wide,
  /// so opening at the bottom of its range is the same glass at the same field
  /// of view, and zooming up hands over to the real lenses the way Camera does.
  /// `startingZoom` below is what keeps the framing identical to before.
  private static func preferredInspectionDevice() -> AVCaptureDevice? {
    let discovery = AVCaptureDevice.DiscoverySession(
      deviceTypes: [
        .builtInTripleCamera,
        .builtInDualWideCamera,
        .builtInUltraWideCamera,
        .builtInWideAngleCamera,
        .builtInDualCamera,
      ],
      mediaType: .video,
      position: .back
    )

    let virtualWithUltraWide = discovery.devices.first { device in
      guard device.deviceType == .builtInTripleCamera || device.deviceType == .builtInDualWideCamera
      else { return false }
      // A hand-over factor is the proof there is a wider lens below this one.
      return !device.virtualDeviceSwitchOverVideoZoomFactors.isEmpty
        && device.isFocusModeSupported(.continuousAutoFocus)
    }
    if let virtualWithUltraWide {
      return virtualWithUltraWide
    }

    let ultraWide = discovery.devices.first { $0.deviceType == .builtInUltraWideCamera }
    if let ultraWide, ultraWide.isFocusModeSupported(.continuousAutoFocus) {
      return ultraWide
    }
    return discovery.devices.first { $0.deviceType == .builtInWideAngleCamera }
      ?? discovery.devices.first
  }

  private static func configureFocusForInspection(_ device: AVCaptureDevice) throws {
    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }

    if device.isFocusModeSupported(.continuousAutoFocus) {
      device.focusMode = .continuousAutoFocus
    } else if device.isFocusModeSupported(.autoFocus) {
      device.focusMode = .autoFocus
    }

    if device.isExposureModeSupported(.continuousAutoExposure) {
      device.exposureMode = .continuousAutoExposure
    }

    if device.isSmoothAutoFocusSupported {
      device.isSmoothAutoFocusEnabled = true
    }

    if device.isGeometricDistortionCorrectionSupported {
      device.isGeometricDistortionCorrectionEnabled = true
    }

    if device.isFocusPointOfInterestSupported {
      device.focusPointOfInterest = CGPoint(x: 0.5, y: 0.5)
    }
    if device.isExposurePointOfInterestSupported {
      device.exposurePointOfInterest = CGPoint(x: 0.5, y: 0.5)
    }

    // `minimumFocusDistance` (iOS 15+) is read-only; ultra-wide selection above
    // is what actually improves close-range intake inspection focus.
    if #available(iOS 15.0, *) {
      _ = device.minimumFocusDistance
    }
  }

  private func observeSubjectArea(_ device: AVCaptureDevice) {
    if let subjectAreaToken {
      NotificationCenter.default.removeObserver(subjectAreaToken)
    }
    // `queue:` takes an OperationQueue, and handing it one would break the
    // invariant this class is `@unchecked Sendable` on: every device mutation
    // happens on `sessionQueue`. Observe with `nil` — the block then runs
    // wherever AVFoundation posted from — and hop across explicitly.
    subjectAreaToken = NotificationCenter.default.addObserver(
      forName: AVCaptureDevice.subjectAreaDidChangeNotification,
      object: device,
      queue: nil
    ) { [weak self] _ in
      self?.sessionQueue.async { [weak self] in
        self?.resetFocusToContinuous()
      }
    }
  }

  /// Must run on `sessionQueue`.
  private func resetFocusToContinuous() {
    guard let device = captureDevice else { return }
    do {
      try device.lockForConfiguration()
      if device.isFocusModeSupported(.continuousAutoFocus) {
        device.focusMode = .continuousAutoFocus
      }
      if device.isExposureModeSupported(.continuousAutoExposure) {
        device.exposureMode = .continuousAutoExposure
      }
      device.isSubjectAreaChangeMonitoringEnabled = false
      device.unlockForConfiguration()
    } catch {}
  }

  deinit {
    if let subjectAreaToken {
      NotificationCenter.default.removeObserver(subjectAreaToken)
    }
  }

  @MainActor
  private func finishCapture(id: Int64, url: URL?) {
    guard let continuation = pendingCaptures.removeValue(forKey: id) else { return }
    continuation.resume(returning: url)
  }

  /// Lives on the main queue by contract — the coordinator calls back there,
  /// and `startTrackingCaptureRequest` must be called from there too.
  @MainActor
  private func attachReadinessCoordinator() {
    guard #available(iOS 17.0, *), readinessCoordinator == nil else { return }
    let coordinator = AVCapturePhotoOutputReadinessCoordinator(photoOutput: photoOutput)
    coordinator.delegate = self
    readinessCoordinator = coordinator
    isCaptureReady = coordinator.captureReadiness == .ready
  }
}

// MARK: - Capture readiness

@available(iOS 17.0, *)
extension CameraService: AVCapturePhotoOutputReadinessCoordinatorDelegate {
  func readinessCoordinator(
    _ coordinator: AVCapturePhotoOutputReadinessCoordinator,
    captureReadinessDidChange captureReadiness: AVCapturePhotoOutput.CaptureReadiness
  ) {
    Task { @MainActor in
      // `.notReadyMomentarily` means the hardware will take the next press in
      // a moment — treating it as busy would make the shutter flicker, which
      // is exactly the stutter responsive capture exists to remove.
      self.isCaptureReady =
        captureReadiness == .ready || captureReadiness == .notReadyMomentarily
    }
  }
}

// MARK: - Camera Control

@available(iOS 18.0, *)
extension CameraService: AVCaptureSessionControlsDelegate {
  func sessionControlsDidBecomeActive(_ session: AVCaptureSession) {}
  func sessionControlsWillEnterFullscreenAppearance(_ session: AVCaptureSession) {}
  func sessionControlsWillExitFullscreenAppearance(_ session: AVCaptureSession) {}
  func sessionControlsDidBecomeInactive(_ session: AVCaptureSession) {}
}

// MARK: - Photo delegate

extension CameraService: AVCapturePhotoCaptureDelegate {
  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishProcessingPhoto photo: AVCapturePhoto,
    error: Error?
  ) {
    let id = photo.resolvedSettings.uniqueID
    let data = error == nil ? photo.fileDataRepresentation() : nil
    // Written off the main actor: a 12MP JPEG is a few megabytes, and doing it
    // on the main queue is a dropped frame in the viewfinder for every shot.
    let url = data.flatMap(Self.writeCapture)
    Task { @MainActor in
      self.finishCapture(id: id, url: url)
    }
  }

  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishCaptureFor resolvedSettings: AVCaptureResolvedPhotoSettings,
    error: Error?
  ) {
    guard #available(iOS 17.0, *) else { return }
    let id = resolvedSettings.uniqueID
    Task { @MainActor in
      self.readinessCoordinator?.stopTrackingCaptureRequest(using: id)
    }
  }

  private static func writeCapture(_ data: Data) -> URL? {
    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent("intake-\(UUID().uuidString).jpg")
    do {
      try data.write(to: url, options: .atomic)
      return url
    } catch {
      return nil
    }
  }
}

/// One-way hand-over of an AVFoundation object between the main queue and the
/// session queue. Unchecked because the invariant is ownership, not locking.
private struct CameraSendableBox<Value>: @unchecked Sendable {
  let value: Value
  init(_ value: Value) { self.value = value }
}

enum CameraServiceError: Error {
  case noDevice
  case cannotAddInput
  case cannotAddOutput
}

#endif
