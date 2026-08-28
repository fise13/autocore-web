import SwiftUI
import UIKit

#if os(iOS)

// MARK: - Tint

extension Color {
  /// A colour handed down from JS, where `@autocore/design-tokens` is the one
  /// place colour is allowed to be declared. Falls back to system blue so a
  /// malformed string can never render an invisible control.
  init(autocoreHex hex: String, fallback: Color = .blue) {
    var value = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if value.hasPrefix("#") { value.removeFirst() }
    guard value.count == 6 || value.count == 8, let raw = UInt64(value, radix: 16) else {
      self = fallback
      return
    }
    let hasAlpha = value.count == 8
    let r = Double((raw >> (hasAlpha ? 24 : 16)) & 0xFF) / 255
    let g = Double((raw >> (hasAlpha ? 16 : 8)) & 0xFF) / 255
    let b = Double((raw >> (hasAlpha ? 8 : 0)) & 0xFF) / 255
    let a = hasAlpha ? Double(raw & 0xFF) / 255 : 1
    self = Color(.sRGB, red: r, green: g, blue: b, opacity: a)
  }
}

// MARK: - Liquid Glass

/// System Liquid Glass (iOS 26) or `.ultraThinMaterial`. Camera shapes only:
/// circles for buttons, capsules for pills. No custom specular strokes.
enum CameraGlassShape {
  case circle
  case capsule
}

struct CameraGlass<Content: View>: View {
  var shape: CameraGlassShape
  var interactive = false
  @ViewBuilder var content: () -> Content

  var body: some View {
    content()
      .background { glassFill }
  }

  @ViewBuilder
  private var glassFill: some View {
    if #available(iOS 26.0, *) {
#if compiler(>=6.2)
      switch shape {
      case .circle:
        Color.clear
          .glassEffect(
            interactive ? .regular.interactive() : .regular,
            in: .circle
          )
      case .capsule:
        Color.clear
          .glassEffect(
            interactive ? .regular.interactive() : .regular,
            in: .capsule
          )
      }
#else
      materialShape
#endif
    } else {
      materialShape
    }
  }

  @ViewBuilder
  private var materialShape: some View {
    switch shape {
    case .circle:
      Circle().fill(.ultraThinMaterial)
    case .capsule:
      Capsule().fill(.ultraThinMaterial)
    }
  }
}

// MARK: - Icon button (Camera / Control Center circle)

struct CameraGlassIconButton: View {
  var systemName: String
  var emphasized = false
  var disabled = false
  var accessibilityLabel: String = ""
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      CameraGlass(shape: .circle, interactive: true) {
        Image(systemName: systemName)
          .font(.body.weight(.semibold))
          .symbolRenderingMode(.hierarchical)
          .foregroundStyle(emphasized ? Color.yellow : Color.white)
          .frame(width: 44, height: 44)
          .contentShape(Circle())
      }
    }
    .buttonStyle(.plain)
    .disabled(disabled)
    .opacity(disabled ? 0.35 : 1)
    .accessibilityLabel(accessibilityLabel.isEmpty ? systemName : accessibilityLabel)
  }
}

// MARK: - Shutter (iOS 26 Camera: white disc, glass ring)

struct CameraShutterButton: View {
  var capturing: Bool
  var enabled: Bool
  var action: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    Button(action: action) {
      CameraGlass(shape: .circle, interactive: true) {
        ZStack {
          Color.clear.frame(width: 74, height: 74)
          Circle()
            .fill(Color.white)
            .frame(width: 62, height: 62)
            .opacity(capturing ? 0.55 : 1)
            .scaleEffect(capturing ? 0.86 : 1)
        }
      }
    }
    .buttonStyle(CameraShutterPressStyle(reduceMotion: reduceMotion))
    .disabled(!enabled)
    .accessibilityLabel("Capture photo")
  }
}

private struct CameraShutterPressStyle: ButtonStyle {
  var reduceMotion: Bool

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.94 : 1)
      .animation(
        reduceMotion ? nil : .spring(response: 0.22, dampingFraction: 0.72),
        value: configuration.isPressed
      )
  }
}

// MARK: - Zoom pills

/// The zoom control from Camera: a pill per optical point, and a drag across
/// them for everything in between.
///
/// The points are not written down here — they come from the device, so a phone
/// with three lenses gets a pill at each hand-over factor and a single-lens
/// phone gets 1× and a 2× crop. Putting a "2×" on a body that has no 2× is how
/// a control starts lying about the hardware.
struct CameraZoomCluster: View {
  var zoomFactor: CGFloat
  var stops: [CGFloat]
  var minZoom: CGFloat
  var maxZoom: CGFloat
  var onSelect: (CGFloat) -> Void
  var onScrub: (CGFloat) -> Void

  var tint: Color

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var scrubBase: CGFloat?
  @State private var lastHapticStop: CGFloat?

  /// Points per doubling of the zoom — a drag that feels like Camera's dial
  /// rather than a slider, because zoom is perceived logarithmically.
  private static let scrubPointsPerDoubling: CGFloat = 130

  private var selectedStop: CGFloat? {
    // The pill that is lit is the last one the zoom has reached, not the
    // nearest: at 1.4× a person is past 1× and has not arrived at 3×.
    stops.last { zoomFactor >= $0 - 0.02 } ?? stops.first
  }

  var body: some View {
    HStack(spacing: 8) {
      ForEach(stops, id: \.self) { stop in
        pill(stop: stop, selected: selectedStop.map { abs($0 - stop) < 0.001 } ?? false)
      }
    }
    // Deliberately not glass. A material samples whatever the lens is pointed
    // at, and an engine bay is high-contrast clutter — the pills turned into
    // smudges harder to read than the scene behind them. iOS Camera draws
    // these as flat discs for the same reason.
    .contentShape(Rectangle())
    .gesture(scrub)
    .animation(reduceMotion ? nil : .spring(response: 0.22, dampingFraction: 0.85), value: zoomFactor)
    .accessibilityElement(children: .contain)
    .accessibilityAdjustableAction { direction in
      let step: CGFloat = direction == .increment ? 1.25 : 0.8
      onSelect(min(max(zoomFactor * step, minZoom), maxZoom))
    }
  }

  /// Slide across the pills to zoom, the way Camera does. Simultaneous rather
  /// than exclusive so a straight tap on a pill still reads as a tap.
  private var scrub: some Gesture {
    DragGesture(minimumDistance: 8)
      .onChanged { value in
        let base = scrubBase ?? zoomFactor
        if scrubBase == nil {
          scrubBase = zoomFactor
          lastHapticStop = selectedStop
        }
        let doublings = value.translation.width / Self.scrubPointsPerDoubling
        let next = min(max(base * pow(2, doublings), minZoom), maxZoom)
        onScrub(next)
        announceCrossing(next)
      }
      .onEnded { _ in
        scrubBase = nil
        lastHapticStop = nil
      }
  }

  /// A tick as each lens point goes by — the only feedback that tells you where
  /// the optical stops are while your eye is on the viewfinder.
  private func announceCrossing(_ next: CGFloat) {
    guard let crossed = stops.last(where: { next >= $0 - 0.02 }) else { return }
    guard lastHapticStop.map({ abs($0 - crossed) >= 0.001 }) ?? true else { return }
    lastHapticStop = crossed
    UISelectionFeedbackGenerator().selectionChanged()
  }

  private func pill(stop: CGFloat, selected: Bool) -> some View {
    Button {
      UISelectionFeedbackGenerator().selectionChanged()
      onSelect(stop)
    } label: {
      Text(selected ? Self.liveTitle(zoomFactor) : Self.stopTitle(stop))
        .font(.system(size: selected ? 13 : 11, weight: .semibold).monospacedDigit())
        .foregroundStyle(selected ? tint : Color.white)
        .frame(width: selected ? 44 : 36, height: selected ? 44 : 36)
        .background(Circle().fill(Color.black.opacity(0.55)))
        .contentShape(Circle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel("Zoom \(Self.stopTitle(stop))×")
    .accessibilityAddTraits(selected ? .isSelected : [])
  }

  /// Idle pills carry the bare number, as in Camera — "2", not "2×".
  private static func stopTitle(_ stop: CGFloat) -> String {
    if abs(stop - stop.rounded()) < 0.05 {
      return "\(Int(stop.rounded()))"
    }
    return String(format: "%.1f", Double(stop)).replacingOccurrences(of: "0.", with: ".")
  }

  private static func liveTitle(_ factor: CGFloat) -> String {
    if abs(factor - factor.rounded()) < 0.05 {
      return "\(Int(factor.rounded()))×"
    }
    return String(format: "%.1f×", Double(factor))
  }
}

// MARK: - Focus bracket (Camera tap-to-focus)

struct CameraFocusBracket: View {
  var point: CGPoint?
  var stamp: Int

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var visible = false
  @State private var settled = false
  @State private var shownStamp = 0

  var body: some View {
    GeometryReader { _ in
      if let point, visible {
        RoundedRectangle(cornerRadius: 3, style: .continuous)
          .stroke(Color.yellow, lineWidth: 1.2)
          .frame(width: 72, height: 72)
          .scaleEffect(settled ? 1 : 1.18)
          .position(point)
      }
    }
    .allowsHitTesting(false)
    .onChange(of: stamp, perform: { newStamp in
      guard point != nil, newStamp != shownStamp else { return }
      shownStamp = newStamp
      settled = reduceMotion
      visible = true
      if !reduceMotion {
        withAnimation(.easeOut(duration: 0.22)) {
          settled = true
        }
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.85) {
        guard shownStamp == newStamp else { return }
        withAnimation(.easeOut(duration: 0.28)) {
          visible = false
        }
      }
    })
    .accessibilityHidden(true)
  }
}

#endif
