const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

/**
 * Apps built with the iOS 27 SDK must adopt the UIScene life cycle: without a
 * scene manifest UIKit traps at launch (`_UIApplicationEvaluateRuntimeIssueFor
 * NoSceneLifecycleAdoption`, EXC_BREAKPOINT) before any JavaScript runs.
 *
 * Expo's own fix (`ExpoAppSceneDelegate`) ships in expo 57.0.23+; this app is on
 * SDK 56, so it carries the community workaround from expo/expo#50179:
 *   - Info.plist declares one window scene handled by `SceneDelegate`;
 *   - AppDelegate stops creating the window and starting React Native;
 *   - SceneDelegate builds the window from the scene and starts React Native.
 * A manifest alone is not enough — the process survives on a black screen
 * because the AppDelegate's window is never attached to the scene.
 *
 * Links: under scenes `application(_:open:)` is not called at cold start, so
 * the URL / user activity from `connectionOptions` is turned back into launch
 * options (what RCTLinkingManager's initial URL reads), and warm links are sent
 * through the AppDelegate's existing handlers so Expo's subscribers still run.
 *
 * ponytail: delete this plugin once on expo 57.0.23+ and use
 * `@config-plugins/expo-uiscene-lifecycle` instead.
 */

const MARKER = '// autocore-uiscene-lifecycle';

const WINDOW_START = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;

const FACTORY_PROPERTY = 'var reactNativeFactory: RCTReactNativeFactory?';

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    // Cold-start links arrive here, not in application(_:open:). Put them back
    // where RCTLinkingManager looks for the initial URL.
    var launchOptions = appDelegate.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    if let activity = connectionOptions.userActivities.first {
      // Same string keys RCTLinkingManager reads for a universal-link launch.
      launchOptions[.userActivityDictionary] = [
        "UIApplicationLaunchOptionsUserActivityKey": activity,
        "UIApplicationLaunchOptionsUserActivityTypeKey": activity.activityType,
      ] as [String: Any]
    }

    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity) { _ in }
  }
}
`;

function applySceneLifecycle(source) {
  if (source.includes(MARKER)) return source;
  if (!source.includes(WINDOW_START) || !source.includes(FACTORY_PROPERTY)) {
    throw new Error(
      '[with-ios-uiscene-lifecycle] AppDelegate.swift no longer matches the Expo SDK 56 template; ' +
        'update the plugin (or switch to @config-plugins/expo-uiscene-lifecycle on expo 57.0.23+).',
    );
  }
  return (
    source
      .replace(
        FACTORY_PROPERTY,
        `${FACTORY_PROPERTY}\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?`,
      )
      // The window and React Native now start in SceneDelegate.
      .replace(WINDOW_START, '    self.launchOptions = launchOptions') + SCENE_DELEGATE
  );
}

function withIosUiSceneLifecycle(config) {
  config = withInfoPlist(config, (modConfig) => {
    modConfig.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return modConfig;
  });

  return withAppDelegate(config, (modConfig) => {
    if (modConfig.modResults.language !== 'swift') {
      throw new Error('[with-ios-uiscene-lifecycle] expected a Swift AppDelegate');
    }
    modConfig.modResults.contents = applySceneLifecycle(modConfig.modResults.contents);
    return modConfig;
  });
}

module.exports = withIosUiSceneLifecycle;
module.exports.applySceneLifecycle = applySceneLifecycle;
