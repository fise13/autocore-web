use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const DESKTOP_APP_URL: &str = include_str!("../desktop-app-url.txt");

fn trimmed_desktop_url() -> Result<url::Url, String> {
    DESKTOP_APP_URL
        .trim()
        .parse()
        .map_err(|error: url::ParseError| error.to_string())
}

fn open_main_window(app: &tauri::AppHandle) -> Result<(), String> {
    let app_url = trimmed_desktop_url()?;
    log::info!("Opening AutoCore at {app_url}");

    if let Some(window) = app.get_webview_window("main") {
        window
            .navigate(app_url.clone())
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(app_url))
        .title("AutoCore")
        .inner_size(1400.0, 900.0)
        .min_inner_size(1024.0, 700.0)
        .center()
        .build()
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
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
