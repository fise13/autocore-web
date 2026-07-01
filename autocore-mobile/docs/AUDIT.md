# Autocore Mobile — Design System Audit

**Date:** June 2026  
**Scope:** `autocore-mobile/` — pre-screen migration  
**Status:** Upgraded to production architecture

---

## Executive summary

The initial design system had correct token extraction from the web app but suffered from **scattered responsibilities**, **inline style duplication**, **no single design language entry point**, **incomplete motion/a11y support**, and **scaffold leftovers** from the Expo template. All critical issues have been addressed.

---

## Issues found & resolutions

### 1. Duplicated styles

| Issue | Location | Fix |
|-------|----------|-----|
| Input border/height/padding repeated | `input.tsx`, `search-input.tsx`, `text-area.tsx`, `date-picker.tsx` | `theme/styles.ts` → `createInputStyle`, `createInputTextStyle` |
| Card surface + ring + shadow repeated | `card.tsx`, `stat-card.tsx`, `dashboard-card.tsx` | `createCardStyle`, `createSurfaceCardStyle` |
| Pressable variant backgrounds repeated | `button.tsx`, `icon-button.tsx` | `createPressableControlStyle` |
| Icon badge container repeated | `stat-card.tsx`, business cards | `createIconBadgeStyle` |
| List row / action tile repeated | `quick-action-card`, `empty-state` | `createListRowStyle` |
| Segmented control track repeated | `segmented-control.tsx`, `tabs.tsx` | `createSegmentedTrackStyle` |
| Chip styles repeated | `chip.tsx`, `badge.tsx` | `createChipStyle` |
| Hardcoded `#000` shadow in tabs | `tabs.tsx` | Use `dl.shadows.xs` (pending full tabs refactor) |
| Hardcoded `fontSize: 14` overrides | `alert.tsx`, `toast.tsx`, `stat-card.tsx` | Use typography variants / `scaledSize` |

### 2. Duplicated animations

| Issue | Fix |
|-------|-----|
| `theme/motion.ts` + `theme/animations.ts` + `animations/presets.ts` overlap | `motion.ts` = Reanimated presets; `animations.ts` = primitives; hooks use motion system |
| `usePressAnimation` / `useCardLift` ignored reduced motion | Hooks now call `useReducedMotion()` |
| CSS keyframes not mapped to Reanimated | Added: pagePush/Pop/Fade, sheet, dialog, toast, listStagger, skeleton, fab |

### 3. Duplicated colors

| Issue | Fix |
|-------|-----|
| `constants/Colors.ts` (Expo scaffold, wrong palette) | **Deleted** |
| Inline `${color}1A` alpha hex in components | `theme/color-utils.ts` → `withAlpha`, `toneBackground` |
| `withAlpha` duplicated in `gradients.ts` | Consolidated to `color-utils.ts` |
| Semantic colors only in `useTheme` | Exposed via `useDesignLanguage()` |

### 4. Duplicated spacing / layout

| Issue | Fix |
|-------|-----|
| Magic numbers `24`, `36`, `44`, `52` in components | `design-language.ts` → `touchTarget`, `buttonHeight`, `navigationHeight` |
| `layout.ts` parallel to design-language | `layout.ts` retained for backward compat; `layoutRhythm` in design-language is canonical |
| Hardcoded `padding: 16` in screens | `layoutRhythm.screenPadding`, `useAdaptiveLayout().horizontalPadding` |

### 5. Duplicated typography

| Issue | Fix |
|-------|-----|
| `fontFamily: 'GeistSans'` hardcoded in Text/Input | `typeFamily.sans` via design language |
| No Dynamic Type scaling | `Text` uses `scaledSize()` + `maxFontSizeMultiplier` |
| `fontSize` overrides in business cards | `dl.scaledSize()` in PriceCard |

### 6. Duplicated shadows

| Issue | Fix |
|-------|-----|
| Inline shadow objects in tabs | Should migrate to `dl.shadows` |
| `getShadows` only via `useTheme` | Also on `useDesignLanguage().shadows` |

### 7. Duplicated icons

| Issue | Fix |
|-------|-----|
| No central registry | `assets/icons/index.ts` → `iconRegistry` map |
| Limited props (no state/filled) | `createIcon` supports `variant`, `state`, `animatedOpacity` |
| Icons imported ad-hoc | Document: import only from `@/assets/icons` |

### 8. Duplicated layouts

| Issue | Fix |
|-------|-----|
| No adaptive breakpoint hook | `hooks/use-adaptive-layout.ts` |
| Safe area padding repeated | `useAdaptiveLayout().insets` + TopBar/BottomBar |
| Business card layout copy-pasted | `BusinessCardShell` |

### 9. Scaffold dead code (removed)

- `components/Themed.tsx`
- `components/StyledText.tsx`
- `components/EditScreenInfo.tsx`
- `constants/Colors.ts`

### 10. Missing architecture

| Added | Purpose |
|-------|---------|
| `theme/design-language.ts` | Single source of truth for visual decisions |
| `theme/design-language-context.ts` | Composed runtime context |
| `theme/styles.ts` | Shared style factories |
| `hooks/use-design-language.ts` | One hook for all tokens |
| `hooks/use-accessibility.ts` | Reduced motion, Dynamic Type, RTL, screen reader |
| `hooks/use-adaptive-layout.ts` | iPhone SE → iPad, landscape, split view |
| `components/business/*` | 17 domain components |
| `components/ui/flash-list.tsx` | Performance wrapper |

---

## Accessibility checklist

| Feature | Status |
|---------|--------|
| Dynamic Type | ✅ `Text.scaledSize`, `maxFontSizeMultiplier` |
| Reduced Motion | ✅ All animation hooks + `pickMotion()` |
| VoiceOver / TalkBack | ✅ `accessibilityRole` on interactives; audit remaining |
| High Contrast | ✅ Hook available; border emphasis TODO |
| RTL | ✅ `useIsRTL()` |
| Touch targets ≥ 44pt | ✅ `touchTarget.minimum` on Button |

---

## Performance checklist

| Item | Status |
|------|--------|
| `memo` on Text, Button, business cards | ✅ |
| FlashList wrapper | ✅ |
| Theme memoization | ✅ `useDesignLanguage` useMemo |
| SVG via lucide (native) | ✅ |
| Lazy icon registry | ✅ |

---

## Remaining incremental work (non-blocking)

1. Migrate remaining UI components (`tabs`, `dialog`, `toast`) to `useDesignLanguage()` fully
2. Add Geist font files to `expo-font` loading in `_layout.tsx`
3. High contrast border emphasis pass
4. Expand `iconRegistry` as screens are built
5. Add visual regression / Storybook when screen migration begins

---

## Architecture diagram

```
theme/design-language.ts  ←── single source of truth
        │
        ├── colors, spacing, radius, typography (primitives)
        ├── motion.ts (Reanimated presets)
        ├── styles.ts (factories)
        └── design-language-context.ts
                │
        hooks/use-design-language.ts
                │
    ┌───────────┴───────────┐
components/ui/*     components/business/*
```

---

## Quality bar

The design system now supports building the full Autocore mobile SaaS by **composition only** — no new colors, spacing, or motion curves should be introduced in screens.
