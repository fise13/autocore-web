import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const { applySceneLifecycle } = require('./with-ios-uiscene-lifecycle') as {
  applySceneLifecycle: (source: string) => string;
};

const TEMPLATE = `class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let factory = ExpoReactNativeFactory(delegate: delegate)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

describe('applySceneLifecycle', () => {
  it('moves the window and React Native start into a SceneDelegate', () => {
    const out = applySceneLifecycle(TEMPLATE);
    assert.ok(!out.includes('UIWindow(frame: UIScreen.main.bounds)'));
    assert.ok(out.includes('self.launchOptions = launchOptions'));
    assert.ok(out.includes('var launchOptions: [UIApplication.LaunchOptionsKey: Any]?'));
    assert.ok(out.includes('class SceneDelegate: UIResponder, UIWindowSceneDelegate'));
    assert.ok(out.includes('UIWindow(windowScene: windowScene)'));
    assert.equal(out.match(/startReactNative/g)?.length, 1);
  });

  it('is idempotent and refuses a template it does not recognise', () => {
    const once = applySceneLifecycle(TEMPLATE);
    assert.equal(applySceneLifecycle(once), once);
    assert.throws(() => applySceneLifecycle('class AppDelegate {}'), /no longer matches/);
  });

  it('matches the AppDelegate prebuild generated in this checkout', { skip: !exists() }, () => {
    const current = readFileSync(new URL('../ios/AutoCore/AppDelegate.swift', import.meta.url), 'utf8');
    assert.doesNotThrow(() => applySceneLifecycle(current));
  });
});

function exists() {
  try {
    readFileSync(new URL('../ios/AutoCore/AppDelegate.swift', import.meta.url));
    return true;
  } catch {
    return false;
  }
}
