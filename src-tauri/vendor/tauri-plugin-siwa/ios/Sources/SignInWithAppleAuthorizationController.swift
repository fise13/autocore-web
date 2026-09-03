//
//  SignInWithAppleAuthorizationController.swift
//  tauri-plugin-siwa
//
//  Created by Manaf Mhamdi Alaoui on 10.11.2024.
//  Updated by Gavyn Stanley on Feb. 26, 2026
//

import AuthenticationServices
import Tauri

class SignInWithAppleAuthorizationController: NSObject, ASAuthorizationControllerDelegate {
  var invoke: Invoke
  init(_ invoke: Invoke) {
    self.invoke = invoke
  }

  public func authorize(req: AppleIDAuthorizationRequest) {
    let provider = ASAuthorizationAppleIDProvider()
    let request = provider.createRequest()

    if let nonce = req.nonce {
      request.nonce = nonce
    }
    if let state = req.state {
      request.state = state
    }

    request.requestedScopes = req.scope.compactMap {
      switch $0 {
      case "email": return .email
      case "fullName": return .fullName
      default:
        NSLog("[tauri-plugin-siwa] Unsupported scope: \($0)")
        return nil
      }
    }

    let controller = ASAuthorizationController(
      authorizationRequests: [
        request
      ]
    )

    controller.delegate = self
    controller.performRequests()
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential
    else {
      invoke.reject("Returned credential is not of type ASAuthorizationAppleIDCredential")
      return
    }

    guard let codeData = appleIDCredential.authorizationCode,
      let authorizationCode = String(data: codeData, encoding: .utf8)
    else {
      invoke.reject("Failed to decode authorization code")
      return
    }

    invoke.resolve(
      AppleIDAuthorizationResponse(
        userIdentifier: appleIDCredential.user.isEmpty ? nil : appleIDCredential.user,
        givenName: appleIDCredential.fullName?.givenName,
        familyName: appleIDCredential.fullName?.familyName,
        email: appleIDCredential.email,
        authorizationCode: authorizationCode,
        identityToken: appleIDCredential.identityToken.flatMap {
          String(data: $0, encoding: .utf8)
        },
        state: appleIDCredential.state
      )
    )
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    invoke.reject(error.localizedDescription)
  }
}
