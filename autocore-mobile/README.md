# Autocore Mobile

React Native (Expo) mobile application for Autocore — faithful port of the premium Next.js SaaS design language.

## Stack

- Expo Router + React Navigation
- NativeWind (Tailwind)
- React Native Reanimated + Gesture Handler
- React Query + Zustand
- Firebase

## Project structure

```
app/                 Expo Router routes
components/ui/       Design system components
theme/               Design tokens (colors, typography, spacing, etc.)
animations/          Reanimated presets
assets/icons/        Icon registry (lucide wrappers)
services/firebase/   Firebase client
hooks/               Theme and shared hooks
```

## Getting started

```bash
cd autocore-mobile
cp .env.example .env
npm start
```

## Design system first

Screens are intentionally **not** built yet. Open the app to view the Design System showcase tab, which validates all tokens and UI components extracted from the web app.

### Theme tokens

All values extracted from `src/app/globals.css`:

- Light/dark semantic colors (`#0a73f2` primary light, `#4d96ff` primary dark)
- Typography scale (Geist Sans)
- Spacing: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64
- Radius base: 10px (0.625rem)
- Motion: `cubic-bezier(0.22, 1, 0.36, 1)` — macOS-like Autocore easing

### UI library

Every component in `components/ui/` uses only theme tokens — no hardcoded colors, spacing, or typography.

## Next steps

1. Screen-by-screen migration from Next.js
2. Expand icon registry as screens require
3. Wire Firebase auth from web config
