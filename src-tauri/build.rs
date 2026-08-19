/// Commands the web app may invoke. Listing them here makes `tauri-build`
/// generate an `allow-<command>` permission for each, which is what lets the
/// capabilities in `capabilities/` grant them — without an explicit grant a
/// remote origin cannot reach an app command at all.
const APP_COMMANDS: &[&str] = &[
    "desktop_save_file",
    "desktop_print_document",
    "desktop_print_page",
    "desktop_info",
];

fn main() {
    // The shell's target origin is baked in at compile time by
    // scripts/sync-tauri-app-url.mjs; rebuild whenever it changes.
    println!("cargo:rerun-if-changed=desktop-app-url.txt");

    let attributes = tauri_build::Attributes::new()
        .app_manifest(tauri_build::AppManifest::new().commands(APP_COMMANDS));

    tauri_build::try_build(attributes).expect("failed to run tauri-build");
}
