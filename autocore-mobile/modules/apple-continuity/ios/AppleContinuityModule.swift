import ExpoModulesCore
import Foundation

#if os(iOS)
/// Publishes the current workspace URL as a browsing-web user activity so
/// Handoff can continue it on Mac (and vice versa). Receive path is Universal
/// Links — Tauri only continues `NSUserActivityTypeBrowsingWeb`.
enum HandoffPublisher {
  private static var activity: NSUserActivity?
  private static var lastURL: String?
  private static var refreshTimer: Timer?

  static func setWebpageURL(_ urlString: String?) {
    if Thread.isMainThread {
      apply(urlString)
      return
    }
    DispatchQueue.main.async {
      apply(urlString)
    }
  }

  private static func apply(_ urlString: String?) {
    guard let urlString, let url = URL(string: urlString), url.scheme == "https" else {
      stopRefresh()
      activity?.resignCurrent()
      activity?.invalidate()
      activity = nil
      lastURL = nil
      return
    }

    if activity == nil {
      let next = NSUserActivity(activityType: NSUserActivityTypeBrowsingWeb)
      next.isEligibleForHandoff = true
      next.isEligibleForSearch = false
      next.isEligibleForPublicIndexing = false
      next.title = "AutoCore"
      activity = next
    }

    activity?.webpageURL = url
    activity?.targetContentIdentifier = urlString
    activity?.needsSave = true
    activity?.becomeCurrent()
    lastURL = urlString
    startRefresh()
  }

  private static func startRefresh() {
    refreshTimer?.invalidate()
    // Continuity drops an activity that is not renewed. Stay current while
    // the user stays on a claimed screen (including a long create form).
    let timer = Timer(timeInterval: 15, repeats: true) { _ in
      activity?.becomeCurrent()
    }
    timer.tolerance = 5
    RunLoop.main.add(timer, forMode: .common)
    refreshTimer = timer
  }

  private static func stopRefresh() {
    refreshTimer?.invalidate()
    refreshTimer = nil
  }
}

public class AppleContinuityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleContinuity")

    Function("setWebpageURL") { (urlString: String?) in
      HandoffPublisher.setWebpageURL(urlString)
    }
  }
}
#endif
