//! AutoCore desktop shell.
//!
//! The shell is deliberately thin. AutoCore's UI, routing and business logic are
//! the same Next.js application that serves the web product; this binary hosts it
//! in a native window and adds the things a browser tab already had and a webview
//! does not: a real menu, file save dialogs, printing, deep links, window state
//! and updates.
//!
//! Nothing here reimplements product behaviour, and no product logic moves into
//! Rust. See `docs/DESKTOP-ARCHITECTURE.md` for why the app is loaded from its
//! hosted origin rather than bundled as static assets.

mod commands;
mod config;
mod deep_link;
mod menu;
mod security;
mod updater;
mod window;

// Brings `add_capability` into scope; only the debug-only calls below use it.
#[cfg(debug_assertions)]
use tauri::Manager;

/// Capability granted only to debug builds, so a developer can point the shell at
/// `next dev` on localhost. Release binaries never carry it: capabilities are
/// compiled in, so this is added at runtime under `debug_assertions` instead of
/// living in `capabilities/`, where it would ship to users.
#[cfg(debug_assertions)]
const DEV_LOCALHOST_CAPABILITY: &str = r#"{
  "identifier": "dev-localhost",
  "description": "Local Next.js dev server inside the desktop shell (debug builds only)",
  "windows": ["main", "product-*"],
  "remote": { "urls": ["http://localhost:*/*", "http://127.0.0.1:*/*"] },
  "permissions": [
    "core:event:default",
    "core:window:allow-set-title",
    "core:webview:allow-set-webview-zoom",
    "opener:allow-open-url",
    "opener:allow-default-urls",
    "clipboard-manager:allow-read-text",
    "clipboard-manager:allow-write-text",
    "notification:default",
    "allow-desktop-save-file",
    "allow-desktop-print-document",
    "allow-desktop-print-page",
    "allow-desktop-info"
  ]
}"#;

/// Native Sign in with Apple against a local dev server. Separate from
/// [`DEV_LOCALHOST_CAPABILITY`] because the `siwa` plugin only exists on macOS,
/// and naming its permission on another platform fails ACL resolution.
#[cfg(all(debug_assertions, target_os = "macos"))]
const DEV_LOCALHOST_SIWA_CAPABILITY: &str = r#"{
  "identifier": "dev-localhost-siwa",
  "description": "Native Sign in with Apple from a local dev server (debug builds only)",
  "platforms": ["macOS"],
  "windows": ["main"],
  "remote": { "urls": ["http://localhost:*/*", "http://127.0.0.1:*/*"] },
  "permissions": ["siwa:allow-get-apple-id-credential"]
}"#;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Must be the first plugin: it decides whether this process continues at all.
    // A second launch (typically the OS handing over an `autocore://` link) is
    // folded into the running instance instead of opening a duplicate window.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(main) = window::main_window(app) {
                window::focus(&main);
            }
            let links = deep_link::urls_from_argv(&argv);
            if !links.is_empty() {
                deep_link::handle_urls(app, links);
            }
        }));
    }

    builder
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .manage(menu::ZoomLevel::default())
        .invoke_handler(tauri::generate_handler![
            commands::desktop_save_file,
            commands::desktop_print_document,
            commands::desktop_print_page,
            commands::desktop_info,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            #[cfg(debug_assertions)]
            {
                app.handle()
                    .plugin(
                        tauri_plugin_log::Builder::default()
                            .level(log::LevelFilter::Info)
                            .build(),
                    )?;

                if let Err(error) = handle.add_capability(DEV_LOCALHOST_CAPABILITY) {
                    log::warn!("Could not add the localhost dev capability: {error}");
                }
            }

            // Native Sign in with Apple. Web Apple JS is unreliable inside
            // WKWebView, so macOS uses the system sheet instead.
            #[cfg(target_os = "macos")]
            handle.plugin(tauri_plugin_siwa::init())?;

            #[cfg(all(debug_assertions, target_os = "macos"))]
            if let Err(error) = handle.add_capability(DEV_LOCALHOST_SIWA_CAPABILITY) {
                log::warn!("Could not add the localhost dev SIWA capability: {error}");
            }

            updater::setup(&handle)?;

            app.set_menu(menu::build(&handle)?)?;
            app.on_menu_event(menu::handle_event);

            deep_link::setup(&handle);
            window::open_main_window(&handle, None)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {});
}
