# Graph Report - autocore-mobile  (2026-08-04)

## Corpus Check
- 859 files · ~340,134 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4294 nodes · 13658 edges · 230 communities (168 shown, 62 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2fc337e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- search-registry.ts
- create-operation-screen.tsx
- orders-screen.tsx
- text.tsx
- team-screen.tsx
- motion.ts
- create-order-screen.tsx
- snapshot-builders.ts
- accounting-screen.tsx
- index.ts
- index.ts
- index.ts
- useSession
- app-tab-bar.tsx
- index.ts
- order-detail-screen.tsx
- useTheme
- auth-provider.tsx
- Text
- radius
- firestore-timestamp.ts
- notification-service.ts
- getJson
- types.ts
- notifications-settings-screen.tsx
- scan-screen.tsx
- useReducedMotion
- useAuth
- currency-screen.tsx
- paywall.tsx
- subscription-registry.ts
- types.ts
- auth-gate.tsx
- mc-featured-insight.tsx
- haptics
- use-scan-experience.ts
- index.ts
- scan-product-sheet.tsx
- getFirebaseDb
- rhythm
- order-composition-step.tsx
- scan-document-sheet.tsx
- edit-profile-screen.tsx
- use-theme.tsx
- index.ts
- my-earnings-screen.tsx
- empty-state.tsx
- inventory.ts
- app.config.ts
- dependencies
- index.ts
- client-repository.ts
- types.ts
- push-channel.ts
- organization-switch-button.tsx
- toneBackground
- autocomplete-provider.tsx
- scan-service.ts
- startup-tracer.ts
- document-file-actions.ts
- login-screen.tsx
- ScanService
- profile-screen.tsx
- include
- setup-wizard-screen.tsx
- apple-sign-in.ts
- login-screen.tsx
- notification-bell-button.tsx
- document-import-screen.tsx
- ac-payroll-list.tsx
- apple-sign-in.ts
- mapAuthError
- input-field.tsx
- Issues found & resolutions
- composer-utils.ts
- animated-tab-screen.tsx
- search-idle.tsx
- styles.ts
- inline-autocomplete-row.tsx
- subscription-screen.tsx
- profile.ts
- document-import.ts
- modules.ts
- location-screen.tsx
- ac-payroll-list.tsx
- order-documents-section.tsx
- ScanDebounce
- version-settings-screen.tsx
- delete-account.ts
- use-work-order-composer-options.ts
- search-engine-card.tsx
- kv.ts
- Manual Matrix
- deep-link-resolver.ts
- invite-accept-screen.tsx
- useFloatingTabBarInset
- order-row.tsx
- package.json
- copy-button.tsx
- google-sign-in-button.tsx
- highlighted-text.tsx
- scripts
- mobilePost
- useFloatingTabBarInset
- financial-operation-repository.ts
- team-invite-card.tsx
- relocate-pending-store.ts
- purchase-store.ts
- Autocore Mobile
- use-search-idle-data.ts
- Firebase integration QA matrix
- diagnostics-settings-screen.tsx
- advances.ts
- team-employee-card.tsx
- metro.config.js
- invite-code.ts
- with-ios-universal-links.js
- ExternalLink.tsx
- useColorScheme.web.ts
- types.ts
- settings-animated-card.tsx
- with-ios-push-entitlements.js
- tab-bar-visibility-store.ts
- authenticated-landing-screen.tsx
- inventory-card.tsx
- profile-danger-zone.tsx
- @autocore/org
- date-fns
- expo
- use-work-order-composer-options.ts
- expo-auth-session
- expo-blur
- expo-clipboard
- expo-constants
- expo-crypto
- expo-device
- expo-file-system
- expo-haptics
- expo-image
- organization-switch-button.tsx
- expo-linear-gradient
- expo-notifications
- expo-print
- expo-router
- expo-sharing
- expo-splash-screen
- expo-status-bar
- expo-symbols
- firebase
- global.d.ts
- @gorhom/bottom-sheet
- lucide-react-native
- nativewind
- react-dom
- react-native
- @react-native-async-storage/async-storage
- @react-native-community/datetimepicker
- @react-native-community/netinfo
- team-invite-card.tsx
- @react-native-google-signin/google-signin
- react-native-mmkv
- react-native-nitro-modules
- react-native-screens
- react-native-svg
- react-native-worklets
- @shopify/flash-list
- tailwind-merge
- tailwindcss
- @tanstack/react-query
- zod
- zustand
- ios-refresh-provisioning.sh
- MODULE_IDS
- defaultEaseOut
- typeFamily
- typeWeight
- cardLiftMotion
- pressMotion
- use-work-order-composer-options.ts
- advances.ts
- SecuritySettingsScreen
- notification-bell-button.tsx
- create-icon.tsx
- use-notification-preferences.ts
- auth-journey-screens.tsx
- expo-image-picker
- highlighted-text.tsx
- useFadeIn
- @autocore/avatars
- sidebar.tsx
- useScreenEnter
- sidebar.tsx
- CollectionSwitchRow
- app-loading-screen.tsx
- local-inventory-resolve.ts
- in-app-banner-provider.tsx
- tab-transition-context.tsx
- @autocore/billing
- invite-service.ts
- @autocore/rbac
- priority-router.ts
- recent-scans.ts
- useScreenEnter
- expo-blur
- engine-status.tsx
- mock-scan-registry.ts
- scan-top-bar.tsx
- gradients.ts
- @autocore/billing
- expo-auth-session

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 417 edges
2. `Text` - 212 edges
3. `haptics` - 135 edges
4. `rhythm` - 95 edges
5. `useSession()` - 92 edges
6. `getFirebaseDb()` - 85 edges
7. `useReducedMotion()` - 84 edges
8. `normalizeCompanyId()` - 67 edges
9. `spacing` - 67 edges
10. `toneBackground()` - 62 edges

## Surprising Connections (you probably didn't know these)
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  animations/presets.ts → hooks/use-accessibility.ts
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  authentication/auth-provider.tsx → services/auth/apple-sign-in.ts
- `useAuthReady()` --calls--> `useAuthStore`  [EXTRACTED]
  authentication/auth-provider.tsx → store/auth-store.ts
- `RootStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  components/navigation/root-navigator.tsx → hooks/use-theme.tsx
- `FeatureLockedCard()` --calls--> `useTheme()`  [EXTRACTED]
  components/subscription/feature-gate.tsx → hooks/use-theme.tsx

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`

## Communities (230 total, 62 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.07
Nodes (58): AutocompleteOverlay, AutocompleteOverlayProps, AutocompleteInput, AutocompleteInputProps, ComposerVehicleForm, useWorkOrderComposerOptions(), vehiclesInContext(), useAutocomplete() (+50 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.09
Nodes (18): McWeekBar(), McWeekBarsProps, McAttentionBanner, McAttentionBannerProps, McTodayOverview, McTodayOverviewProps, TodayCell, ActivityCategory (+10 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.08
Nodes (46): clearEntitlementCaches(), clearEntitlementRegistry(), asPurchaseFailure(), isCancellation(), isPurchaseFailure(), emit(), EMPTY_PRODUCTS, getFlow() (+38 more)

### Community 3 - "text.tsx"
Cohesion: 0.03
Nodes (76): FilterIcon, PlusIcon, AuthDivider(), normalizeCode(), VerificationCodeInput(), VerificationCodeInputProps, AnimatedPath, AppLoadingLogoProps (+68 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.14
Nodes (14): TeamDirectoryComposer(), TeamDirectoryComposerProps, TeamDirectoryRow, TeamDirectoryRowProps, styles, TeamInviteCardProps, TeamInviteRow, TeamBadge() (+6 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (37): ScreenEnterConfig, useFadeIn(), usePageEnter(), useScaleEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps, enterValues (+29 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.06
Nodes (53): CreateOrderScreen(), FormCard(), SheetNavButton(), STEPS, StepTrail(), SummaryRow(), useOrderCompositionForm(), UseOrderCompositionFormOptions (+45 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.05
Nodes (55): PhoneIcon, EmptyState(), OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), SourceLayout, useOrderTransition(), OrderCard (+47 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.16
Nodes (17): HomeRoute(), OverviewScreen(), OverviewSnapshot, getStartupMarks(), logStartupTable(), MarkEntry, marks, markStartup() (+9 more)

### Community 9 - "index.ts"
Cohesion: 0.10
Nodes (25): WorkspaceAccessScreen(), StackScreen(), presentOrganizationSwitcher(), ProfileHeroCard(), ProfileHeroCardProps, PROFILE_ROUTES, profileHubRouteHref(), ProfileHubRow (+17 more)

### Community 10 - "index.ts"
Cohesion: 0.10
Nodes (39): clientRepository, useClientsRealtime(), useCompanyAppConfig(), useCompanyDirectory(), useCompanyInvites(), CommonControlledStateProps, useControlledState(), useDocumentGenerationJobsRealtime() (+31 more)

### Community 11 - "index.ts"
Cohesion: 0.21
Nodes (16): SearchIcon, SearchEmptyActionId, SearchEmptyState(), SearchEmptyStateProps, pluralResults(), SearchResults(), SearchResultsProps, AddToOrderHandlers (+8 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.10
Nodes (21): notifyFirestoreSnapshotError(), reviveDatesDeep(), shouldReviveDateField(), toDateFromFirestore(), mapClient(), mapEmployee(), createMotorRepository(), dedupeMotors() (+13 more)

### Community 14 - "index.ts"
Cohesion: 0.12
Nodes (26): DatePicker(), CachedSubscription, date(), deserialize(), iso(), readEntitlementCache(), readEntitlementCacheSync(), serialize() (+18 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.11
Nodes (21): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+13 more)

### Community 16 - "useTheme"
Cohesion: 0.15
Nodes (27): buildWeekRevenueBars(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), resolveOverviewRevenue(), resolveWeekChartBars() (+19 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.10
Nodes (33): useCompanySubscription(), useEntitlementFor(), dateMs(), planById(), planForSku(), CachedEntitlement, isCacheTrustworthy(), acquireEntitlement() (+25 more)

### Community 18 - "Text"
Cohesion: 0.34
Nodes (11): PendingAdd, useAddToOrderFlow(), CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart(), navigateOrderEdit() (+3 more)

### Community 19 - "radius"
Cohesion: 0.17
Nodes (23): applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems(), paginateItems() (+15 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.09
Nodes (44): CompanyEmployeeRow, useCompanyEmployees(), useCompanyProfile(), useWorkspaceAccessRealtime(), CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), normalizeCompanyId() (+36 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.11
Nodes (22): AppearanceSettingsScreen(), THEME_OPTIONS, ACCENT_COLORS, AppearanceSettingsState, DEFAULT_APPEARANCE, useAppearanceSettingsStore, AccentColorId, useAccessibility() (+14 more)

### Community 22 - "getJson"
Cohesion: 0.08
Nodes (25): ArrowUpRightIcon, formatCounter(), formatGroupedInteger(), McAnimatedCounterProps, McCounterFormat, mcDuration, mcMotion, mcSpring (+17 more)

### Community 23 - "types.ts"
Cohesion: 0.19
Nodes (20): recoverSessionWorkspace(), ensureFirestoreAuthReady(), buildFallbackProfile(), CompanyDocShape, ensureUserDocument(), hydrateEffectiveProfile(), loadFastSessionBootstrap(), loadFastUserProfile() (+12 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.13
Nodes (16): DesignSystemScreen(), NotFoundScreen(), ActivityIcon, ActivityCard, ActivityCardProps, BusinessCardShell(), BusinessCardShellProps, EngineCard (+8 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.11
Nodes (39): useAccountingData(), UseAccountingDataResult, AccountingAttentionAction, AttentionTone, CashFlowPeriod, InvoiceStatus, TransactionStatus, TrendTone (+31 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.12
Nodes (19): AccountingScreen(), AcAccountTiles, AcAccountingEmptyState(), AcAccountingEmptyStateProps, AcBalanceCard, AcTabBar(), AcTabBarProps, AcTabPanel() (+11 more)

### Community 27 - "useAuth"
Cohesion: 0.14
Nodes (16): ImagesIcon, UserRoundIcon, CustomerCard, CustomerCardProps, EngineStatus, EngineStatusProps, EngineStatusType, labels (+8 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.14
Nodes (12): CREATE_HREF, JOIN_HREF, OrganizationCard, OrgCardProps, styles, SwitchOrganizationScreen(), CATEGORY_HINTS, NotificationsSettingsScreen() (+4 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.17
Nodes (20): useSessionBootstrapReady(), acquireRealtimeSubscription(), applyCachedSnapshot(), areAcquiredSessionListenersReady(), areInteractiveSessionReady(), areRealtimeKeysReady(), attachListener(), getSessionBootstrapStatus() (+12 more)

### Community 31 - "types.ts"
Cohesion: 0.05
Nodes (56): MailIcon, AuthEmailChip(), AuthEmailChipProps, AuthBackdrop(), AuthShellProps, ProgressBar(), AuthSocialCluster(), AuthSocialClusterProps (+48 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.10
Nodes (29): CarIcon, CoinsIcon, FileTextIcon, HelpCircleIcon, LayoutGridIcon, PackageIcon, ReceiptIcon, ScanLineIcon (+21 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.12
Nodes (30): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile() (+22 more)

### Community 34 - "haptics"
Cohesion: 0.18
Nodes (12): FlashlightIcon, DocumentFrameOverlay(), styles, ImportParseStatus, ImportSuccessView(), ImportSuccessViewProps, ImportUploadingView(), ImportUploadingViewProps (+4 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.20
Nodes (12): ModulesEditorList(), ModulesEditorListProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModuleDefinition, ModulesScreen(), ModulesConfigState (+4 more)

### Community 36 - "index.ts"
Cohesion: 0.09
Nodes (36): TrendingDownIcon, AcAccountTilesProps, AccountTile(), TileDef, AcBalanceCardProps, McAnimatedCounter(), McPressable(), McWeekBars() (+28 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.09
Nodes (25): CreateInventoryItemInput, useMobileQuickReceive(), MobileAssignAssetResult, MobileRelocateResult, MobileWarehouseLocation, useMobileWarehouseLocations(), useMobileStockAdjust(), inventoryQueryKey() (+17 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.16
Nodes (23): OAuthProvider, ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), isAppleSignInCancellation() (+15 more)

### Community 39 - "rhythm"
Cohesion: 0.14
Nodes (14): catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery(), quickCategories, recentlyViewedEngines (+6 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.09
Nodes (27): ordersSpring, ordersTimeline, COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBar(), ComposerTabBarProps, ComposerTabOption (+19 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.22
Nodes (13): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+5 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.15
Nodes (13): MapPinIcon, InventoryCard, InventoryCardProps, LocationBadge, LocationBadgeProps, StockBadge, StockBadgeProps, VINBadge (+5 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.14
Nodes (23): PushRegistrationHead(), registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken(), fetchExpoPushTokenViaExperienceId() (+15 more)

### Community 44 - "index.ts"
Cohesion: 0.16
Nodes (11): CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, fontMap, radiusMap, sizeMap, SettingsLinkRow, OrganizationMembershipRow (+3 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.11
Nodes (21): AuthProviderKind, badgeSize, monogramFontSize, UserAvatar(), UserAvatarProps, UserAvatarSize, Button, McHeader() (+13 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.05
Nodes (91): parseFeature(), PaywallRoute(), IconProps, AlertTriangleIcon, BarChart3Icon, CheckCircle2Icon, CheckIcon, ChevronDownIcon (+83 more)

### Community 47 - "inventory.ts"
Cohesion: 0.15
Nodes (21): AuthenticatedLandingScreen(), WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, useActiveCompanyName(), useEntitlement(), UseEntitlementResult, useFeatureGate(), useNotificationPreferences() (+13 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.08
Nodes (25): @autocore/avatars, @autocore/org, expo-constants, expo-router, nativewind, dependencies, @autocore/avatars, @autocore/org (+17 more)

### Community 50 - "index.ts"
Cohesion: 0.10
Nodes (32): allStoreSkus(), skuForPlan(), CODE_MAP, failure(), MESSAGES, readErrorCode(), toPurchaseFailure(), connect() (+24 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.11
Nodes (31): AppProviders(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, clearRealtimeSnapshots(), clearRealtimeSubscriptions(), clearRecentQueriesCache(), clearSessionSnapshot(), readSessionSnapshot() (+23 more)

### Community 52 - "types.ts"
Cohesion: 0.14
Nodes (11): HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs, InlineAutocompleteRow, InlineAutocompleteRowProps (+3 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.12
Nodes (18): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButton() (+10 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.16
Nodes (25): useNotificationInboxRealtime(), mobileGet(), backfillTeamNotifications(), fetchNotificationInbox(), fetchNotificationPreferences(), InboxResponse, markAllNotificationsRead(), markNotificationState() (+17 more)

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.09
Nodes (31): EllipsisIcon, presentNativeMenu(), OrderClaimSection(), OrderClaimSectionProps, LineRow(), OrderLine, OrderLinesList(), OrderLinesListProps (+23 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.13
Nodes (16): ExternalLinkIcon, TeamInvitePresentOptions, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS, TeamEmployeeCard, TeamEmployeeCardProps (+8 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.07
Nodes (39): AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, CoAmountField(), CoCard(), CoCardProps, CoSection(), CoSectionProps (+31 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.15
Nodes (19): isValidEmail(), LoginScreen(), readInviteCompanyName(), readInviteEmail(), readInviteToken(), storePendingInvite(), getRecentQueriesCache(), hydrateSearchIdleCache() (+11 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.10
Nodes (30): useAuth(), AuthShell(), ForgotPasswordScreen(), isValidEmail(), Input, ProfileNameJourneyScreen(), VerifyEmailJourneyScreen(), CompanyJourneyScreen() (+22 more)

### Community 61 - "ScanService"
Cohesion: 0.16
Nodes (16): scanPayloadKey(), disambiguateScanPayload(), pickScanCandidate(), resolveScanPayload(), resolveScanPhoto(), ScanServiceDeps, acceptsCameraInput(), activeResultForOutcome() (+8 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.12
Nodes (23): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, workspaceImport(), AuthLoadingScreen() (+15 more)

### Community 63 - "include"
Cohesion: 0.08
Nodes (25): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+17 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.22
Nodes (11): assertValidPayload(), createFinancialOperation(), CreatePayload, createTypedFinancialOperation(), FinancialOperationRepository, FinancialOperationsFilters, mapOperation(), readAmount() (+3 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.07
Nodes (44): smoothEase, staggerDelay(), withAlpha(), animationSpeed, borderStyle(), buttonHeight, A11ySlice, designLanguageFromScheme() (+36 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.16
Nodes (14): Can(), CanProps, RequirePermission(), RequirePermissionProps, buildWeekBars(), formatMoney(), MyEarningsScreen(), MyEarningsScreenProps (+6 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.15
Nodes (12): AuthBootLoadingProps, SPLASH_TO_LOGIN_SCALE, AuthLoadingScreenProps, AuthSplashSurface(), AuthSplashSurfaceProps, enterEase, exitEase, riseEase (+4 more)

### Community 68 - "document-import-screen.tsx"
Cohesion: 0.27
Nodes (6): kindLabel(), LocationContentsResponse, LocationScreen(), StatPill(), buildLocationEntityLink(), fetchLocationContentsFromFirestore()

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.18
Nodes (19): hasShelfValue(), isEngine(), SearchEngineCard(), SearchEngineCardProps, formatVin(), inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode() (+11 more)

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.17
Nodes (15): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), fetchJsonWithTimeout(), AppleSignInApiPayload, AppleSignInApiResponse (+7 more)

### Community 71 - "mapAuthError"
Cohesion: 0.21
Nodes (9): DocumentImportScreen(), ScanDocumentUploadResult, uploadScanDocument(), DocumentImportJobStatus, DocumentImportUploadResult, getDocumentImportStatus(), pollDocumentImportUntilSettled(), uploadDocumentImport() (+1 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.16
Nodes (21): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, InputField (+13 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "composer-utils.ts"
Cohesion: 0.11
Nodes (17): body, callout, caption1, caption2, fontFamily, fontWeight, footnote, headline (+9 more)

### Community 75 - "animated-tab-screen.tsx"
Cohesion: 0.08
Nodes (34): PlanOffer, useSubscription(), UseSubscriptionResult, comparePlans(), highestPlan(), PlanAvailability, PlanDescriptor, PLANS (+26 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.24
Nodes (5): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, WarehouseScreen(), useRealtimeReconnect()

### Community 77 - "styles.ts"
Cohesion: 0.23
Nodes (9): ScanLauncherButton(), ScanLauncherButtonProps, PendingScanContext, scanContextStore, ScanContext, ScanInputKind, ScanOrderResult, ScanResolveRequest (+1 more)

### Community 78 - "inline-autocomplete-row.tsx"
Cohesion: 0.18
Nodes (11): ACCOUNTING_DEMO, PERMISSION_GROUPS, AppearanceSettings, DemoPermission, NavItemConfig, PermissionGroupId, ProductModuleConfig, SettingsHubCard (+3 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.18
Nodes (15): TabLayout(), getNavItemHref(), NavItemId, EXPO_TAB_HREFS, isNavItemModuleEnabled(), isNavItemVisible(), NavModuleFlags, resolveInitialTabHref() (+7 more)

### Community 80 - "profile.ts"
Cohesion: 0.08
Nodes (45): AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), useAuthActions() (+37 more)

### Community 81 - "document-import.ts"
Cohesion: 0.21
Nodes (9): useCardLift(), AnalyticsCard, AnalyticsCardProps, DashboardCard(), DashboardCardProps, StatCard(), StatCardProps, StatCardTone (+1 more)

### Community 82 - "modules.ts"
Cohesion: 0.27
Nodes (9): SettingsIcon, AcHeader(), AcHeaderProps, todayLabel(), financeSettingsHref(), FinanceSettingsReturnTo, openFinanceSettings(), OpenFinanceSettingsRouter (+1 more)

### Community 83 - "location-screen.tsx"
Cohesion: 0.13
Nodes (18): FileStackIcon, ShoppingCartIcon, SearchFilters(), SearchFiltersProps, resolveIconColor(), SearchResultRow(), SearchResultRowProps, showStatusBadge() (+10 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.11
Nodes (22): acTimeline, AcAttention(), AcAttentionProps, AttentionCard, AcQuickActions(), AcQuickActionsProps, QuickActionButton, AcTransactions() (+14 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.11
Nodes (17): PrinterIcon, Share2Icon, AcAccountingSkeleton(), TileSkeleton(), AcMotorSaleDocumentsSheet, AcMotorSaleDocumentsSheetProps, AcMotorSaleDocumentsSheetRef, DocAction (+9 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.29
Nodes (9): AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), formSheetScreenOptions(), NavigationPolicy, RouteCategory (+1 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.10
Nodes (19): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Icons, List dialects, Living gallery (+11 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.42
Nodes (8): can(), canEditInventory(), canEditWorkOrders(), canManageEmployees(), canManageSettings(), canViewEmployees(), canViewInventory(), canViewWorkOrders()

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.10
Nodes (32): buildOrderDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType, ERROR_EVENTS, ErrorEventType, FINANCE_EVENTS, FinanceEventType (+24 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.04
Nodes (43): usePressAnimation(), ArrowRightIcon, BellIcon, DownloadIcon, AuthEmailPill(), AuthEmailPillProps, CATEGORY_ICONS, CategoryIcon (+35 more)

### Community 92 - "kv.ts"
Cohesion: 0.18
Nodes (21): Screen(), OrderPickerSheet, SearchIdle(), searchFilters, parseFilter(), SearchScreen(), useInventorySearch(), useCompanyModuleEnabled() (+13 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.19
Nodes (9): resolveInviteHref(), guardedPush(), PushRouter, navigationHrefKey(), stackNavigationGuard, buildImportDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink() (+1 more)

### Community 95 - "invite-accept-screen.tsx"
Cohesion: 0.24
Nodes (8): ImportCamera, ImportCameraHandle, ImportCameraProps, styles, CameraWithLenses, usePreferredMacroLens(), preferIphoneMacroLens(), VIRTUAL_LENS_HINTS

### Community 96 - "useFloatingTabBarInset"
Cohesion: 0.40
Nodes (6): ScreenActionFooter(), ScreenActionFooterProps, useFloatingTabBarInset(), getFloatingTabBarOffset(), getScreenActionScrollInset(), useRegisterAutocompleteChromeInset()

### Community 97 - "order-row.tsx"
Cohesion: 0.09
Nodes (21): APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON, LOGIN_LOCKUP (+13 more)

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.09
Nodes (30): SellMotorSheet, SellMotorSheetProps, SellMotorSheetRef, AutocompleteDataSnapshot, AutocompleteDataStore, EMPTY, useAutocompleteDataStore, AutocompleteDataHead() (+22 more)

### Community 100 - "google-sign-in-button.tsx"
Cohesion: 0.13
Nodes (21): Listener, listeners, resetAppShellReady(), setAppShellReady(), applyNow(), clearScheduledQueryDataApplies(), drainOne(), flushScheduledQueryDataApplies() (+13 more)

### Community 101 - "highlighted-text.tsx"
Cohesion: 0.20
Nodes (12): whTimeline, OPTIONS, WarehouseFilter, WarehouseFilterBar(), WarehouseFilterBarProps, StepperButton, WarehouseItemRow, WarehouseItemRowProps (+4 more)

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+3 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.20
Nodes (18): appendLocalFile(), createLocalFileFormData(), AvatarUploadResult, uploadUserAvatar(), sendEmployeeInviteEmail(), SendEmployeeInviteResult, SendInviteApiResponse, getApiBaseUrl() (+10 more)

### Community 105 - "financial-operation-repository.ts"
Cohesion: 0.31
Nodes (6): VersionSettingsScreen(), formatPlatformPhone(), getPlatformContacts(), PlatformContacts, readEnv(), openPhone()

### Community 106 - "team-invite-card.tsx"
Cohesion: 0.04
Nodes (47): BoxIcon, ChevronRightIcon, IconName, iconRegistry, HorizontalFilterBar(), HorizontalFilterBarProps, HorizontalFilterOption, TabLayout (+39 more)

### Community 107 - "relocate-pending-store.ts"
Cohesion: 0.29
Nodes (6): Jumping to a specific state, Native build required, Products without App Store Connect, Running the subscription system in development, Safety, What the simulator does not fake

### Community 108 - "purchase-store.ts"
Cohesion: 0.12
Nodes (17): ButtonShape, ButtonSize, ButtonVariant, buildNativeButtonModifiers(), mapBorderShape(), mapButtonStyle(), mapControlSize(), SwiftButtonStyle (+9 more)

### Community 109 - "Autocore Mobile"
Cohesion: 0.22
Nodes (8): Autocore Mobile, Design system first, Getting started, Next steps, Project structure, Stack, Theme tokens, UI library

### Community 110 - "use-search-idle-data.ts"
Cohesion: 0.40
Nodes (9): ADVANCE_KEYWORDS, AdvanceDirection, appendAdvanceMarker(), buildAdvanceSnapshot(), filterAdvanceOperations(), isAdvanceOperation(), isAdvancePaid(), isAdvanceReceived() (+1 more)

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.14
Nodes (18): ScanSearchIcon, PageHeader(), ProfileHeader(), searchSpring, searchTimeline, useSearchEnter(), SearchBar(), SearchBarProps (+10 more)

### Community 113 - "advances.ts"
Cohesion: 0.16
Nodes (25): DevSubscriptionPanel(), readDevOffline(), SyncState, DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS, DevScenario, DevScenarioId (+17 more)

### Community 114 - "team-employee-card.tsx"
Cohesion: 0.38
Nodes (8): AnimatedPolyline, buildPoints(), estimatePathLength(), McAnimatedSparkline(), McAnimatedSparklineProps, buildSparklinePoints(), normalizeSparkline(), sanitizeChartSeries()

### Community 115 - "metro.config.js"
Cohesion: 0.33
Nodes (5): config, { getDefaultConfig }, path, sharedPackages, { withNativeWind }

### Community 116 - "invite-code.ts"
Cohesion: 0.83
Nodes (3): generateInviteCode(), generateInviteToken(), pickFromAlphabet()

### Community 117 - "with-ios-universal-links.js"
Cohesion: 0.67
Nodes (3): isUniversalLinksEnabled(), { withEntitlementsPlist }, withIosUniversalLinks()

### Community 120 - "types.ts"
Cohesion: 0.22
Nodes (16): CachedRealtimeSnapshot, flushOneWrite(), isFresh(), lastDataJsonByKey, memoryCache, PendingWrite, pendingWrites, persistSnapshot() (+8 more)

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.03
Nodes (84): useShimmer(), CopyIcon, TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize, ActionIconButtonVariant, ICON_SIZES (+76 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.22
Nodes (8): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, WORK_ORDER_STATUSES

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.42
Nodes (8): mobilePost(), acceptInviteByCode(), deleteOrganization(), leaveOrganization(), removeMemberFromCompany(), resendInvite(), revokeInvite(), setMemberActive()

### Community 140 - "use-work-order-composer-options.ts"
Cohesion: 0.25
Nodes (6): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore

### Community 141 - "expo-auth-session"
Cohesion: 0.29
Nodes (14): EMPTY, useAccountingPreferences(), useUserDisplayCurrency(), normalizeAppDisplayCurrency(), AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings(), patchAccountingSettings() (+6 more)

### Community 150 - "organization-switch-button.tsx"
Cohesion: 0.29
Nodes (5): GripVerticalIcon, NavEditorRowProps, NavigationEditorList(), NavigationEditorListProps, NAV_ITEM_DEFINITIONS

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.19
Nodes (15): TeamRoleCard, TeamRoleCardProps, buildInviteJoinUrl(), firstParam(), getInviteStatus(), mapEmployeeError(), TeamScreen(), TeamTab (+7 more)

### Community 199 - "notification-bell-button.tsx"
Cohesion: 0.14
Nodes (19): stripUndefinedDeep(), mergeNotificationPreferences(), MobileApiError, updateNotificationPreferences(), buildPreferencesPayload(), preferencesRef(), saveNotificationPreferences(), subscribeNotificationPreferences() (+11 more)

### Community 201 - "create-icon.tsx"
Cohesion: 0.38
Nodes (5): MarketplaceCard, MarketplaceCardProps, statusTone, PriceCard, PriceCardProps

### Community 202 - "use-notification-preferences.ts"
Cohesion: 0.09
Nodes (29): NotificationBellButton(), ActivityFeedFilters(), ActivityFeedFiltersProps, READ_FILTERS, DateGroup, DateGroupKey, formatNotificationTime(), GROUP_LABELS (+21 more)

### Community 203 - "auth-journey-screens.tsx"
Cohesion: 0.16
Nodes (16): isTabRouteName(), NO_TRANSITION, resolveTabRouteName(), TAB_ORDER, TabRouteName, TabTransitionContext, TabTransitionContextValue, TabTransitionProvider() (+8 more)

### Community 205 - "highlighted-text.tsx"
Cohesion: 0.40
Nodes (5): HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart

### Community 206 - "useFadeIn"
Cohesion: 0.13
Nodes (12): DeviceClass, BreakpointKey, breakpoints, platform, screen, sidebarWidth, { width, height }, productCta (+4 more)

### Community 208 - "sidebar.tsx"
Cohesion: 0.14
Nodes (14): IconButton, IconButtonProps, sizes, GateAction, ScreenGate(), ScreenGateProps, VARIANT_ICON, ScreenProps (+6 more)

### Community 209 - "useScreenEnter"
Cohesion: 0.35
Nodes (11): formatRelativeTime(), loadRecentScans(), mapStored(), mergeRecents(), migrateLegacyIfNeeded(), normalizeStored(), readMmkv(), rememberRecentScan() (+3 more)

### Community 210 - "sidebar.tsx"
Cohesion: 0.40
Nodes (4): INVITE_FILTER_OPTIONS, InviteStatusFilter, TeamInviteStatusFilters(), TeamInviteStatusFiltersProps

### Community 212 - "CollectionSwitchRow"
Cohesion: 0.17
Nodes (18): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES (+10 more)

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.09
Nodes (33): OrderRowSkeleton(), OrderRowSkeletonProps, OrdersLoadingState(), OrdersLoadingStateProps, OrdersLiftProvider(), useOrdersLift(), MailOrderRow(), canMarkCompleted() (+25 more)

### Community 214 - "local-inventory-resolve.ts"
Cohesion: 0.50
Nodes (3): FeatureGate(), TeamProGate(), TeamProGateProps

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.10
Nodes (21): CollectionRow, ListSection(), ProfileScreenShell(), ProfileScreenShellProps, profileRouteHref(), SETTINGS_ROUTES, settingsRouteHref(), AdvancedScreen() (+13 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.13
Nodes (17): AcAdvancesOverview(), AcAdvancesOverviewProps, AdvanceRow(), AcPayrollList(), AcPayrollListProps, PayrollRow(), PayrollStatusBadge(), statusColors() (+9 more)

### Community 218 - "invite-service.ts"
Cohesion: 0.13
Nodes (18): hasEstablishedWorkspace(), HydrationPayload, SessionHydrationPayload, WorkspaceAccessCopy, createCompanyInvite(), CreateInviteApiResponse, mapInviteDoc(), subscribeCompanyInvites() (+10 more)

### Community 221 - "priority-router.ts"
Cohesion: 0.22
Nodes (8): DeliveryChannels, isServerCategoryEnabled(), PRIORITY_BASE, resolveDeliveryChannels(), resolveLiveEditingChannels(), resolveSyncChannels(), CategoryChannelPrefs, ExtendedCategoryPreferences

### Community 222 - "recent-scans.ts"
Cohesion: 0.04
Nodes (84): ArrowLeftIcon, OrdersSummary(), OrdersSummaryProps, scanSheetAnimationConfigs, scanSpring, AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES (+76 more)

### Community 223 - "useScreenEnter"
Cohesion: 0.21
Nodes (9): useScreenEnter(), OrdersEnterConfig, useOrdersEnter(), OrdersFilters(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter() (+1 more)

### Community 227 - "engine-status.tsx"
Cohesion: 0.43
Nodes (6): createDirectoryPerson(), directoryCollection(), mapDirectoryPerson(), markDirectoryPersonInvited(), subscribeCompanyDirectory(), DirectoryPersonStatus

### Community 228 - "mock-scan-registry.ts"
Cohesion: 0.15
Nodes (22): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload(), charValue(), findVinInCodes(), findVinInText() (+14 more)

### Community 229 - "scan-top-bar.tsx"
Cohesion: 0.32
Nodes (5): AnimatedIconWrapper, createIcon(), IconState, IconSize, iconSizes

### Community 232 - "gradients.ts"
Cohesion: 0.11
Nodes (31): ScanUnknownSheetContent(), sheetPresentationKey(), useDevMockFallback(), useScanExperience(), classifyScanPayload(), ENTITY_PREFIXES, hasValidEanChecksum(), isHttpUrl() (+23 more)

### Community 233 - "@autocore/billing"
Cohesion: 0.09
Nodes (23): CollectionList(), CollectionListProps, CollectionRowProps, CollectionSwitchRowProps, pressTiming, SwipeableRow(), SwipeAction, IosLiftMenu() (+15 more)

## Knowledge Gaps
- **1096 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1091 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `text.tsx` to `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `index.ts`, `index.ts`, `index.ts`, `order-detail-screen.tsx`, `notification-service.ts`, `getJson`, `organization-switch-button.tsx`, `notifications-settings-screen.tsx`, `currency-screen.tsx`, `types.ts`, `haptics`, `index.ts`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `types.ts`, `push-channel.ts`, `autocomplete-provider.tsx`, `scan-service.ts`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `ac-payroll-list.tsx`, `mapAuthError`, `input-field.tsx`, `use-notification-preferences.ts`, `styles.ts`, `highlighted-text.tsx`, `subscription-screen.tsx`, `sidebar.tsx`, `document-import.ts`, `modules.ts`, `location-screen.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `ScanDebounce`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `CollectionSwitchRow`, `search-engine-card.tsx`, `app-loading-screen.tsx`, `kv.ts`, `recent-scans.ts`, `invite-accept-screen.tsx`, `useFloatingTabBarInset`, `order-row.tsx`, `useScreenEnter`, `copy-button.tsx`, `highlighted-text.tsx`, `@autocore/billing`, `team-invite-card.tsx`, `diagnostics-settings-screen.tsx`, `advances.ts`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `Text` connect `text.tsx` to `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `index.ts`, `index.ts`, `order-detail-screen.tsx`, `notification-service.ts`, `getJson`, `organization-switch-button.tsx`, `notifications-settings-screen.tsx`, `useReducedMotion`, `useAuth`, `currency-screen.tsx`, `types.ts`, `mc-featured-insight.tsx`, `haptics`, `index.ts`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `types.ts`, `push-channel.ts`, `autocomplete-provider.tsx`, `scan-service.ts`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `ac-payroll-list.tsx`, `input-field.tsx`, `create-icon.tsx`, `use-notification-preferences.ts`, `styles.ts`, `highlighted-text.tsx`, `sidebar.tsx`, `document-import.ts`, `modules.ts`, `location-screen.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `CollectionSwitchRow`, `app-loading-screen.tsx`, `tab-transition-context.tsx`, `in-app-banner-provider.tsx`, `search-engine-card.tsx`, `kv.ts`, `recent-scans.ts`, `invite-accept-screen.tsx`, `order-row.tsx`, `copy-button.tsx`, `highlighted-text.tsx`, `@autocore/billing`, `team-invite-card.tsx`, `diagnostics-settings-screen.tsx`, `advances.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `haptics` connect `search-engine-card.tsx` to `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `text.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `index.ts`, `index.ts`, `Text`, `getJson`, `organization-switch-button.tsx`, `notifications-settings-screen.tsx`, `useReducedMotion`, `currency-screen.tsx`, `types.ts`, `mc-featured-insight.tsx`, `haptics`, `index.ts`, `scan-product-sheet.tsx`, `order-composition-step.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `types.ts`, `push-channel.ts`, `autocomplete-provider.tsx`, `scan-service.ts`, `startup-tracer.ts`, `login-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `ac-payroll-list.tsx`, `input-field.tsx`, `use-notification-preferences.ts`, `styles.ts`, `sidebar.tsx`, `modules.ts`, `location-screen.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `recent-scans.ts`, `copy-button.tsx`, `highlighted-text.tsx`, `gradients.ts`, `@autocore/billing`, `team-invite-card.tsx`, `purchase-store.ts`, `diagnostics-settings-screen.tsx`, `advances.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1096 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07343987823439878 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09333333333333334 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08446455505279035 - nodes in this community are weakly interconnected._