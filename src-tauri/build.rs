fn main() {
  println!("cargo:rerun-if-changed=desktop-app-url.txt");
  tauri_build::build()
}
