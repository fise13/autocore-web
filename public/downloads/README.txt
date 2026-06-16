# Desktop installers (Tauri)

Published to this folder for static hosting at `/downloads/*`.

## Build & publish

```bash
# macOS (Apple Silicon)
npm run tauri:build:mac
npm run tauri:publish-downloads

# Windows (run on Windows or CI with MSVC toolchain)
npm run tauri:build:win
npm run tauri:publish-downloads
```

Expected files:

- `AutoCore-mac.dmg`
- `AutoCore-windows.exe`

## Production

Either commit the files above (Vercel serves `public/` as static assets) or set custom URLs:

```env
NEXT_PUBLIC_DESKTOP_DOWNLOAD_MAC=https://myautocore.com/downloads/AutoCore-mac.dmg
NEXT_PUBLIC_DESKTOP_DOWNLOAD_WIN=https://myautocore.com/downloads/AutoCore-windows.exe
```

Availability is checked via `GET /api/desktop/downloads`.
