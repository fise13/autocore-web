This directory is a local copy of `tauri-plugin-siwa` 1.0.0 (MIT).

`ASAuthorizationController` never presents a sheet inside AutoCore's WKWebView.
A second hand-rolled `WKWebView` opened a blank white window (WebKit content
process never painted).

`src/desktop.rs` now opens Apple's web authorize URL in a **Tauri** window — the
same Wry webview that already renders the product — and reads `id_token` from
the `https://app.myautocore.com/login` redirect.
