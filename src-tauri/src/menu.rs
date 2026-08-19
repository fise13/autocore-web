//! Native application menu and keyboard shortcuts.
//!
//! Two reasons this exists beyond looking native:
//!
//! 1. On macOS the Edit menu is what installs ⌘X/⌘C/⌘V/⌘A/⌘Z. Without it, copy
//!    and paste do not work anywhere in the app — including the Excel-style
//!    inventory grids, where paste is a core workflow.
//! 2. A webview has no browser chrome, so reload, back, forward and zoom have no
//!    other home.
//!
//! Items the web app owns (save, print, settings) are forwarded to it as events
//! rather than reimplemented here; see `src/platform/desktop` on the web side.

use std::sync::Mutex;

use tauri::menu::{AboutMetadataBuilder, Menu, MenuBuilder, MenuEvent, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::config;
use crate::window;

const HELP_URL: &str = "https://myautocore.com/help";
const SUPPORT_URL: &str = "https://myautocore.com/support";

const ZOOM_MIN: f64 = 0.5;
const ZOOM_MAX: f64 = 2.5;
const ZOOM_STEP: f64 = 0.1;

/// Current webview zoom. Tracked here because a webview does not report its own
/// zoom factor back.
#[derive(Default)]
pub struct ZoomLevel(Mutex<f64>);

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let about = AboutMetadataBuilder::new()
        .name(Some(config::APP_TITLE))
        .version(Some(app.package_info().version.to_string()))
        .website(Some("https://myautocore.com"))
        .build();

    let app_menu = SubmenuBuilder::new(app, config::APP_TITLE)
        .about(Some(about))
        .separator()
        .item(&MenuItemBuilder::with_id("check-updates", "Check for Updates…").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("settings", "Settings…")
                .accelerator("CmdOrCtrl+,")
                .build(app)?,
        )
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id("save", "Save Document…")
                .accelerator("CmdOrCtrl+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("print", "Print…")
                .accelerator("CmdOrCtrl+P")
                .build(app)?,
        )
        .separator()
        .close_window()
        .build()?;

    // Predefined items only — these map to the platform's native edit actions,
    // which is exactly what the webview needs.
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("reload", "Reload")
                .accelerator("CmdOrCtrl+R")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("back", "Back")
                .accelerator("CmdOrCtrl+[")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("forward", "Forward")
                .accelerator("CmdOrCtrl+]")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("zoom-reset", "Actual Size")
                .accelerator("CmdOrCtrl+0")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("zoom-in", "Zoom In")
                .accelerator("CmdOrCtrl+Plus")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("zoom-out", "Zoom Out")
                .accelerator("CmdOrCtrl+-")
                .build(app)?,
        )
        .separator()
        .fullscreen()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .bring_all_to_front()
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("help", "AutoCore Help").build(app)?)
        .item(&MenuItemBuilder::with_id("support", "Contact Support").build(app)?)
        .build()?;

    MenuBuilder::new(app)
        .items(&[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ])
        .build()
}

/// Ask the web app to run one of its own actions.
///
/// The shell has no idea which document is on screen, so "Save" and "Print" are
/// requests, not commands. If nothing is listening the event is dropped, which
/// is the correct outcome on a screen with nothing to save.
fn forward_to_web_app(app: &AppHandle, action: &str) {
    if let Err(error) = app.emit(config::MENU_EVENT, serde_json::json!({ "action": action })) {
        log::warn!("Could not forward menu action {action}: {error}");
    }
}

fn adjust_zoom(app: &AppHandle, change: ZoomChange) {
    let Some(window) = window::main_window(app) else {
        return;
    };
    let state = app.state::<ZoomLevel>();
    let Ok(mut level) = state.0.lock() else {
        return;
    };

    let current = if *level == 0.0 { 1.0 } else { *level };
    let next = match change {
        ZoomChange::Reset => 1.0,
        ZoomChange::In => (current + ZOOM_STEP).min(ZOOM_MAX),
        ZoomChange::Out => (current - ZOOM_STEP).max(ZOOM_MIN),
    };

    if let Err(error) = window.set_zoom(next) {
        log::warn!("Could not set zoom to {next}: {error}");
        return;
    }
    *level = next;
}

enum ZoomChange {
    In,
    Out,
    Reset,
}

pub fn handle_event(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        "settings" => forward_to_web_app(app, "settings"),
        "save" => forward_to_web_app(app, "save"),
        "print" => forward_to_web_app(app, "print"),
        "check-updates" => forward_to_web_app(app, "check-updates"),

        "reload" => {
            if let Some(window) = window::main_window(app) {
                let _ = window.reload();
            }
        }
        // History lives in the webview, so it is driven from the page side.
        "back" => {
            if let Some(window) = window::main_window(app) {
                let _ = window.eval("window.history.back()");
            }
        }
        "forward" => {
            if let Some(window) = window::main_window(app) {
                let _ = window.eval("window.history.forward()");
            }
        }

        "zoom-in" => adjust_zoom(app, ZoomChange::In),
        "zoom-out" => adjust_zoom(app, ZoomChange::Out),
        "zoom-reset" => adjust_zoom(app, ZoomChange::Reset),

        "help" => open_external(HELP_URL),
        "support" => open_external(SUPPORT_URL),

        other => log::debug!("Unhandled menu event: {other}"),
    }
}

fn open_external(url: &str) {
    if let Err(error) = tauri_plugin_opener::open_url(url, None::<&str>) {
        log::warn!("Could not open {url}: {error}");
    }
}
