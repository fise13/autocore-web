/**
 * Which iOS URLSession carries an intake photo PUT.
 *
 * This used to be decided per-attempt from `AppState.currentState`:
 * foreground while the app was active, background otherwise. That inverted the
 * guarantee the feature is built on. The overwhelmingly common flow is shoot →
 * Save → lock the phone or swipe the app away, and every one of those PUTs was
 * started while the app was active — so they all went onto
 * `URLSessionConfiguration.default`, which iOS tears down when the process is
 * suspended or killed. The photos that most needed to survive leaving the app
 * were precisely the ones that could not.
 *
 * A background session hands the transfer to a separate system process that
 * keeps running while the app is suspended or gone entirely, so the only
 * correct answer on iOS is "background", regardless of what the app is doing
 * at the moment the task is created. `expo-file-system` already configures
 * that session the way Apple requires — a persistent identifier derived from
 * the bundle id, `sessionSendsLaunchEvents = true`, `isDiscretionary = false`,
 * an `handleEventsForBackgroundURLSession` app-delegate subscriber, and
 * `uploadTask(with:fromFile:)` rather than a data/stream body (Apple: only
 * file-based uploads are valid once the app process has been terminated).
 *
 * Android ignores the option, and on web there is no native session at all;
 * both are given "foreground" so nothing pretends to a guarantee it lacks.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

export type PhotoUploadSessionType = 'foreground' | 'background';

export type UploadSessionPlatform = 'ios' | 'android' | 'web' | (string & {});

/**
 * The session an intake photo transfer must use.
 *
 * Deliberately takes no app-state argument: whether the app happens to be
 * foregrounded when the task is created says nothing about where it will be a
 * second later, which is exactly the mistake this replaces.
 */
export function resolvePhotoUploadSession(platform: UploadSessionPlatform): PhotoUploadSessionType {
  return platform === 'ios' ? 'background' : 'foreground';
}

/**
 * Whether a transfer on this platform keeps running after the app is suspended
 * or terminated. Drives what the UI is allowed to promise the user.
 */
export function uploadSurvivesAppTermination(platform: UploadSessionPlatform): boolean {
  return resolvePhotoUploadSession(platform) === 'background';
}
