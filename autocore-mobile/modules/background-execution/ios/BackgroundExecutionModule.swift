import ExpoModulesCore
import UIKit

#if os(iOS)
enum IntakeBackgroundExecution {
  private static let lock = NSLock()
  private static var taskId = UIBackgroundTaskIdentifier.invalid

  @discardableResult
  static func begin(name: String) -> Int {
    if Thread.isMainThread {
      return beginOnMain(name: name)
    }
    // Never `sync` onto main from JS — that deadlocks the bridge. AppDelegate
    // `willResignActive` already begins on main before JS AppState runs.
    DispatchQueue.main.async {
      _ = beginOnMain(name: name)
    }
    return 0
  }

  private static func beginOnMain(name: String) -> Int {
    lock.lock()
    defer { lock.unlock() }
    if taskId != .invalid {
      return Int(bitPattern: UInt(taskId.rawValue))
    }
    var captured = UIBackgroundTaskIdentifier.invalid
    captured = UIApplication.shared.beginBackgroundTask(withName: name) {
      Self.end()
    }
    taskId = captured
    if captured == .invalid {
      return -1
    }
    return Int(bitPattern: UInt(captured.rawValue))
  }

  static func end() {
    if Thread.isMainThread {
      endOnMain()
      return
    }
    DispatchQueue.main.async {
      endOnMain()
    }
  }

  private static func endOnMain() {
    lock.lock()
    defer { lock.unlock() }
    guard taskId != .invalid else { return }
    UIApplication.shared.endBackgroundTask(taskId)
    taskId = .invalid
  }
}

public class BackgroundExecutionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackgroundExecution")

    // Synchronous: the JS leave handler must not hop a Promise before the
    // assertion exists. `AsyncFunction` is how an instant swipe froze JS.
    Function("begin") { (name: String) -> Int in
      IntakeBackgroundExecution.begin(name: name)
    }

    AsyncFunction("end") {
      IntakeBackgroundExecution.end()
    }.runOnQueue(.main)
  }
}

public class BackgroundExecutionAppDelegate: ExpoAppDelegateSubscriber {
  public func applicationWillResignActive(_ application: UIApplication) {
    // Lock / Home fire this *before* `didEnterBackground`, and before JS
    // AppState. Starting the assertion here is what lets prepare finish when
    // the person leaves the camera immediately.
    IntakeBackgroundExecution.begin(name: "intake-sync")
  }

  public func applicationDidEnterBackground(_ application: UIApplication) {
    IntakeBackgroundExecution.begin(name: "intake-sync")
  }

  // Do not end on become-active / foreground. Starting a Live Activity and
  // Control Center both bounce through `active` while photos still need JS;
  // ending here is how the 30s window vanished before any PUT was resumed.
  // JS ends the assertion when the app is genuinely foregrounded, and the
  // expiration handler ends it if JS is gone.
}
#endif
