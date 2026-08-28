import ExpoModulesCore
import AVFoundation
import SwiftUI
import UIKit

#if os(iOS)

public final class EngineIntakeCameraProps: ExpoSwiftUI.ViewProps {
  @Field var active: Bool = true
  @Field var title: String = "Engine Intake Inspection"
  @Field var serial: String = ""
  @Field var statusMessage: String = "Ready for Scan"
  @Field var failed: Bool = false
  @Field var canFinish: Bool = false
  /// Hex from `@autocore/design-tokens` — colour is declared in one place, in JS.
  @Field var tintColor: String = "#4d96ff"
  /// Increment from JS to request an imperative capture (volume shutter).
  @Field var captureTrigger: Int = 0

  var onClose = EventDispatcher()
  var onCapture = EventDispatcher()
  var onStateChange = EventDispatcher()
  var onTorchChange = EventDispatcher()
  var onZoomChange = EventDispatcher()
  var onOpenSettings = EventDispatcher()
  var onPickGallery = EventDispatcher()
  var onFinish = EventDispatcher()
  var onTitleLongPress = EventDispatcher()
}

/// Full-bleed native camera for engine intake inspection. Chrome matches iOS Camera.
public struct EngineIntakeCameraView: ExpoSwiftUI.View, ExpoSwiftUI.WithHostingView {
  @ObservedObject public var props: EngineIntakeCameraProps
  @StateObject private var camera = CameraService()
  @State private var lastCaptureTrigger = 0
  @State private var lastEmittedState: String = ""
  @State private var focusPoint: CGPoint?
  @State private var focusStamp = 0

  public init(props: EngineIntakeCameraProps) {
    self.props = props
  }

  public var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()

      switch camera.state {
      case .permissionDenied:
        PermissionFallbackView(
          canAskAgain: AVCaptureDevice.authorizationStatus(for: .video) == .notDetermined,
          onRequest: { camera.prepareAndStart() },
          onOpenSettings: { props.onOpenSettings([:]) }
        )
      case .unavailable:
        StatusFallbackView(
          title: "Camera unavailable",
          message: "This device cannot open the inspection camera."
        )
      default:
        cameraFeed
      }
    }
    .preferredColorScheme(.dark)
    .onAppear {
      if props.active {
        camera.prepareAndStart()
      }
      emitStateIfNeeded()
    }
    .onDisappear {
      camera.stop()
    }
    .onChange(of: props.active) { active in
      if active {
        camera.prepareAndStart()
      } else {
        camera.stop()
      }
    }
    .onChange(of: props.captureTrigger) { trigger in
      guard trigger != lastCaptureTrigger, trigger > 0 else { return }
      lastCaptureTrigger = trigger
      Task { await performCapture() }
    }
    .onChange(of: camera.state) { _ in
      emitStateIfNeeded()
    }
    .onChange(of: camera.torchOn) { on in
      props.onTorchChange(["torch": on])
    }
    .onChange(of: camera.zoomFactor) { factor in
      props.onZoomChange(["zoom": Double(factor)])
    }
  }

  private var cameraFeed: some View {
    ZStack {
      CameraPreviewRepresentable(camera: camera) { point in
        focusPoint = point
        focusStamp += 1
      }
      .ignoresSafeArea()

      CameraFocusBracket(point: focusPoint, stamp: focusStamp)
        .ignoresSafeArea()

      GlassHUDOverlay(
        camera: camera,
        title: props.title,
        serial: props.serial,
        statusMessage: props.statusMessage,
        failed: props.failed,
        canFinish: props.canFinish,
        tint: Color(autocoreHex: props.tintColor),
        onClose: { props.onClose([:]) },
        onCapture: {
          Task { await performCapture() }
        },
        onPickGallery: { props.onPickGallery([:]) },
        onFinish: { props.onFinish([:]) },
        onTitleLongPress: { props.onTitleLongPress([:]) }
      )
      .cameraSafeChrome()
    }
  }

  @MainActor
  private func performCapture() async {
    guard camera.canCapture else { return }
    guard let url = await camera.capturePhoto() else {
      props.onCapture([
        "uri": NSNull(),
        "success": false,
      ])
      return
    }
    props.onCapture([
      "uri": url.absoluteString,
      "success": true,
    ])
  }

  @MainActor
  private func emitStateIfNeeded() {
    let payloadState = camera.state.rawValue
    guard payloadState != lastEmittedState else { return }
    lastEmittedState = payloadState
    props.onStateChange([
      "state": payloadState,
      "sessionRunning": camera.state == .running || camera.state == .capturing,
      "permissionsDenied": camera.state == .permissionDenied,
      "capturing": camera.state == .capturing,
      "statusMessage": camera.statusMessage,
    ])
  }
}

// MARK: - Fallbacks

private struct PermissionFallbackView: View {
  var canAskAgain: Bool
  var onRequest: () -> Void
  var onOpenSettings: () -> Void

  var body: some View {
    VStack(spacing: 16) {
      Image(systemName: "camera.fill")
        .font(.system(size: 36, weight: .semibold))
        .foregroundStyle(.secondary)

      Text("Camera access needed")
        .font(.title3.weight(.semibold))

      Text("Engine intake inspection needs the camera to photograph the intake and engine bay.")
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 28)

      if canAskAgain {
        Button("Allow camera", action: onRequest)
          .buttonStyle(.borderedProminent)
      } else {
        Button("Open Settings", action: onOpenSettings)
          .buttonStyle(.borderedProminent)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct StatusFallbackView: View {
  var title: String
  var message: String

  var body: some View {
    VStack(spacing: 12) {
      Text(title)
        .font(.title3.weight(.semibold))
      Text(message)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 28)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private extension View {
  @ViewBuilder
  func cameraSafeChrome() -> some View {
    if #available(iOS 17.0, *) {
      self.safeAreaPadding(.all)
    } else {
      self.padding(.top, 12).padding(.bottom, 8)
    }
  }
}

#endif
