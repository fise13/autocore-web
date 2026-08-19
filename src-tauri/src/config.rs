//! Compile-time shell configuration.
//!
//! `desktop-app-url.txt` is rewritten by `scripts/sync-tauri-app-url.mjs` before
//! every dev and release build, so a binary always points at the environment it
//! was built for and there is no runtime config file a user could repoint at a
//! hostile origin.

use url::Url;

const DESKTOP_APP_URL: &str = include_str!("../desktop-app-url.txt");

pub const APP_TITLE: &str = "AutoCore";
pub const MAIN_WINDOW_LABEL: &str = "main";

/// Custom scheme registered for OAuth callbacks and `autocore://` links.
/// Distinct from the mobile app's `autocoremobile` scheme on purpose — the two
/// clients must not compete for the same links.
pub const DEEP_LINK_SCHEME: &str = "autocore";

/// Labels of product windows opened from an in-app `target="_blank"`.
/// Kept in sync with the `product-*` glob in `capabilities/remote.json`.
pub const PRODUCT_WINDOW_PREFIX: &str = "product-";

/// Event channel the native menu and deep links use to talk to the web app.
pub const MENU_EVENT: &str = "autocore:menu";
pub const DEEP_LINK_EVENT: &str = "autocore:deep-link";

/// Read by `isTauriDesktop()` in the web app and by
/// `/api/auth/apple-redirect`, which serves a desktop-specific bridge page.
/// The `AutoCoreDesktop/` prefix is load-bearing — do not rename it.
const DESKTOP_UA_PRODUCT: &str = "AutoCoreDesktop";

/// WKWebView and WebView2 both gate features on the user agent, and Apple's and
/// Google's sign-in pages reject agents they do not recognise. Presenting a
/// stock browser agent plus our own product token keeps both happy.
const MACOS_SAFARI_UA: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const WINDOWS_EDGE_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0";

pub fn desktop_user_agent() -> String {
    let base = if cfg!(target_os = "macos") {
        MACOS_SAFARI_UA
    } else {
        WINDOWS_EDGE_UA
    };
    format!("{base} {DESKTOP_UA_PRODUCT}/{}", env!("CARGO_PKG_VERSION"))
}

/// The URL the shell boots into, including the `?desktop=1` marker the web app
/// reads before the user agent is available to it.
pub fn app_url() -> Result<Url, String> {
    DESKTOP_APP_URL
        .trim()
        .parse()
        .map_err(|error: url::ParseError| format!("Invalid desktop-app-url.txt: {error}"))
}

/// Origin of [`app_url`], used to rebuild deep-link targets. A deep link may
/// only ever contribute a path and query — never a host — so a hostile
/// `autocore://` link cannot load a foreign page inside the trusted shell.
pub fn app_origin() -> Result<Url, String> {
    let mut url = app_url()?;
    url.set_path("");
    url.set_query(None);
    url.set_fragment(None);
    Ok(url)
}

pub fn app_host() -> Result<String, String> {
    app_url()?
        .host_str()
        .map(|host| host.to_ascii_lowercase())
        .ok_or_else(|| "desktop-app-url.txt has no host".to_string())
}
