use std::time::{SystemTime, UNIX_EPOCH};

use tauri::webview::NewWindowResponse;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const DESKTOP_APP_URL: &str = include_str!("../desktop-app-url.txt");
const APP_TITLE: &str = "AutoCore";
const DESKTOP_UA_TOKEN: &str = "AutoCoreDesktop/1.0";

const MACOS_SAFARI_UA: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const WINDOWS_EDGE_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0";

fn desktop_user_agent() -> String {
    let base = if cfg!(target_os = "macos") {
        MACOS_SAFARI_UA
    } else {
        WINDOWS_EDGE_UA
    };
    format!("{base} {DESKTOP_UA_TOKEN}")
}

fn trimmed_desktop_url() -> Result<url::Url, String> {
    DESKTOP_APP_URL
        .trim()
        .parse()
        .map_err(|error: url::ParseError| error.to_string())
}

fn is_oauth_popup_url(url: &url::Url) -> bool {
    let host = url.host_str().unwrap_or_default().to_lowercase();
    host.contains("appleid.apple.com")
        || host.contains("idmsa.apple.com")
        || host.contains("apple.com")
        || host.contains("accounts.google.com")
}

fn oauth_window_label() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("oauth-{millis}")
}

fn build_main_window(app: &tauri::AppHandle) -> Result<tauri::WebviewWindow, String> {
    let app_url = trimmed_desktop_url()?;
    let app_handle = app.clone();
    let user_agent = desktop_user_agent();

    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(app_url))
        .title(APP_TITLE)
        .user_agent(&user_agent)
        .inner_size(1400.0, 900.0)
        .min_inner_size(1024.0, 700.0)
        .center()
        .on_new_window(move |url, features| {
            if !is_oauth_popup_url(&url) {
                return NewWindowResponse::Deny;
            }

            let label = oauth_window_label();
            match WebviewWindowBuilder::new(&app_handle, &label, WebviewUrl::External(url))
                .window_features(features)
                .title("Sign in")
                .user_agent(&user_agent)
                .inner_size(520.0, 720.0)
                .center()
                .build()
            {
                Ok(window) => NewWindowResponse::Create { window },
                Err(error) => {
                    log::error!("Failed to open OAuth window: {error}");
                    NewWindowResponse::Deny
                }
            }
        })
        .build()
        .map_err(|error| error.to_string())
}

fn open_main_window(app: &tauri::AppHandle) -> Result<(), String> {
    let app_url = trimmed_desktop_url()?;
    log::info!("Opening {APP_TITLE} at {app_url}");

    if let Some(window) = app.get_webview_window("main") {
        window
            .set_title(APP_TITLE)
            .map_err(|error| error.to_string())?;
        window
            .navigate(app_url)
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    build_main_window(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.handle().plugin(tauri_plugin_siwa::init())?;
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            open_main_window(app.handle())?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {});
}
