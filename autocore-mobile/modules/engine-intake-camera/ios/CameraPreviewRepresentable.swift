import AVFoundation
import SwiftUI
import UIKit

#if os(iOS)

/// Bridges `AVCaptureVideoPreviewLayer` into SwiftUI. Tap focuses; pinch zooms.
struct CameraPreviewRepresentable: UIViewRepresentable {
  @ObservedObject var camera: CameraService
  var onFocusPoint: (CGPoint) -> Void
  var videoGravity: AVLayerVideoGravity = .resizeAspectFill

  func makeCoordinator() -> Coordinator {
    Coordinator(camera: camera, onFocusPoint: onFocusPoint)
  }

  func makeUIView(context: Context) -> CameraPreviewUIView {
    let view = CameraPreviewUIView()
    view.previewLayer.session = camera.session
    view.previewLayer.videoGravity = videoGravity
    view.applyVideoOrientation()
    // The rotation coordinator levels capture against gravity, and it needs
    // this layer to do it.
    let layer = view.previewLayer
    Task { @MainActor in
      camera.attachPreviewLayer(layer)
    }

    let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
    tap.numberOfTapsRequired = 1
    view.addGestureRecognizer(tap)

    let pinch = UIPinchGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePinch(_:)))
    view.addGestureRecognizer(pinch)
    view.isMultipleTouchEnabled = true
    return view
  }

  func updateUIView(_ uiView: CameraPreviewUIView, context: Context) {
    context.coordinator.camera = camera
    context.coordinator.onFocusPoint = onFocusPoint
    if uiView.previewLayer.session !== camera.session {
      uiView.previewLayer.session = camera.session
    }
    uiView.previewLayer.videoGravity = videoGravity
    uiView.applyVideoOrientation()
  }

  static func dismantleUIView(_ uiView: CameraPreviewUIView, coordinator: Coordinator) {
    uiView.previewLayer.session = nil
  }

  final class Coordinator: NSObject {
    var camera: CameraService
    var onFocusPoint: (CGPoint) -> Void
    private var pinchBegin: CGFloat = 1

    init(camera: CameraService, onFocusPoint: @escaping (CGPoint) -> Void) {
      self.camera = camera
      self.onFocusPoint = onFocusPoint
    }

    @objc func handleTap(_ gesture: UITapGestureRecognizer) {
      guard let view = gesture.view as? CameraPreviewUIView else { return }
      let layerPoint = gesture.location(in: view)
      let devicePoint = view.previewLayer.captureDevicePointConverted(fromLayerPoint: layerPoint)
      onFocusPoint(layerPoint)
      Task { @MainActor in
        self.camera.focus(atDevicePoint: devicePoint)
      }
    }

    @objc func handlePinch(_ gesture: UIPinchGestureRecognizer) {
      let scale = gesture.scale
      let state = gesture.state
      Task { @MainActor in
        if state == .began {
          self.pinchBegin = self.camera.zoomFactor
        }
        guard state == .began || state == .changed else { return }
        self.camera.setZoom(self.pinchBegin * scale)
      }
    }
  }
}

final class CameraPreviewUIView: UIView {
  override class var layerClass: AnyClass {
    AVCaptureVideoPreviewLayer.self
  }

  var previewLayer: AVCaptureVideoPreviewLayer {
    // swiftlint:disable:next force_cast
    layer as! AVCaptureVideoPreviewLayer
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .black
    previewLayer.videoGravity = .resizeAspectFill
    isUserInteractionEnabled = true
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer.frame = bounds
    applyVideoOrientation()
  }

  func applyVideoOrientation() {
    guard let connection = previewLayer.connection, connection.isVideoOrientationSupported else {
      return
    }
    connection.videoOrientation = Self.captureOrientation
  }

  /// `UIInterfaceOrientation.landscapeLeft` maps to `AVCaptureVideoOrientation.landscapeRight`.
  private static var captureOrientation: AVCaptureVideoOrientation {
    let scene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first
    switch scene?.interfaceOrientation {
    case .landscapeLeft:
      return .landscapeRight
    case .landscapeRight:
      return .landscapeLeft
    case .portraitUpsideDown:
      return .portraitUpsideDown
    default:
      return .portrait
    }
  }
}

#endif
