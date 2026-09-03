# tauri-plugin-siwa

Sign In with Apple for Tauri 2 — supports **iOS** and **macOS**.

> **Attribution:** Based on [tauri-plugin-sign-in-with-apple](https://crates.io/crates/tauri-plugin-sign-in-with-apple) by [Manaf941](https://github.com/Manaf941), licensed under the [MIT License](./LICENSE). Modified by Gavyn Stanley to add macOS support.

---

## Platform Support

| Platform | Supported |
|----------|-----------|
| iOS      | ✅        |
| macOS    | ✅        |
| Android  | ❌        |
| Windows  | ❌        |
| Linux    | ❌        |

---

## Installation

Add the Rust crate to your `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri-plugin-siwa = "1.0.0"
```

Install the JavaScript package:

```bash
npm install tauri-plugin-siwa-api
```

---

## Setup

### 1. Register the plugin

In `src-tauri/src/main.rs` (or `lib.rs`):

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_siwa::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 2. Add the capability permission

In your capability file (e.g. `src-tauri/capabilities/default.json`):

```json
{
  "permissions": [
    "siwa:allow-get-apple-id-credential"
  ]
}
```

### 3. Apple Developer setup

- Enable the **Sign In with Apple** capability in your Apple Developer account for your App ID.
- Add the entitlement to your app. In `src-tauri/entitlements.plist`:

```xml
<key>com.apple.developer.applesignin</key>
<array>
    <string>Default</string>
</array>
```

---

## Usage

```typescript
import { getAppleIdCredential } from 'tauri-plugin-siwa-api';

const response = await getAppleIdCredential({
  scope: ['fullName', 'email'],
});

console.log(response.userIdentifier);  // Stable user ID — store this
console.log(response.email);           // Only returned on first sign-in
console.log(response.identityToken);   // JWT — verify on your server
console.log(response.authorizationCode); // Short-lived code for server exchange
```

> **Note:** `email`, `givenName`, and `familyName` are only returned on the **first** sign-in. Store them immediately — Apple will not return them again.

---

## API

### `getAppleIdCredential(request)`

Presents the Sign In with Apple sheet and returns credentials.

#### Request

```typescript
interface AppleIDAuthorizationRequest {
  scope: ('fullName' | 'email')[];
  nonce?: string;   // Recommended: associate with your server session
  state?: string;   // Optional: passed back in the response unchanged
}
```

#### Response

```typescript
interface AppleIDAuthorizationResponse {
  userIdentifier: string | null;    // Stable, unique user ID
  givenName: string | null;         // First sign-in only
  familyName: string | null;        // First sign-in only
  email: string | null;             // First sign-in only
  authorizationCode: string;        // Short-lived server exchange code
  identityToken: string | null;     // JWT — verify with Apple's public keys
  state: string | null;             // Echoed from request
}
```

#### Errors

| Error | Cause |
|-------|-------|
| `Unsupported platform` | Called on a non-Apple platform |
| `Failed to decode authorization code` | Apple returned malformed data |
| `Sign In With Apple error: <msg>` | macOS ASAuthorization failure (e.g. user cancelled) |

---

## License

MIT — see [LICENSE](./LICENSE).
