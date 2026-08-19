//! Main window construction and link routing.

use std::sync::atomic::{AtomicUsize, Ordering};

use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_window_state::{StateFlags, WindowExt};

use crate::config;
use crate::security::{self, UrlKind};

static PRODUCT_WINDOW_SEQ: AtomicUsize = AtomicUsize::new(0);

fn open_in_system_browser(url: &Url) {
    if let Err(error) = tauri_plugin_opener::open_url(url.as_str(), None::<&str>) {
        log::warn!("Could not hand {url} to the system browser: {error}");
    }
}

/// Route a URL the page asked to open in a new window.
///
/// The old shell denied every new window except a hard-coded list of OAuth
/// hosts, which meant `window.open` and every `target="_blank"` link did
/// *nothing* in the desktop app: document previews, warranty links and support
/// links were all dead ends with no error. Now each destination goes where it
/// belongs.
fn route_new_window(
    app: &AppHandle,
    url: Url,
    features: tauri::webview::NewWindowFeatures,
) -> NewWindowResponse<tauri::Wry> {
    match security::classify(&url) {
        // A second view onto our own app: a real window, so document previews and
        // side-by-side work orders behave the way they do in a browser tab.
        UrlKind::Product => {
            let label = format!(
                "{}{}",
                config::PRODUCT_WINDOW_PREFIX,
                PRODUCT_WINDOW_SEQ.fetch_add(1, Ordering::Relaxed)
            );
            match WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url.clone()))
                .title(config::APP_TITLE)
                .user_agent(&config::desktop_user_agent())
                .inner_size(1180.0, 860.0)
                .min_inner_size(720.0, 560.0)
                .center()
                .build()
            {
                Ok(window) => NewWindowResponse::Create { window },
                Err(error) => {
                    log::error!("Could not open product window for {url}: {error}");
                    NewWindowResponse::Deny
                }
            }
        }

        // Identity provider mid-handshake. Sized like a sign-in sheet and given
        // the same user agent so the provider serves its desktop page.
        UrlKind::AuthPopup => {
            let label = format!("oauth-{}", PRODUCT_WINDOW_SEQ.fetch_add(1, Ordering::Relaxed));
            match WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url.clone()))
                .window_features(features)
                .title("Sign in")
                .user_agent(&config::desktop_user_agent())
                .inner_size(520.0, 720.0)
                .center()
                .build()
            {
                Ok(window) => NewWindowResponse::Create { window },
                Err(error) => {
                    log::error!("Could not open sign-in window for {url}: {error}");
                    NewWindowResponse::Deny
                }
            }
        }

        // Support pages, docs, payment providers, anything else: the user's own
        // browser, where their extensions, password manager and bookmarks are.
        UrlKind::External => {
            open_in_system_browser(&url);
            NewWindowResponse::Deny
        }
    }
}

/// Gate top-level navigations inside an existing window.
///
/// Defence in depth behind [`route_new_window`]: a redirect chain or an injected
/// `location.href` must not be able to walk a trusted webview onto a foreign
/// origin while the Tauri IPC bridge is attached to it.
fn allow_navigation(url: &Url) -> bool {
    if security::is_internal_scheme(url) {
        return true;
    }

    match security::classify(url) {
        UrlKind::Product | UrlKind::AuthPopup => true,
        UrlKind::External => {
            log::info!("Blocked in-window navigation to {url}; opening externally");
            open_in_system_browser(url);
            false
        }
    }
}

fn build_main_window(app: &AppHandle, url: Url) -> Result<WebviewWindow, String> {
    let user_agent = config::desktop_user_agent();
    let handle = app.clone();

    WebviewWindowBuilder::new(app, config::MAIN_WINDOW_LABEL, WebviewUrl::External(url))
        .title(config::APP_TITLE)
        .user_agent(&user_agent)
        .inner_size(1400.0, 900.0)
        .min_inner_size(1024.0, 700.0)
        .center()
        .on_navigation(|url| allow_navigation(url))
        .on_new_window(move |url, features| route_new_window(&handle, url, features))
        .build()
        .map_err(|error| error.to_string())
}

/// Create (or re-point) the main window.
///
/// `tauri.conf.json` declares the window with `"create": false` because the app
/// lives at a remote origin: the window has to be built in Rust with
/// `WebviewUrl::External` rather than loaded from `frontendDist`.
pub fn open_main_window(app: &AppHandle, url: Option<Url>) -> Result<(), String> {
    let target = match url {
        Some(url) => url,
        None => config::app_url()?,
    };

    if let Some(window) = app.get_webview_window(config::MAIN_WINDOW_LABEL) {
        window.navigate(target).map_err(|error| error.to_string())?;
        focus(&window);
        return Ok(());
    }

    log::info!("Opening {} at {target}", config::APP_TITLE);
    let window = build_main_window(app, target)?;

    // Restore the size and position from the previous session. Done here rather
    // than through the plugin's automatic path because the window is created at
    // runtime, after the plugin has already seen the (empty) config windows.
    if let Err(error) = window.restore_state(StateFlags::all()) {
        log::warn!("Could not restore window geometry: {error}");
    }

    Ok(())
}

pub fn focus(window: &WebviewWindow) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(config::MAIN_WINDOW_LABEL)
}
