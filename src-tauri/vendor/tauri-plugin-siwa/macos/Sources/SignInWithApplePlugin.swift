import AppKit
import AuthenticationServices
import Foundation
import SwiftRs
import WebKit

// MARK: - Codable Types

private struct AuthRequest: Codable {
  let scope: [String]
  let nonce: String?
  let state: String?
}

private struct AuthResponse: Codable {
  let userIdentifier: String?
  let givenName: String?
  let familyName: String?
  let email: String?
  let authorizationCode: String
  let identityToken: String?
  let state: String?
}

private struct AuthResult: Codable {
  let success: Bool
  let response: AuthResponse?
  let error: String?
}

/// Must match `APPLE_WEB_CLIENT_ID` / `com.wise.autocore.web` on the website.
/// Native `ASAuthorizationController` never presents a sheet in this Tauri
/// WKWebView (the login button spins until the semaphore is signalled). Apple's
/// web authorize URL in a real window does, and the token `aud` matches Firebase.
private let appleServicesId = "com.wise.autocore.web"
private let appleRedirectURI = "https://app.myautocore.com/login"
private let authorizationTimeout: TimeInterval = 180

// MARK: - Web OAuth window

@available(macOS 10.15, *)
private final class SignInWithAppleController: NSObject, NSWindowDelegate, WKNavigationDelegate {
  private let semaphore = DispatchSemaphore(value: 0)
  private var response: AuthResponse?
  private var errorMessage: String?
  private var window: NSWindow?
  private var webView: WKWebView?
  private var finished = false
  private var expectedState: String?

  func authorize(request: AuthRequest) -> AuthResult {
    if Thread.isMainThread {
      start(request: request)
      let deadline = Date().addingTimeInterval(authorizationTimeout)
      while !finished && Date() < deadline {
        RunLoop.current.run(mode: .default, before: Date(timeIntervalSinceNow: 0.05))
      }
      if !finished {
        fail("Sign in with Apple timed out waiting for the Apple window.")
      }
      return finishResult()
    }

    DispatchQueue.main.async { [self] in
      self.start(request: request)
    }
    _ = semaphore.wait(timeout: .now() + authorizationTimeout)
    if !finished {
      DispatchQueue.main.sync { [self] in
        self.fail("Sign in with Apple timed out waiting for the Apple window.")
      }
    }
    return finishResult()
  }

  private func start(request: AuthRequest) {
    expectedState = request.state

    var items: [URLQueryItem] = [
      URLQueryItem(name: "client_id", value: appleServicesId),
      URLQueryItem(name: "redirect_uri", value: appleRedirectURI),
      URLQueryItem(name: "response_type", value: "code id_token"),
      URLQueryItem(name: "response_mode", value: "fragment"),
      URLQueryItem(name: "state", value: request.state ?? "autocore-desktop"),
    ]
    if let nonce = request.nonce, !nonce.isEmpty {
      items.append(URLQueryItem(name: "nonce", value: nonce))
    }
    let scope = request.scope.compactMap { scope -> String? in
      switch scope {
      case "email": return "email"
      case "fullName": return "name"
      default: return nil
      }
    }
    if !scope.isEmpty {
      items.append(URLQueryItem(name: "scope", value: scope.joined(separator: " ")))
    }

    var components = URLComponents(string: "https://appleid.apple.com/auth/authorize")
    components?.queryItems = items
    guard let url = components?.url else {
      fail("Could not build Apple authorize URL")
      return
    }

    let config = WKWebViewConfiguration()
    config.websiteDataStore = .nonPersistent()
    let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 520, height: 720), configuration: config)
    webView.navigationDelegate = self
    webView.customUserAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
    self.webView = webView

    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 520, height: 720),
      styleMask: [.titled, .closable],
      backing: .buffered,
      defer: false
    )
    window.title = "Sign in with Apple"
    window.contentView = webView
    window.delegate = self
    window.isReleasedWhenClosed = false
    window.level = .floating
    window.center()
    window.makeKeyAndOrderFront(nil)
    if #available(macOS 14.0, *) {
      NSApp.activate()
    } else {
      NSApp.activate(ignoringOtherApps: true)
    }
    self.window = window

    NSLog("[tauri-plugin-siwa] opening Apple web auth \(url.absoluteString)")
    webView.load(URLRequest(url: url))
  }

  private func finishResult() -> AuthResult {
    if let response {
      return AuthResult(success: true, response: response, error: nil)
    }
    return AuthResult(success: false, response: nil, error: errorMessage ?? "Unknown error")
  }

  private func succeed(_ response: AuthResponse) {
    guard !finished else { return }
    finished = true
    self.response = response
    tearDownWindow()
    semaphore.signal()
  }

  private func fail(_ message: String) {
    guard !finished else { return }
    finished = true
    errorMessage = message
    tearDownWindow()
    semaphore.signal()
  }

  private func tearDownWindow() {
    webView?.navigationDelegate = nil
    window?.delegate = nil
    window?.orderOut(nil)
    webView = nil
    window = nil
  }

  private func isAppleCallback(_ url: URL) -> Bool {
    guard let host = url.host?.lowercased() else { return false }
    let ours = host == "app.myautocore.com" || host == "myautocore.com"
    guard ours else { return false }
    return url.path.hasPrefix("/login") || url.path.hasPrefix("/api/auth/apple-redirect")
  }

  private func parseCallback(_ url: URL, postBody: Data? = nil) -> AuthResponse? {
    var params = decodeParams(url.fragment)
    if params["id_token"] == nil {
      params.merge(decodeParams(url.query)) { current, _ in current }
    }
    if params["id_token"] == nil, let postBody, let body = String(data: postBody, encoding: .utf8) {
      params.merge(decodeParams(body)) { current, _ in current }
    }
    guard let idToken = params["id_token"]?.trimmingCharacters(in: .whitespacesAndNewlines),
      !idToken.isEmpty
    else {
      return nil
    }
    if let expectedState, let returned = params["state"], returned != expectedState {
      return nil
    }
    let code = params["code"] ?? ""
    let user = decodeUser(params["user"])
    let jwt = decodeJWTPayload(idToken)
    return AuthResponse(
      userIdentifier: jwt["sub"] as? String,
      givenName: user?.givenName,
      familyName: user?.familyName,
      email: user?.email ?? jwt["email"] as? String,
      authorizationCode: code,
      identityToken: idToken,
      state: params["state"]
    )
  }

  private func handleCallbackIfPossible(_ url: URL, postBody: Data? = nil) -> Bool {
    guard isAppleCallback(url) else { return false }
    if let parsed = parseCallback(url, postBody: postBody) {
      succeed(parsed)
      return true
    }
    return false
  }

  // MARK: NSWindowDelegate

  func windowWillClose(_ notification: Notification) {
    fail("user_cancelled_authorize")
  }

  // MARK: WKNavigationDelegate

  func webView(
    _ webView: WKWebView,
    decidePolicyFor navigationAction: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
  ) {
    guard let url = navigationAction.request.url else {
      decisionHandler(.allow)
      return
    }

    if handleCallbackIfPossible(url, postBody: navigationAction.request.httpBody) {
      decisionHandler(.cancel)
      return
    }

    if isAppleCallback(url) {
      // Fragment tokens sometimes only show up on the committed URL / JS href.
      decisionHandler(.allow)
      return
    }

    decisionHandler(.allow)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    webView.evaluateJavaScript("String(window.location.href)") { [weak self] result, _ in
      guard let self, let href = result as? String, let url = URL(string: href) else { return }
      _ = self.handleCallbackIfPossible(url)
    }
  }

  func webView(
    _ webView: WKWebView,
    didFail navigation: WKNavigation!,
    withError error: Error
  ) {
    let nsError = error as NSError
    if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled { return }
    fail(error.localizedDescription)
  }

  func webView(
    _ webView: WKWebView,
    didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: Error
  ) {
    let nsError = error as NSError
    if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled { return }
    fail(error.localizedDescription)
  }
}

private struct AppleUserInfo {
  let givenName: String?
  let familyName: String?
  let email: String?
}

private func decodeParams(_ raw: String?) -> [String: String] {
  guard let raw, !raw.isEmpty else { return [:] }
  var params: [String: String] = [:]
  for pair in raw.split(separator: "&") {
    let parts = pair.split(separator: "=", maxSplits: 1).map(String.init)
    guard parts.count == 2 else { continue }
    let value = parts[1].replacingOccurrences(of: "+", with: " ").removingPercentEncoding ?? parts[1]
    params[parts[0]] = value
  }
  return params
}

private func decodeUser(_ raw: String?) -> AppleUserInfo? {
  guard let raw, let data = raw.data(using: .utf8),
    let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
  else { return nil }
  let name = json["name"] as? [String: Any]
  return AppleUserInfo(
    givenName: name?["firstName"] as? String,
    familyName: name?["lastName"] as? String,
    email: json["email"] as? String
  )
}

private func decodeJWTPayload(_ jwt: String) -> [String: Any] {
  let parts = jwt.split(separator: ".")
  guard parts.count >= 2 else { return [:] }
  var base64 = parts[1]
    .replacingOccurrences(of: "-", with: "+")
    .replacingOccurrences(of: "_", with: "/")
  while base64.count % 4 != 0 { base64.append("=") }
  guard let data = Data(base64Encoded: base64),
    let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
  else { return [:] }
  return json
}

// MARK: - C-Compatible Export

@_cdecl("plugin_siwa_macos")
func signInWithApple(requestJsonPtr: SRString) -> SRString {
  guard #available(macOS 10.15, *) else {
    let result = AuthResult(
      success: false, response: nil, error: "Sign In With Apple requires macOS 10.15 or later")
    return SRString(encodeResult(result))
  }

  let requestJson = requestJsonPtr.toString()

  guard let requestData = requestJson.data(using: .utf8),
    let request = try? JSONDecoder().decode(AuthRequest.self, from: requestData)
  else {
    let result = AuthResult(success: false, response: nil, error: "Invalid request JSON")
    return SRString(encodeResult(result))
  }

  let controller = SignInWithAppleController()
  let result = controller.authorize(request: request)
  return SRString(encodeResult(result))
}

private func encodeResult(_ result: AuthResult) -> String {
  guard let data = try? JSONEncoder().encode(result),
    let json = String(data: data, encoding: .utf8)
  else {
    return #"{"success":false,"response":null,"error":"JSON encoding failed"}"#
  }
  return json
}
