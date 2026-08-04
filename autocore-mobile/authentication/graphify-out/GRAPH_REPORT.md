# Graph Report - autocore-mobile/authentication  (2026-08-03)

## Corpus Check
- 27 files · ~12,729 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 116 nodes · 167 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ab4989d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth-provider.tsx
- auth-oauth-button.tsx
- login-screen.tsx
- auth-splash-surface.tsx
- auth-hero-shell.tsx
- auth-gate.tsx
- auth-shell.tsx
- auth-boot-loading.tsx

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 12 edges
2. `useAuthActionsController()` - 6 edges
3. `AuthGate()` - 4 edges
4. `AuthOAuthButton()` - 4 edges
5. `AuthBrandMark()` - 3 edges
6. `paywallImport()` - 3 edges
7. `AuthHeroShell()` - 3 edges
8. `getOAuthButtonTheme()` - 3 edges
9. `useAuthHasAccess()` - 3 edges
10. `ForgotPasswordScreen()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `AuthenticatedLandingScreen()` --calls--> `useAuth()`  [EXTRACTED]
  autocore-mobile/authentication/authenticated-landing-screen.tsx → autocore-mobile/authentication/auth-provider.tsx
- `ForgotPasswordScreen()` --calls--> `useAuth()`  [EXTRACTED]
  autocore-mobile/authentication/forgot-password-screen.tsx → autocore-mobile/authentication/auth-provider.tsx
- `LoginScreen()` --calls--> `useAuth()`  [EXTRACTED]
  autocore-mobile/authentication/login-screen.tsx → autocore-mobile/authentication/auth-provider.tsx
- `SubscriptionRequiredScreen()` --calls--> `useAuth()`  [EXTRACTED]
  autocore-mobile/authentication/subscription-required-screen.tsx → autocore-mobile/authentication/auth-provider.tsx
- `WorkspaceAccessScreen()` --calls--> `useAuth()`  [EXTRACTED]
  autocore-mobile/authentication/workspace-access-screen.tsx → autocore-mobile/authentication/auth-provider.tsx

## Import Cycles
- None detected.

## Communities (9 total, 1 thin omitted)

### Community 0 - "auth-provider.tsx"
Cohesion: 0.13
Nodes (17): workspaceImport(), AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore() (+9 more)

### Community 1 - "auth-oauth-button.tsx"
Cohesion: 0.13
Nodes (14): AppleSignInButton(), AppleSignInButtonProps, AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButton(), AuthOAuthButtonProps (+6 more)

### Community 2 - "login-screen.tsx"
Cohesion: 0.16
Nodes (10): AuthEmailChip(), AuthEmailChipProps, AuthEmailPill(), AuthEmailPillProps, AuthSocialCluster(), AuthSocialClusterProps, InviteFormNotice(), InviteFormNoticeProps (+2 more)

### Community 3 - "auth-splash-surface.tsx"
Cohesion: 0.15
Nodes (13): APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, AuthLoadingScreen(), AuthLoadingScreenProps, AuthSplashSurface(), AuthSplashSurfaceProps (+5 more)

### Community 4 - "auth-hero-shell.tsx"
Cohesion: 0.18
Nodes (9): AnimatedLine, AuthHeroCar(), FRONT_WHEEL, REAR_WHEEL, SPEED_LINES, WheelProps, AuthHeroShell(), AuthHeroShellProps (+1 more)

### Community 5 - "auth-gate.tsx"
Cohesion: 0.24
Nodes (9): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, useAuthHasAccess(), AuthRedirectEffect() (+1 more)

### Community 6 - "auth-shell.tsx"
Cohesion: 0.28
Nodes (4): AuthShell(), AuthShellProps, ForgotPasswordScreen(), isValidEmail()

## Knowledge Gaps
- **37 isolated node(s):** `AppleSignInButtonProps`, `AuthBootLoadingProps`, `BrandIconProps`, `AuthBrandMarkProps`, `APP_ICON` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `auth-provider.tsx` to `login-screen.tsx`, `auth-shell.tsx`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `AuthBrandMark()` connect `auth-splash-surface.tsx` to `auth-hero-shell.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `GoogleSignInButton()` connect `auth-oauth-button.tsx` to `login-screen.tsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `AppleSignInButtonProps`, `AuthBootLoadingProps`, `BrandIconProps` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth-provider.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13438735177865613 - nodes in this community are weakly interconnected._
- **Should `auth-oauth-button.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12857142857142856 - nodes in this community are weakly interconnected._