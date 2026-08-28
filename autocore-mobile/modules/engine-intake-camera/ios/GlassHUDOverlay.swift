import SwiftUI
import UIKit

#if os(iOS)

/// iOS 26 Camera chrome: floating glass circles, shutter, zoom pills, mode pill.
/// Functional layer only — the viewfinder itself stays unobstructed.
struct GlassHUDOverlay: View {
  @ObservedObject var camera: CameraService
  var title: String
  var serial: String
  var statusMessage: String
  var failed: Bool
  var canFinish: Bool
  /// The app's primary, handed down from `@autocore/design-tokens`.
  var tint: Color
  var onClose: () -> Void
  var onCapture: () -> Void
  var onPickGallery: () -> Void
  var onFinish: () -> Void
  var onTitleLongPress: () -> Void

  private var caption: String? {
    let trimmed = statusMessage.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, trimmed != title else { return nil }
    return trimmed
  }

  var body: some View {
    VStack(spacing: 0) {
      topBar
        .padding(.horizontal, 16)
        .padding(.top, 4)

      Spacer(minLength: 0)
        .allowsHitTesting(false)

      if let caption {
        Text(caption)
          .font(.caption.weight(.medium))
          .foregroundStyle(failed ? Color.red : Color.white)
          .multilineTextAlignment(.center)
          .shadow(color: .black.opacity(0.55), radius: 6, y: 1)
          .padding(.horizontal, 28)
          .padding(.bottom, 10)
          .allowsHitTesting(false)
      }

      CameraZoomCluster(
        zoomFactor: camera.zoomFactor,
        stops: camera.zoomStops,
        minZoom: camera.minZoom,
        maxZoom: camera.maxZoom,
        // A tap travels to a fixed point, so it is ramped; a drag is already
        // supplying the motion, so it is not.
        onSelect: { camera.rampZoom(to: $0) },
        onScrub: { camera.setZoom($0) },
        tint: tint
      )
      .padding(.bottom, 14)

      shutterRow
        .padding(.horizontal, 28)

      finishPill
        .padding(.top, 14)
        .padding(.bottom, 2)
    }
  }

  // MARK: Top — flashlight, status capsule, close

  private var topBar: some View {
    HStack(spacing: 12) {
      CameraGlassIconButton(
        systemName: camera.torchOn ? "flashlight.on.fill" : "flashlight.off.fill",
        emphasized: camera.torchOn,
        disabled: !camera.supportsTorch,
        accessibilityLabel: camera.torchOn ? "Turn off flashlight" : "Turn on flashlight"
      ) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        camera.toggleTorch()
      }

      Spacer(minLength: 8)

      identityCapsule

      Spacer(minLength: 8)

      CameraGlassIconButton(
        systemName: "xmark",
        accessibilityLabel: "Close",
        action: onClose
      )
    }
  }

  private var identityCapsule: some View {
    CameraGlass(shape: .capsule, interactive: false) {
      VStack(spacing: 1) {
        Text(title)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(failed ? Color.red : Color.white)
          .shadow(color: .black.opacity(0.35), radius: 3, y: 1)
          .contentTransition(.numericText())
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        if !serial.isEmpty {
          Text(serial)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.white.opacity(0.72))
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 8)
      .frame(maxWidth: 220)
      .animation(.default, value: title)
    }
    .onLongPressGesture(minimumDuration: 0.35) {
      onTitleLongPress()
    }
    .accessibilityElement(children: .combine)
    .accessibilityHint("Hold to cancel this engine")
  }

  // MARK: Shutter row — Photos, shutter, balance (flip slot unused)

  private var shutterRow: some View {
    HStack(spacing: 0) {
      CameraGlassIconButton(
        systemName: "photo.on.rectangle",
        accessibilityLabel: "Add photos from library",
        action: onPickGallery
      )

      Spacer(minLength: 0)

      // Busy means the hardware will not take another frame — not that a photo
      // is being processed. With responsive capture those are different
      // things, and the shutter should only refuse for the first.
      CameraShutterButton(
        capturing: !camera.isCaptureReady,
        enabled: camera.canCapture,
        action: onCapture
      )

      Spacer(minLength: 0)

      Color.clear
        .frame(width: 44, height: 44)
        .accessibilityHidden(true)
    }
  }

  // MARK: Mode pill — Camera Photo/Video slot

  private var finishPill: some View {
    Button(action: onFinish) {
      Text("Finish")
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(canFinish ? Color.white : Color.white.opacity(0.38))
        .padding(.horizontal, 22)
        .padding(.vertical, 8)
        .background(finishBackground)
        .contentShape(Capsule())
    }
    .buttonStyle(.plain)
    .disabled(!canFinish)
    .accessibilityLabel("Finish intake")
  }

  /// Solid while it can be pressed, glass while it cannot.
  ///
  /// Finish is the only committing action on this screen, and it sat in the
  /// same glass as the flashlight and the close button. A filled capsule in the
  /// app's own primary separates "end this engine" from the chrome around it,
  /// and it stays legible over a viewfinder that a material cannot.
  @ViewBuilder
  private var finishBackground: some View {
    if canFinish {
      Capsule().fill(tint)
    } else {
      CameraGlass(shape: .capsule, interactive: false) { Color.clear }
    }
  }
}

#endif
