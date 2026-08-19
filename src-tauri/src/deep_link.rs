//! `autocore://` deep links.
//!
//! Covers the three cases that matter: the app is closed and a link launches it,
//! the app is already running, and a second launch is attempted (which the
//! single-instance plugin folds back into the first).
//!
//! `https://` links to the product are deliberately *not* claimed here. Those
//! belong to the browser and to the mobile app's Universal Links (see
//! `docs/DEEP-LINKS.md`); a desktop app that hijacked them would break both.

use tauri::{AppHandle, Emitter, Url};
use tauri_plugin_deep_link::DeepLinkExt;

use crate::config;
use crate::security;
use crate::window;

/// Handle links that arrive while the app is running, plus anything the OS
/// delivered at launch.
pub fn setup(app: &AppHandle) {
    let handle = app.clone();
    app.deep_link().on_open_url(move |event| {
        handle_urls(&handle, event.urls());
    });

    // Windows and Linux pass the launch URL as an argv entry, which
    // `get_current` surfaces; on macOS the event above covers cold start too.
    match app.deep_link().get_current() {
        Ok(Some(urls)) if !urls.is_empty() => handle_urls(app, urls),
        Ok(_) => {}
        Err(error) => log::debug!("No launch deep link: {error}"),
    }

    // In development the app is not a registered handler yet, so claim the
    // scheme at runtime. Release builds are registered by the installer /
    // Info.plist instead, and re-registering there would be wrong.
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    if cfg!(debug_assertions) {
        if let Err(error) = app.deep_link().register(config::DEEP_LINK_SCHEME) {
            log::debug!("Could not register {} scheme for dev: {error}", config::DEEP_LINK_SCHEME);
        }
    }
}

/// Pull `autocore://` URLs out of a process argv, for the single-instance path.
pub fn urls_from_argv(argv: &[String]) -> Vec<Url> {
    let prefix = format!("{}://", config::DEEP_LINK_SCHEME);
    argv.iter()
        .filter(|arg| arg.to_ascii_lowercase().starts_with(&prefix))
        .filter_map(|arg| arg.parse().ok())
        .collect()
}

pub fn handle_urls(app: &AppHandle, urls: Vec<Url>) {
    for link in urls {
        match security::deep_link_to_product_url(&link) {
            Ok(target) => {
                log::info!("Deep link {link} → {target}");

                // Tell the page first: an in-app handler (an OAuth callback
                // completing, for instance) can then finish without a reload.
                let _ = app.emit(
                    config::DEEP_LINK_EVENT,
                    serde_json::json!({
                        "url": target.as_str(),
                        "path": format!("{}{}", target.path(), match target.query() {
                            Some(query) => format!("?{query}"),
                            None => String::new(),
                        }),
                    }),
                );

                // Then navigate, so a link works identically whether or not the
                // page happens to have a listener attached.
                if let Err(error) = window::open_main_window(app, Some(target)) {
                    log::error!("Could not follow deep link: {error}");
                }
            }
            Err(error) => log::warn!("Ignoring deep link {link}: {error}"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::urls_from_argv;

    #[test]
    fn picks_out_scheme_urls_only() {
        let argv = vec![
            "/Applications/AutoCore.app/Contents/MacOS/AutoCore".to_string(),
            "--flag".to_string(),
            "autocore://auth/callback?code=1".to_string(),
            "https://myautocore.com/".to_string(),
        ];
        let found = urls_from_argv(&argv);
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].as_str(), "autocore://auth/callback?code=1");
    }
}
