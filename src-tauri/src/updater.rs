//! Auto-update wiring.
//!
//! The updater is only registered when this build was actually configured for
//! it. `scripts/sync-tauri-updater.mjs` writes `plugins.updater` into
//! `tauri.conf.json` from `TAURI_UPDATER_ENDPOINT` / `TAURI_UPDATER_PUBKEY` at
//! build time, so:
//!
//! * no update endpoint or public key is committed to the repository;
//! * an unsigned local build still runs — the plugin would otherwise abort at
//!   startup with no public key configured;
//! * `desktop_info().updaterEnabled` tells the web app whether to show
//!   "Check for Updates" at all, instead of offering a button that cannot work.
//!
//! The private signing key never appears here or anywhere in the repo. See
//! `docs/DESKTOP-RELEASE.md` for the CI secrets a signed release needs.

use tauri::{AppHandle, Runtime};

const UPDATER_PLUGIN_KEY: &str = "updater";

/// Whether `plugins.updater` was present in the resolved config.
pub fn is_configured<R: Runtime>(app: &AppHandle<R>) -> bool {
    app.config()
        .plugins
        .0
        .get(UPDATER_PLUGIN_KEY)
        .is_some_and(|value| !value.is_null())
}

/// Register the updater plugin, but only for a build that can verify a signature.
pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    if !is_configured(app) {
        log::info!("Updater not configured for this build; skipping plugin");
        return Ok(());
    }

    app.plugin(tauri_plugin_updater::Builder::new().build())?;
    app.plugin(tauri_plugin_process::init())?;
    log::info!("Updater enabled");
    Ok(())
}
