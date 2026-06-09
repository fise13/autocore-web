# Desktop installers served from Vercel (public/downloads/)

After building the Tauri shell:

```bash
npm run tauri:build:mac
npm run tauri:publish-downloads
```

Expected files for the marketing footer:

- AutoCore-mac.dmg
- AutoCore-windows.exe

Or set custom URLs via NEXT_PUBLIC_DESKTOP_DOWNLOAD_MAC / NEXT_PUBLIC_DESKTOP_DOWNLOAD_WIN.
