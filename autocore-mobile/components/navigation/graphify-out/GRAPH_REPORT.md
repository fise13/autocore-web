# Graph Report - autocore-mobile/components/navigation  (2026-08-11)

## Corpus Check
- 11 files · ~4,058 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 48 nodes · 62 edges · 9 communities (6 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77c52f69`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- liquid-glass-tab-bar.tsx
- tab-transition-context.tsx
- action-sheet-host.tsx
- use-navigate-tab.ts
- animated-tab-screen.tsx
- root-navigator.tsx
- screen-action-footer.tsx
- tab-screen-placeholder.tsx

## God Nodes (most connected - your core abstractions)
1. `resolveTabRouteName()` - 7 edges
2. `useTabTransition()` - 6 edges
3. `LiquidGlassTabBarInner()` - 4 edges
4. `useNavigateTab()` - 4 edges
5. `TAB_ORDER` - 3 edges
6. `TabRouteName` - 3 edges
7. `isTabRouteName()` - 3 edges
8. `resolveTabFromHref()` - 3 edges
9. `resolveCurrentTab()` - 3 edges
10. `GlassSheen` - 2 edges

## Surprising Connections (you probably didn't know these)
- `LiquidGlassTabBarInner()` --calls--> `resolveTabRouteName()`  [EXTRACTED]
  autocore-mobile/components/navigation/liquid-glass-tab-bar.tsx → autocore-mobile/components/navigation/tab-transition-context.tsx
- `useNavigateTab()` --calls--> `useTabTransition()`  [EXTRACTED]
  autocore-mobile/components/navigation/use-navigate-tab.ts → autocore-mobile/components/navigation/tab-transition-context.tsx
- `LiquidGlassTabBarInner()` --calls--> `useTabTransition()`  [EXTRACTED]
  autocore-mobile/components/navigation/liquid-glass-tab-bar.tsx → autocore-mobile/components/navigation/tab-transition-context.tsx
- `resolveCurrentTab()` --calls--> `resolveTabRouteName()`  [EXTRACTED]
  autocore-mobile/components/navigation/use-navigate-tab.ts → autocore-mobile/components/navigation/tab-transition-context.tsx
- `resolveTabFromHref()` --calls--> `resolveTabRouteName()`  [EXTRACTED]
  autocore-mobile/components/navigation/use-navigate-tab.ts → autocore-mobile/components/navigation/tab-transition-context.tsx

## Import Cycles
- None detected.

## Communities (9 total, 3 thin omitted)

### Community 0 - "liquid-glass-tab-bar.tsx"
Cohesion: 0.21
Nodes (6): AnimatedPressable, canUseLiquidGlass(), LiquidGlassTabBar, LiquidGlassTabBarInner(), styles, useTabTransition()

### Community 1 - "tab-transition-context.tsx"
Cohesion: 0.38
Nodes (6): isTabRouteName(), NO_TRANSITION, TAB_ORDER, TabTransitionContext, TabTransitionContextValue, TabTransitionProvider()

### Community 2 - "action-sheet-host.tsx"
Cohesion: 0.40
Nodes (3): styles, GlassSheen, styles

### Community 3 - "use-navigate-tab.ts"
Cohesion: 0.60
Nodes (5): resolveTabRouteName(), resolveCurrentTab(), resolveTabFromHref(), TabNavigateTarget, useNavigateTab()

### Community 4 - "animated-tab-screen.tsx"
Cohesion: 0.40
Nodes (4): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, TabRouteName

## Knowledge Gaps
- **14 isolated node(s):** `styles`, `AnimatedTabScreenProps`, `AnimatedTabScreen`, `StaticTabScreen`, `styles` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTabTransition()` connect `liquid-glass-tab-bar.tsx` to `tab-transition-context.tsx`, `use-navigate-tab.ts`, `animated-tab-screen.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `resolveTabRouteName()` connect `use-navigate-tab.ts` to `liquid-glass-tab-bar.tsx`, `tab-transition-context.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `LiquidGlassTabBarInner()` connect `liquid-glass-tab-bar.tsx` to `use-navigate-tab.ts`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `styles`, `AnimatedTabScreenProps`, `AnimatedTabScreen` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._