//! Native capabilities the web app cannot provide for itself.
//!
//! Design rules for everything in this file:
//!
//! * The web app keeps owning the work. These commands do not know what an
//!   invoice is — they take bytes and a suggested name.
//! * A save location is chosen by the *user* in a native dialog, never by the
//!   page. That is why there is no `write_file(path, bytes)` command and why the
//!   `fs` plugin is not installed: a compromised page cannot name its target.
//! * Nothing here exposes a filesystem read or an arbitrary-path write. The
//!   `opener` grants are narrowed to URL opening for the same reason.

use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFileRequest {
    /// Filename to offer in the dialog. Directory components are stripped.
    suggested_name: String,
    /// File contents, base64. Base64 rather than a `Vec<u8>` because Tauri's IPC
    /// is JSON: a byte array serialises to one JSON number per byte, roughly 4x
    /// the payload of base64 for the multi-megabyte PDFs this carries.
    contents_base64: String,
    /// Dialog filter, e.g. `{ name: "PDF", extensions: ["pdf"] }`.
    #[serde(default)]
    filters: Vec<SaveFileFilter>,
}

#[derive(Debug, Deserialize)]
pub struct SaveFileFilter {
    name: String,
    extensions: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase", tag = "status")]
pub enum SaveFileResponse {
    /// The user picked a location and the bytes are on disk.
    Saved { path: String },
    /// The user dismissed the dialog. Not an error.
    Cancelled,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintDocumentRequest {
    suggested_name: String,
    contents_base64: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopInfo {
    app_version: String,
    os: String,
    arch: String,
    /// Whether this build was signed for auto-update. The web app hides
    /// "Check for updates" when false rather than offering a dead button.
    updater_enabled: bool,
}

/// Reduce an untrusted string to a bare filename.
///
/// The page proposes this, so it is treated as hostile: path separators, parent
/// traversal and control characters are removed. Even with a sanitised name the
/// user still confirms the location in the dialog, so this is defence in depth
/// against a *misleading* name rather than the only barrier.
fn sanitize_filename(raw: &str, fallback: &str) -> String {
    let base = raw.rsplit(['/', '\\']).next().unwrap_or_default();
    let cleaned: String = base
        .chars()
        .filter(|c| !c.is_control() && !matches!(c, ':' | '*' | '?' | '"' | '<' | '>' | '|'))
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').trim();

    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed.chars().take(200).collect()
    }
}

fn decode(contents_base64: &str) -> Result<Vec<u8>, String> {
    let bytes = BASE64
        .decode(contents_base64)
        .map_err(|error| format!("Malformed file payload: {error}"))?;
    if bytes.is_empty() {
        return Err("Refusing to write an empty file".into());
    }
    Ok(bytes)
}

/// Save bytes to a user-chosen location via the native save dialog.
///
/// Replaces the browser's `<a download>` path on desktop, which is inert in a
/// webview: WKWebView and WebView2 have no download manager, so every export in
/// the app silently did nothing inside the shell.
#[tauri::command]
pub async fn desktop_save_file(
    app: AppHandle,
    request: SaveFileRequest,
) -> Result<SaveFileResponse, String> {
    let bytes = decode(&request.contents_base64)?;
    let filename = sanitize_filename(&request.suggested_name, "autocore-export");

    let mut builder = app.dialog().file().set_file_name(&filename);
    for filter in &request.filters {
        let extensions: Vec<&str> = filter.extensions.iter().map(String::as_str).collect();
        builder = builder.add_filter(&filter.name, &extensions);
    }
    if let Ok(downloads) = app.path().download_dir() {
        builder = builder.set_directory(downloads);
    }

    // The dialog is presented on the main thread and answered on another, so the
    // result comes back over a channel instead of blocking this task.
    let (tx, rx) = std::sync::mpsc::channel();
    builder.save_file(move |path| {
        let _ = tx.send(path);
    });

    let Some(target) = rx.recv().map_err(|_| "Save dialog closed unexpectedly".to_string())? else {
        return Ok(SaveFileResponse::Cancelled);
    };

    let path = target
        .into_path()
        .map_err(|error| format!("Unusable save location: {error}"))?;

    std::fs::write(&path, &bytes).map_err(|error| format!("Could not write file: {error}"))?;

    Ok(SaveFileResponse::Saved {
        path: path.to_string_lossy().into_owned(),
    })
}

/// Hand a generated document to the OS print pipeline.
///
/// Tauri 2 has no cross-platform print API for arbitrary bytes, and the web
/// implementation (`<iframe src=blob:>` then `contentWindow.print()`) does
/// nothing in a webview — `window.print()` has no default handler in WKWebView.
/// Opening the file with the system's PDF handler is the behaviour that actually
/// works on macOS, Windows and Linux, and it lands the user in a real print
/// dialog with paper size and printer selection.
#[tauri::command]
pub async fn desktop_print_document(
    app: AppHandle,
    request: PrintDocumentRequest,
) -> Result<(), String> {
    let bytes = decode(&request.contents_base64)?;
    let filename = sanitize_filename(&request.suggested_name, "autocore-document.pdf");

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_nanos())
        .unwrap_or_default();

    let path = app.path().temp_dir()
        .map_err(|error| format!("No temp directory: {error}"))?
        .join(format!("autocore-print-{stamp}-{filename}"));

    std::fs::write(&path, &bytes).map_err(|error| format!("Could not stage document: {error}"))?;

    tauri_plugin_opener::open_path(&path, None::<&str>)
        .map_err(|error| format!("Could not open document for printing: {error}"))
}

/// Print the current page through the webview's own print operation.
///
/// Backs the places the web app calls `window.print()` directly — warehouse
/// label sheets and the work-order print view — which is a no-op in WKWebView.
#[tauri::command]
pub fn desktop_print_page(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|error| format!("Print failed: {error}"))
}

#[tauri::command]
pub fn desktop_info(app: AppHandle) -> DesktopInfo {
    DesktopInfo {
        app_version: app.package_info().version.to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        updater_enabled: crate::updater::is_configured(&app),
    }
}

/// Publish (or clear) the current workspace URL as an Apple Handoff activity.
///
/// The page reports client-side Next.js navigations that never fire a native
/// `on_navigation`. Non-product URLs are ignored rather than rejected so a
/// login screen simply stops advertising the previous work-order.
#[tauri::command]
pub fn desktop_handoff_set_url(app: AppHandle, url: Option<String>) -> Result<(), String> {
    let parsed = match url.as_deref().map(str::trim) {
        None | Some("") => None,
        Some(raw) => Some(url::Url::parse(raw).map_err(|error| error.to_string())?),
    };
    if let Some(ref parsed) = parsed {
        crate::session::remember(&app, parsed);
    }
    crate::handoff::set_current_url(&app, parsed);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::sanitize_filename;

    #[test]
    fn strips_directory_components() {
        assert_eq!(sanitize_filename("../../etc/passwd", "fallback"), "passwd");
        assert_eq!(sanitize_filename("C:\\Windows\\system32\\x.dll", "fallback"), "x.dll");
    }

    #[test]
    fn keeps_ordinary_and_non_ascii_names() {
        assert_eq!(sanitize_filename("work-order-42.pdf", "fallback"), "work-order-42.pdf");
        assert_eq!(sanitize_filename("Акт приёмки.pdf", "fallback"), "Акт приёмки.pdf");
    }

    #[test]
    fn falls_back_on_unusable_names() {
        assert_eq!(sanitize_filename("", "fallback"), "fallback");
        assert_eq!(sanitize_filename("   ", "fallback"), "fallback");
        assert_eq!(sanitize_filename("..", "fallback"), "fallback");
        assert_eq!(sanitize_filename("/", "fallback"), "fallback");
    }
}
