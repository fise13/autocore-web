import ExpoModulesCore
import Foundation

#if os(iOS)
/// Publishes the current workspace URL as a browsing-web user activity so
/// Handoff can continue it on Mac (and vice versa). Receive path is Universal
/// Links — Tauri only continues `NSUserActivityTypeBrowsingWeb`.
enum HandoffPublisher {
  private static var activity: NSUserActivity?

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
      activity?.resignCurrent()
      activity?.invalidate()
      activity = nil
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
    activity?.needsSave = true
    activity?.becomeCurrent()
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
