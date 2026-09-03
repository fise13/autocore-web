const COMMANDS: &[&str] = &["get_apple_id_credential"];

fn main() {
    #[cfg(target_os = "macos")]
    link_macos_swift();

    tauri_plugin::Builder::new(COMMANDS).ios_path("ios").build();
}

#[cfg(target_os = "macos")]
fn link_macos_swift() {
    // #[cfg(target_os = "macos")] guards the *host* OS, not the *target*.
    // When cross-compiling for iOS (aarch64-apple-ios / x86_64-apple-ios),
    // Apple sign-in is handled by ios_path("ios") — the macOS Swift package
    // is not needed and must not be compiled (Cargo injects SDKROOT/
    // IPHONEOS_DEPLOYMENT_TARGET which break the macOS Swift build).
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
        return;
    }

    use swift_rs::SwiftLinker;
    SwiftLinker::new("10.15")
        .with_package("siwa-macos", "./macos")
        .link();
}
