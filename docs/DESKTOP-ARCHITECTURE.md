# AutoCore Desktop (Tauri 2)

AutoCore Desktop is **not a second application**. It is the same Next.js product
that serves the web dashboard, hosted in a native Tauri window, plus the handful
of native capabilities a browser tab had and a webview does not.

```
                    AutoCore Backend (Firebase + Vercel)
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
             Web                Mobile               Desktop
          Next.js 16          Expo / RN            Tauri 2 shell
              │                    │                    │
              └────────────────────┴────────────────────┘
                       shared Firestore collections
                       shared @autocore/* contracts
```

## Why the shell loads a remote origin

The desktop app does not bundle a frontend. `src-tauri/src/window.rs` builds its
window with `WebviewUrl::External(...)` pointing at the hosted product, and
`frontendDist` is only present because the Tauri CLI requires the field.

This is a deliberate choice, not a shortcut. The web app depends on:

- `src/middleware.ts` for host routing, locale handling and marketing rewrites;
- React Server Components across the entire `src/app/` tree;
- ~60 API route handlers, several of which use the Firebase **Admin** SDK and
  must never run on a user's machine;
- Puppeteer/Chromium PDF rendering with 60s / 1GB Vercel limits;
- `next-intl` request-scoped configuration.

None of that survives `output: "export"`. Producing a static bundle for Tauri
would mean forking the product into a second client — exactly what this work was
asked not to do. Loading the hosted origin instead gives **100% React reuse and
zero duplicated components**, and the web app keeps working untouched.

The tradeoff is honest: the desktop app requires a network connection, the same
as the web app. It is not an offline client, and the codebase has no offline
layer (no service worker, no PWA manifest, no persisted React Query cache) to
build one on.

## Layout

| Path | Role |
|---|---|
| `src-tauri/src/config.rs` | Compile-time target origin, user agent, event names |
| `src-tauri/src/security.rs` | Navigation policy — classifies every URL (unit-tested) |
| `src-tauri/src/window.rs` | Main window, link routing, window-state restore |
| `src-tauri/src/menu.rs` | Native menu, shortcuts, zoom |
| `src-tauri/src/deep_link.rs` | `autocore://`, HTTPS Universal Links, Handoff (cold start + running) |
| `src-tauri/src/handoff.rs` | Publish the current product URL as `NSUserActivityTypeBrowsingWeb` |
| `src-tauri/src/commands.rs` | Save / print / Handoff / info |
| `src-tauri/src/updater.rs` | Updater plugin, registered only when configured |
| `src/platform/` | The web-side adapter: one API, web + desktop implementations |

## The platform adapter

Product code never calls `invoke()`. It calls `src/platform`, which dispatches:

```
component → service → src/platform → web | desktop
```

`@tauri-apps/*` is imported **only** from `src/platform/desktop/bridge.ts`, and
only behind a dynamic `import()` guarded by `hasNativeBridge()`. The web bundle
therefore never carries the Tauri client — verified after a production build:
the Tauri runtime lands in nine separate 2–4KB lazy chunks, not in any route's
initial payload.

Every desktop path falls back to its web implementation on failure. A stale shell
build, or a window a capability does not cover, loses native polish rather than
losing the feature.

### What the adapter provides, and why

| Capability | Web | Desktop | Why it needs a native path |
|---|---|---|---|
| `saveFile` | `<a download>` | native save dialog | **A webview has no download manager.** `<a download>` is silently inert, so every PDF and CSV export produced no file. |
| `printPdfBlob` | hidden iframe + `print()` | OS PDF handler | WKWebView installs no handler for `window.print()`; the call resolves and nothing happens. |
| `printCurrentPage` | `window.print()` | `Webview::print()` | Same, for label sheets. WebView2 implements the DOM call, so Windows uses the fallback by design. |
| `openExternalUrl` | `window.open` | system browser | Support/docs/payment pages belong in the user's browser with their session and password manager. |
| `readClipboardText` | `navigator.clipboard` | OS clipboard | `readText()` is unreliable in WKWebView, and range paste is core to the inventory grids. |
| `notifyDesktop` | no-op | OS notification | Additive — callers keep their in-app toast either way. |
| deep links, Handoff, menu events, updater | — | native only | No web equivalent. |

## Security model

The shell is the only thing between a link and a trusted webview holding the
user's Firebase session.

- **Origin allowlist.** `capabilities/remote.json` grants native access to
  `https://app.myautocore.com/*` and `https://myautocore.com/*` only. The
  previous `https://*.vercel.app/*` wildcard handed `core:default`,
  `shell:default` and `opener:default` to *any* site hosted on Vercel.
- **Suffix-anchored host matching.** `security.rs` rejects
  `myautocore.com.evil.net` and `appleid.apple.com.evil.net`. The previous
  `host.contains("apple.com")` accepted both.
- **Navigation policy.** `on_navigation` blocks in-window navigation to foreign
  origins and hands them to the system browser, so a redirect chain cannot walk a
  trusted webview onto an attacker's page.
- **No arbitrary-path write primitive.** There is no `fs` plugin and no
  `write_file(path, bytes)` command. `desktop_save_file` opens the dialog itself,
  so the save location always comes from the user; the page only proposes a
  filename, which is sanitised. `desktop_reveal_file` acts only on paths this
  session already wrote.
- **`withGlobalTauri: false`.** The IPC bridge is still injected — verified at
  runtime — but the `window.__TAURI__` convenience global, which exposes every
  plugin API to any script on the page, is gone.
- **Localhost is debug-only.** The dev capability is added at runtime under
  `cfg!(debug_assertions)` (`src-tauri/src/lib.rs`), so release binaries cannot
  be pointed at a local origin.
- **Deep links cannot smuggle an origin.** `autocore://evil.example/x` resolves to
  `https://app.myautocore.com/evil.example/x`; only path, query and fragment
  survive. HTTPS Universal Links are rewritten onto the configured app origin
  the same way. `/login`, `/auth/*`, marketing pages and `?mode=browser` are
  rejected so Safari keeps web OAuth. Unit-tested.

## Known gaps

- **Windows/Linux are configured but untested.** Only macOS has been run
  end-to-end. `Webview::print()` is macOS-only in Tauri 2, which is why
  `printCurrentPage` falls back to `window.print()` (correct on WebView2).
- **`csp: null` and `dangerousDisableAssetCspModification: true`** remain in
  `tauri.conf.json`. A local CSP governs only local assets, and the app serves
  none; the real policy is the `Content-Security-Policy-Report-Only` header in
  `next.config.ts`, which is still report-only for the whole product.
- **Deep links and Handoff in dev on macOS** only work from the bundled `.app`,
  not from `tauri dev` — macOS resolves schemes and Associated Domains through
  `Info.plist` / entitlements in a registered bundle.
