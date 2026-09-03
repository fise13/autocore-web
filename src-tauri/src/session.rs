//! Remember the last workspace URL so the next launch continues there
//! instead of bouncing through `/login`.

use std::fs;

use tauri::{AppHandle, Manager};
use url::Url;

use crate::security;

const LAST_URL_FILE: &str = "last-product-url.txt";

fn last_url_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    Some(dir.join(LAST_URL_FILE))
}

/// Persist a product URL. Login, OAuth and `?mode=browser` are ignored so a
/// signed-out session does not overwrite the last real workspace screen.
pub fn remember(app: &AppHandle, url: &Url) {
    let Ok(target) = security::inbound_link_to_product_url(url) else {
        return;
    };
    let Some(path) = last_url_path(app) else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Err(error) = fs::write(&path, target.as_str()) {
        log::debug!("Could not remember last URL: {error}");
    }
}

pub fn restore(app: &AppHandle) -> Option<Url> {
    let path = last_url_path(app)?;
    let raw = fs::read_to_string(path).ok()?;
    let url: Url = raw.trim().parse().ok()?;
    security::inbound_link_to_product_url(&url).ok()
}
