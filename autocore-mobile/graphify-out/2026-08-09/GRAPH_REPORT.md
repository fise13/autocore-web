# Graph Report - autocore-mobile  (2026-08-08)

## Corpus Check
- 936 files · ~369,378 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4667 nodes · 15082 edges · 229 communities (164 shown, 65 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 72 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `070cc6dd`
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
- mobilePost
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
- location-contents.ts
- order-row.tsx
- package.json
- copy-button.tsx
- google-sign-in-button.tsx
- appearance-settings-screen.tsx
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
- @autocore/billing
- global.d.ts
- @gorhom/bottom-sheet
- lucide-react-native
- react-dom
- react-native
- @react-native-async-storage/async-storage
- @react-native-community/datetimepicker
- @react-native-community/netinfo
- team-invite-card.tsx
- @react-native-google-signin/google-signin
- react-native-mmkv
- react-native-nitro-modules
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
- use-notification-preferences.ts
- auth-journey-screens.tsx
- expo-image-picker
- useFadeIn
- useScreenEnter
- app-loading-screen.tsx
- local-inventory-resolve.ts
- in-app-banner-provider.tsx
- tab-transition-context.tsx
- orders-mail-list.ios.tsx
- @autocore/rbac
- priority-router.ts
- useScreenEnter
- order-transition-context.tsx
- use-accessibility.ts
- expo-blur
- intake-evidence-checklist.tsx
- gradients.ts
- @autocore/org
- expo-auth-session
- expo-constants
- expo-router
- react-dom
- @react-native-community/netinfo
- react-native-gesture-handler
- @react-native-google-signin/google-signin
- react-native-keyboard-controller
- react-native-safe-area-context
- NATIVE_TAB_BAR_HEIGHT

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 482 edges
2. `Text` - 244 edges
3. `haptics` - 152 edges
4. `useReducedMotion()` - 110 edges
5. `useSession()` - 106 edges
6. `rhythm` - 96 edges
7. `tokens` - 96 edges
8. `getFirebaseDb()` - 92 edges
9. `spacing` - 77 edges
10. `normalizeCompanyId()` - 67 edges

## Surprising Connections (you probably didn't know these)
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  animations/presets.ts → hooks/use-accessibility.ts
- `TabLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/_layout.tsx → hooks/use-theme.tsx
- `useAuthActionsController()` --indirect_call--> `user()`  [INFERRED]
  authentication/auth-provider.tsx → lib/shell/workspace-registry.test.ts
- `DrawablePath()` --calls--> `useTheme()`  [EXTRACTED]
  components/brand/app-loading-logo.tsx → hooks/use-theme.tsx
- `AppLoadingLogoStatic()` --calls--> `useTheme()`  [EXTRACTED]
  components/brand/app-loading-logo.tsx → hooks/use-theme.tsx

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`

## Communities (229 total, 65 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.09
Nodes (22): PhoneIcon, ordersSpring, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), OrderCard, OrderCardProps, SF (+14 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.09
Nodes (22): CameraIcon, ChevronRightIcon, IconName, iconRegistry, FlashList, OptimizedListProps, useListStaggerDelay(), SettingsLinkRow (+14 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.08
Nodes (52): planById(), isDevModeAvailable(), scenarioForPlan(), clearEntitlementCaches(), peekEntitlement(), asPurchaseFailure(), isCancellation(), isPurchaseFailure() (+44 more)

### Community 3 - "text.tsx"
Cohesion: 0.04
Nodes (49): FilterIcon, SearchIcon, XIcon, AuthDivider(), normalizeCode(), VerificationCodeInput(), VerificationCodeInputProps, TabScreenPlaceholder() (+41 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.13
Nodes (20): PlanOffer, useSubscription(), UseSubscriptionResult, PlanDescriptor, getPurchaseStoreSnapshot(), subscribePurchaseStore(), describeIntroOffer(), describeTrialOffer() (+12 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (40): ScreenEnterConfig, useFadeIn(), usePageEnter(), useScaleEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps, enterValues (+32 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.06
Nodes (55): AutocompleteInput, FormListRow(), FormListSplitRow(), GroupedList(), GroupedSection(), CreateOrderScreen(), SheetNavButton(), SummaryRow() (+47 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.09
Nodes (30): OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), SourceLayout, useOrderTransition(), OrderRow, OrderRowBody(), OrderRowProps (+22 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.18
Nodes (16): HomeRoute(), getStartupMarks(), logStartupTable(), MarkEntry, marks, markStartup(), StartupMark, hydrateOne() (+8 more)

### Community 9 - "index.ts"
Cohesion: 0.12
Nodes (18): ProfileHeader(), PROFILE_ROUTES, profileHubRouteHref(), ProfileHubRow, ProfileScreen(), ProfileDangerAction, ProfileHubData, ProfileHubRouteId (+10 more)

### Community 10 - "index.ts"
Cohesion: 0.10
Nodes (37): OrderDocumentsSection(), SearchScreen(), clientRepository, useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useEmployeesRealtime(), useInventoryCatalog() (+29 more)

### Community 11 - "index.ts"
Cohesion: 0.20
Nodes (12): ScanSearchIcon, searchSpring, searchTimeline, useSearchEnter(), SearchBar(), SearchBarProps, SearchGroupHeader(), SearchGroupHeaderProps (+4 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.21
Nodes (18): EMPTY_JOB_DETAIL, JobDetailState, jobsCacheKey(), JobsState, useEngineIntakeJobDetail(), engineIntakeJobDocument(), mapAssignment(), mapEvent() (+10 more)

### Community 14 - "index.ts"
Cohesion: 0.13
Nodes (23): useEntitlement(), useEntitlementFor(), UseEntitlementResult, CachedEntitlement, acquireEntitlement(), clearEntitlementRegistry(), clearSettleTimer(), EntitlementSnapshot (+15 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.09
Nodes (26): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+18 more)

### Community 16 - "useTheme"
Cohesion: 0.17
Nodes (21): formatRelativeNow(), averageOfPoints(), buildWeeklyClosedCounts(), closedCountInRange(), insightChartIsUseful(), startOfDay(), WEEK_LABELS, OverviewBody() (+13 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.17
Nodes (29): HomeDashboard, useHomeDashboard(), ACTIVE_INTAKE, buildAiInsight(), buildAttentionRows(), buildHomeNow(), buildHomeToday(), buildHomeTrend() (+21 more)

### Community 18 - "Text"
Cohesion: 0.44
Nodes (9): PendingAdd, useAddToOrderFlow(), CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart(), navigateOrderEdit() (+1 more)

### Community 19 - "radius"
Cohesion: 0.08
Nodes (44): scanSheetAnimationConfigs, ScanCandidatesSheet, ScanCandidatesSheetProps, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanDocumentSheet, ScanDocumentSheetProps, ScanLauncherButton() (+36 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.04
Nodes (56): AlertTriangleIcon, ScreenActionFooter(), ScreenActionFooterProps, AlertProps, AlertVariant, AvatarFallback(), AvatarProps, AvatarSize (+48 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.12
Nodes (18): getOAuthButtonTheme(), OAuthButtonTheme, AccentColorId, resolveScheme(), ThemeProvider(), base(), ACCENT_PALETTE, applyAccentToColors() (+10 more)

### Community 22 - "getJson"
Cohesion: 0.06
Nodes (65): CompanyEmployeeRow, useCompanyEmployees(), useCompanyProfile(), useWorkspaceAccessRealtime(), CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), normalizeCompanyId() (+57 more)

### Community 23 - "types.ts"
Cohesion: 0.10
Nodes (29): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), useModulesConfigStore, MODULE_KEY_TO_PRODUCT, useProductModuleEnabled(), BUSINESS_PRESETS, BusinessPresetId (+21 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.07
Nodes (44): NotFoundScreen(), ActivityIcon, ImagesIcon, ActivityCard, ActivityCardProps, AnalyticsCard, AnalyticsCardProps, BusinessCardShell() (+36 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.12
Nodes (41): useAccountingData(), UseAccountingDataResult, AccountingAttentionAction, AttentionTone, CashFlowPeriod, InvoiceStatus, TransactionStatus, TrendTone (+33 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.08
Nodes (34): AccountingScreen(), AcAccountTiles, AcAccountingEmptyState(), AcAccountingEmptyStateProps, AcBalanceCard, AcMotorSaleDocumentsSheet, AcMotorSaleDocumentsSheetRef, AcOperationsList() (+26 more)

### Community 27 - "useAuth"
Cohesion: 0.05
Nodes (61): ActionRoute(), TabLayout(), ActionSheetHost(), styles, AutocoreDock, AiActionBlock, AiConfirmationBlock, AiMetricBlock (+53 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.13
Nodes (21): CATEGORY_HINTS, NotificationsSettingsScreen(), useNotificationInbox(), stripUndefinedDeep(), mergeNotificationPreferences(), buildPreferencesPayload(), preferencesRef(), saveNotificationPreferences() (+13 more)

### Community 29 - "paywall.tsx"
Cohesion: 0.13
Nodes (16): OrderStatusBadge(), OrderWorkflowProgress(), OrderWorkflowProgressProps, orderStatusLabel, resolveStatusInk(), StatusEmphasis, StatusInk, getWorkflowStages() (+8 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.14
Nodes (24): useRealtimeReconnect(), useSessionBootstrapReady(), clearScheduledQueryDataApplies(), clearRealtimeSnapshots(), acquireRealtimeSubscription(), applyCachedSnapshot(), areAcquiredSessionListenersReady(), areInteractiveSessionReady() (+16 more)

### Community 31 - "types.ts"
Cohesion: 0.11
Nodes (31): IosLiftMenuProps, styles, MenuItem, MenuProps, StyleSheetFill, ObjectSection, ObjectShellProps, resolveHomeAccent() (+23 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.07
Nodes (54): parseFeature(), PaywallRoute(), ArrowRightIcon, ArrowUpRightIcon, BarChart3Icon, BellIcon, CarIcon, ChevronsUpDownIcon (+46 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.12
Nodes (28): DocumentAction, OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile(), ensureWarrantyPdfFile() (+20 more)

### Community 34 - "haptics"
Cohesion: 0.08
Nodes (28): DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus, ImportSuccessView() (+20 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.20
Nodes (10): BoxIcon, ModulesEditorList(), ModulesEditorListProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModuleDefinition, ModulesScreen() (+2 more)

### Community 36 - "index.ts"
Cohesion: 0.15
Nodes (22): CurrencyScreen(), useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS, AppDisplayCurrency, appDisplayCurrencyAffix() (+14 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.10
Nodes (25): StepperButton, WarehouseItemRowProps, CreateInventoryItemInput, useMobileQuickReceive(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), resolveInventoryShelf() (+17 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.13
Nodes (25): CachedSubscription, date(), deserialize(), iso(), readEntitlementCache(), readEntitlementCacheSync(), serialize(), SerializedSubscription (+17 more)

### Community 39 - "rhythm"
Cohesion: 0.15
Nodes (15): SearchFilters(), SearchFiltersProps, CATEGORY_ICONS, SearchIdleProps, SellMotorSheet, SellMotorSheetRef, searchFilters, parseFilter() (+7 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.11
Nodes (24): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBar(), ComposerTabBarProps, ComposerTabOption, TabIcon, ComposerTabPanel() (+16 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.08
Nodes (32): StaticTabScreen, isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload(), classifyDocument(), DocumentClass (+24 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.07
Nodes (28): GripVerticalIcon, NavEditorRowProps, NavigationEditorList(), NavigationEditorListProps, ACCOUNTING_DEMO, PERMISSION_GROUPS, NAV_ITEM_DEFINITIONS, DemoPermission (+20 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.13
Nodes (24): getString(), MobileApiError, registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken() (+16 more)

### Community 44 - "index.ts"
Cohesion: 0.08
Nodes (26): ChartPoint, LineChart, LineChartProps, formatCounter(), formatGroupedInteger(), McAnimatedCounter(), McAnimatedCounterProps, McCounterFormat (+18 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.10
Nodes (24): PrinterIcon, AcMotorSaleDocumentsSheetProps, DocAction, AcOperationsListProps, OperationRow, typeBadgeColors(), AcPayrollListProps, PayrollRow() (+16 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.07
Nodes (61): IconProps, CheckCircle2Icon, CheckIcon, ClockIcon, CloudIcon, LockIcon, FeatureGateProps, FeatureLockedCard() (+53 more)

### Community 47 - "inventory.ts"
Cohesion: 0.21
Nodes (18): WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, SubscriptionStatusCard(), SubscriptionStatusCardProps, TrialCountdown(), TrialCountdownProps, daysUntil(), formatDaysRemaining() (+10 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.07
Nodes (27): @autocore/domain-search, @autocore/rbac, expo-camera, expo-device, firebase, nativewind, dependencies, @autocore/domain-search (+19 more)

### Community 50 - "index.ts"
Cohesion: 0.10
Nodes (32): allStoreSkus(), skuForPlan(), CODE_MAP, failure(), MESSAGES, readErrorCode(), toPurchaseFailure(), connect() (+24 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.11
Nodes (28): AppProviders(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, queryClient, getRecentQueriesCache(), hydrateSearchIdleCache(), readRecentSearchQueries(), rememberSearchQuery() (+20 more)

### Community 52 - "types.ts"
Cohesion: 0.08
Nodes (21): AttentionRow(), McAttentionBanner, McAttentionBannerProps, McTodayOverview, McTodayOverviewProps, TodayCell, OverviewScreen(), ActivityCategory (+13 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.12
Nodes (25): CANONICAL, HomeLayoutInput, isPresent(), pickLead(), resolveHomeLayout(), shellAllows(), activity, ALL_SECTIONS (+17 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.27
Nodes (16): markAllNotificationsRead(), markNotificationState(), fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord(), markAllInboxNotificationsRead(), subscribeInboxFromFirestore() (+8 more)

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.12
Nodes (18): EllipsisIcon, OrderClaimSection(), OrderStatusMoreSheet, OrderStatusMoreSheetRef, formatOrderVehicleLine(), footerStatusIcon(), footerStatusLabel(), HeaderTextButton() (+10 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.17
Nodes (23): applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems(), paginateItems() (+15 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.09
Nodes (33): CoCard(), CoCardProps, CoSection(), CoSectionProps, CoToggleRow(), BUILTIN_CATEGORY_SUGGESTIONS, CreateOperationScreen(), parseAmountInput() (+25 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.07
Nodes (40): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, useAuthPressSpring() (+32 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.15
Nodes (13): CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), Listener, listeners, resetAppShellReady(), setAppShellReady(), getStartupSummary() (+5 more)

### Community 61 - "ScanService"
Cohesion: 0.12
Nodes (25): mapApiResolve(), resolveBarcodePayload(), PendingScanContext, scanContextStore, disambiguateScanPayload(), pickScanCandidate(), resolveScanPayload(), resolveScanPhoto() (+17 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.07
Nodes (47): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, workspaceImport(), useAuthHasAccess() (+39 more)

### Community 63 - "include"
Cohesion: 0.07
Nodes (27): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+19 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.15
Nodes (21): finalizeEngineIntakePhoto(), prepareEngineIntakePhoto(), sendEngineIntakeCommand(), buildSnapshot(), commandFailureBlocksJob(), drain(), errorMessage(), getSnapshot() (+13 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.08
Nodes (41): Bone(), withAlpha(), animationSpeed, borderStyle(), buttonHeight, A11ySlice, designLanguageFromScheme(), cornerStyle (+33 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.15
Nodes (15): Can(), CanProps, RequirePermission(), RequirePermissionProps, buildWeekBars(), formatMoney(), MyEarningsScreen(), MyEarningsScreenProps (+7 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.11
Nodes (18): APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON, LOGIN_LOCKUP (+10 more)

### Community 68 - "mobilePost"
Cohesion: 0.06
Nodes (49): useAuth(), useAuthActions(), AuthShell(), AuthenticatedLandingScreen(), ForgotPasswordScreen(), isValidEmail(), ProfileNameJourneyScreen(), VerifyEmailJourneyScreen() (+41 more)

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.24
Nodes (7): profileSpring, profileTimeline, profileLayout, scanSpring, scanTimeline, screenMotion, ScreenTokens

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.14
Nodes (12): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, kindLabel(), LocationContentsResponse (+4 more)

### Community 71 - "mapAuthError"
Cohesion: 0.05
Nodes (75): AutocompleteOverlay, AutocompleteOverlayProps, DockPanelProps, HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps (+67 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.24
Nodes (14): InputField, InputFieldProps, InputFieldTone, InputProps, SearchInput, SearchInputProps, TextArea, TextAreaProps (+6 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "composer-utils.ts"
Cohesion: 0.11
Nodes (17): body, callout, caption1, caption2, fontWeight, footnote, headline, identifier (+9 more)

### Community 75 - "animated-tab-screen.tsx"
Cohesion: 0.21
Nodes (16): comparePlans(), highestPlan(), PlanAvailability, planForSku(), PLANS, TIER_RANK, isCacheTrustworthy(), fromLocal() (+8 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.20
Nodes (16): buildWeekRevenueBars(), computeMonthRevenueGrowth(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), resolveOverviewRevenue() (+8 more)

### Community 77 - "styles.ts"
Cohesion: 0.05
Nodes (52): FlashlightIcon, AnimatedLine, AuthHeroCar(), FRONT_WHEEL, HERO_DISPLAY_HEIGHT, HERO_DISPLAY_WIDTH, REAR_WHEEL, SPEED_LINES (+44 more)

### Community 78 - "inline-autocomplete-row.tsx"
Cohesion: 0.36
Nodes (10): hasShelfValue(), isEngine(), SearchEngineCard(), SearchEngineCardProps, formatVin(), inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode() (+2 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.19
Nodes (18): reviveDatesDeep(), shouldReviveDateField(), CachedRealtimeSnapshot, flushOneWrite(), isFresh(), lastDataJsonByKey, memoryCache, PendingWrite (+10 more)

### Community 80 - "profile.ts"
Cohesion: 0.05
Nodes (74): OAuthProvider, AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore() (+66 more)

### Community 81 - "document-import.ts"
Cohesion: 0.17
Nodes (12): ArrowLeftIcon, PlusIcon, FinanceSettingsScreen(), ListPanelProps, listsEqual(), normalizeList(), financeSettingsHref(), FinanceSettingsReturnTo (+4 more)

### Community 82 - "modules.ts"
Cohesion: 0.15
Nodes (13): catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery(), quickCategories, recentlyViewedEngines (+5 more)

### Community 83 - "location-screen.tsx"
Cohesion: 0.20
Nodes (15): applyNow(), drainOne(), flushScheduledQueryDataApplies(), getMsSinceLastCatalogApply(), getPendingQueryDataApplyCount(), hasSeenCatalogApply(), keyOf(), markCatalogApplyNow() (+7 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.07
Nodes (48): TrendingDownIcon, acTimeline, AcAccountTilesProps, AccountTile(), TileDef, AcAdvancesOverview(), AcAdvancesOverviewProps, AdvanceRow() (+40 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.16
Nodes (10): NotificationCard, ActivityNotificationRow, ActivityNotificationRowProps, SwipeActionProps, DateGroup, DateGroupKey, formatNotificationTime(), GROUP_LABELS (+2 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.25
Nodes (10): ObjectsLayout(), AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), formSheetScreenOptions(), NavigationPolicy (+2 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.09
Nodes (22): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Dynamic Island (iOS Live Activities), Floating dock, Home (Mission Control) (+14 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.31
Nodes (8): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, form

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.11
Nodes (26): resolveInviteHref(), buildImportDeepLink(), buildOrderDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType (+18 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.21
Nodes (12): groupNotificationsByDate(), NotificationInboxScreen(), isSameStackInboxReturn(), notificationInboxHref(), NotificationInboxReturnTo, OpenInboxRouter, openNotificationInbox(), resolveInboxReturnToFromSegments() (+4 more)

### Community 92 - "kv.ts"
Cohesion: 0.13
Nodes (15): OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, whTimeline, OPTIONS, WarehouseFilter, WarehouseFilterBar(), WarehouseFilterBarProps (+7 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.13
Nodes (29): ScreenGate(), IntakeCamera, IntakeCameraHandle, IntakeCaptureDock(), IntakeCreateSerialSheet, IntakeCreateSerialSheetRef, ACTIVE_STATES, BayFilter (+21 more)

### Community 95 - "invite-accept-screen.tsx"
Cohesion: 0.14
Nodes (19): AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES (+11 more)

### Community 96 - "location-contents.ts"
Cohesion: 0.12
Nodes (17): OrdersFilterMenu(), OrdersFilterMenuItem, OrdersFilterMenuProps, computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters (+9 more)

### Community 97 - "order-row.tsx"
Cohesion: 0.25
Nodes (6): EngineObjectScreen(), ObjectShell(), useSessionQueryData(), MotorAvailability, MotorEntity, MotorStatus

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.10
Nodes (24): Dropdown(), AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, SellMotorSheetProps, assertValidPayload(), createFinancialOperation(), CreatePayload (+16 more)

### Community 100 - "google-sign-in-button.tsx"
Cohesion: 0.20
Nodes (9): CopyIcon, CopyButton, CopyButtonProps, CopyButtonSize, CopyButtonVariant, ICON_SIZES, SIZES, CommonControlledStateProps (+1 more)

### Community 101 - "appearance-settings-screen.tsx"
Cohesion: 0.15
Nodes (8): CollectionSwitchRow, ProfileAnimatedSectionProps, ProfileSegmentedControl(), ProfileSegmentedControlProps, SettingsToggleRowProps, AppearanceSettingsScreen(), THEME_OPTIONS, ThemePreference

### Community 102 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+5 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.24
Nodes (19): assertJsonApiResponse(), getApiBaseUrl(), getBearerToken(), humanizeApiErrorBody(), looksLikeHtmlBody(), mobileFetch(), mobileFetchBlob(), mobileGet() (+11 more)

### Community 105 - "financial-operation-repository.ts"
Cohesion: 0.33
Nodes (9): calendarDaysBetween(), isMotorStale(), isWarehouseLowStock(), warehouseLowStockThreshold(), compactAlphanumeric(), digitsOnly(), matchesSearchQuery(), normalizeSearchQuery() (+1 more)

### Community 106 - "team-invite-card.tsx"
Cohesion: 0.07
Nodes (25): AuthEmailChip(), AuthEmailChipProps, NOTIFICATION_ROW_DIVIDER_INSET, MetaRow(), MetaRowProps, ProgressProps, Segment, SegmentedControlProps (+17 more)

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
Cohesion: 0.36
Nodes (4): guardedPush(), PushRouter, navigationHrefKey(), stackNavigationGuard

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.36
Nodes (5): VersionSettingsScreen(), formatPlatformPhone(), getPlatformContacts(), PlatformContacts, readEnv()

### Community 113 - "advances.ts"
Cohesion: 0.16
Nodes (19): purchasablePlans(), DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS, devDisplayPrice(), devProducts(), DevScenario, DevScenarioId (+11 more)

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
Cohesion: 0.28
Nodes (5): AuthBootLoadingProps, AppLoadingScreen(), AppLoadingScreenProps, Loading(), LoadingProps

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.04
Nodes (71): useCardLift(), useShimmer(), DesignSystemScreen(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize, ActionIconButtonVariant (+63 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.06
Nodes (48): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, AutocompleteDataStore (+40 more)

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.07
Nodes (39): Button, ButtonProps, ButtonShape, ButtonSize, ButtonVariant, CollectionList(), CollectionListProps, CollectionRow (+31 more)

### Community 140 - "use-work-order-composer-options.ts"
Cohesion: 0.43
Nodes (5): IntakeEvidenceChecklist(), Props, evidenceGuidance(), FACET_LABELS, missingEvidenceLabels()

### Community 141 - "expo-auth-session"
Cohesion: 0.29
Nodes (14): EMPTY, useAccountingPreferences(), useUserDisplayCurrency(), normalizeAppDisplayCurrency(), AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings(), patchAccountingSettings() (+6 more)

### Community 146 - "expo-device"
Cohesion: 0.14
Nodes (17): usePressAnimation(), JourneyOptionCard(), JourneyOptionCardProps, HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart (+9 more)

### Community 148 - "expo-haptics"
Cohesion: 0.40
Nodes (5): UsageMeterRow(), UsageMeterRowProps, UsageRing(), UsageRingProps, usageTone()

### Community 157 - "expo-status-bar"
Cohesion: 0.19
Nodes (16): SearchEmptyActionId, SearchEmptyState(), SearchEmptyStateProps, pluralResults(), SearchResults(), SearchResultsProps, AddToOrderHandlers, MotorActionHandlers (+8 more)

### Community 165 - "react-dom"
Cohesion: 0.12
Nodes (13): ListGroup(), ListGroupProps, ListRow, ListRowProps, styles, SurfaceProps, SurfaceVariant, ProfileDangerZone() (+5 more)

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.04
Nodes (79): ExternalLinkIcon, MailIcon, Share2Icon, FeatureGate(), OrganizationMembershipRow, InvitePreviewCard(), TeamInvitePresentOptions, TeamInviteSheet (+71 more)

### Community 202 - "use-notification-preferences.ts"
Cohesion: 0.08
Nodes (33): ActivityFeedFilters(), ActivityFeedFiltersProps, READ_FILTERS, useNotificationService(), DeliveryChannels, isServerCategoryEnabled(), PRIORITY_BASE, resolveDeliveryChannels() (+25 more)

### Community 203 - "auth-journey-screens.tsx"
Cohesion: 0.09
Nodes (24): UserAvatar(), AnimatedTabScreen, AnimatedTabScreenProps, AnimatedPressable, AutocoreDockInner(), styles, isTabRouteName(), NO_TRANSITION (+16 more)

### Community 206 - "useFadeIn"
Cohesion: 0.09
Nodes (17): Loader2Icon, AuthEmailPill(), AuthEmailPillProps, Sidebar(), SidebarItem, SidebarProps, SidebarSection, DeviceClass (+9 more)

### Community 209 - "useScreenEnter"
Cohesion: 0.35
Nodes (11): formatRelativeTime(), loadRecentScans(), mapStored(), mergeRecents(), migrateLegacyIfNeeded(), normalizeStored(), readMmkv(), rememberRecentScan() (+3 more)

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.10
Nodes (35): IosLiftMenuAnchor, IosLiftMenuItem, OrderRowSkeleton(), OrderRowSkeletonProps, OrdersLoadingState(), OrdersLoadingStateProps, OrdersLiftContext, OrdersLiftContextValue (+27 more)

### Community 214 - "local-inventory-resolve.ts"
Cohesion: 0.25
Nodes (8): useFeatureGate(), UseFeatureGateResult, tierRank(), tierSatisfies(), evaluateGate(), FeatureLockedError, featureRule, GateResult

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.17
Nodes (13): presentOrganizationSwitcher(), ProfileScreenShell(), ProfileScreenShellProps, profileRouteHref(), SETTINGS_ROUTES, settingsRouteHref(), AdvancedScreen(), CompanySettingsScreen() (+5 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.05
Nodes (37): HeroBackdrop(), AuthBackdrop(), AuthShellProps, ProgressBar(), InviteFormNotice(), InviteFormNoticeProps, WorkspaceAccessScreen(), DemoModeBanner() (+29 more)

### Community 219 - "orders-mail-list.ios.tsx"
Cohesion: 0.08
Nodes (28): ScanConfirmFlash(), ScanConfirmFlashProps, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanFrameOverlay(), ScanFrameOverlayProps, ScanIdleIndicator() (+20 more)

### Community 223 - "useScreenEnter"
Cohesion: 0.29
Nodes (6): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter(), SearchEnterConfig

### Community 225 - "use-accessibility.ts"
Cohesion: 0.32
Nodes (5): AnimatedIconWrapper, createIcon(), IconState, IconSize, iconSizes

### Community 230 - "intake-evidence-checklist.tsx"
Cohesion: 0.22
Nodes (8): CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, fontMap, radiusMap, sizeMap, OrganizationMembershipRowProps, styles

### Community 232 - "gradients.ts"
Cohesion: 0.08
Nodes (40): OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent(), ScanUnknownSheetProps, sheetPresentationKey(), useDevMockFallback(), useScanExperience(), classifyScanPayload() (+32 more)

## Knowledge Gaps
- **1171 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1166 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `text.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `index.ts`, `index.ts`, `use-work-order-composer-options.ts`, `order-detail-screen.tsx`, `expo-device`, `radius`, `firestore-timestamp.ts`, `expo-haptics`, `types.ts`, `notifications-settings-screen.tsx`, `useAuth`, `paywall.tsx`, `types.ts`, `auth-gate.tsx`, `haptics`, `react-dom`, `scan-product-sheet.tsx`, `rhythm`, `order-composition-step.tsx`, `team-invite-card.tsx`, `edit-profile-screen.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `types.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `profile-screen.tsx`, `apple-sign-in.ts`, `login-screen.tsx`, `mobilePost`, `apple-sign-in.ts`, `mapAuthError`, `input-field.tsx`, `auth-journey-screens.tsx`, `styles.ts`, `useFadeIn`, `inline-autocomplete-row.tsx`, `document-import.ts`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `ScanDebounce`, `app-loading-screen.tsx`, `tab-transition-context.tsx`, `delete-account.ts`, `search-engine-card.tsx`, `orders-mail-list.ios.tsx`, `kv.ts`, `in-app-banner-provider.tsx`, `deep-link-resolver.ts`, `location-contents.ts`, `order-row.tsx`, `copy-button.tsx`, `google-sign-in-button.tsx`, `appearance-settings-screen.tsx`, `intake-evidence-checklist.tsx`, `gradients.ts`, `team-invite-card.tsx`, `types.ts`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `Text` connect `profile-danger-zone.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `text.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `index.ts`, `use-work-order-composer-options.ts`, `order-detail-screen.tsx`, `expo-device`, `radius`, `firestore-timestamp.ts`, `expo-haptics`, `types.ts`, `notifications-settings-screen.tsx`, `useReducedMotion`, `currency-screen.tsx`, `paywall.tsx`, `expo-status-bar`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `index.ts`, `react-dom`, `scan-product-sheet.tsx`, `rhythm`, `order-composition-step.tsx`, `team-invite-card.tsx`, `edit-profile-screen.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `types.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `profile-screen.tsx`, `login-screen.tsx`, `mobilePost`, `apple-sign-in.ts`, `mapAuthError`, `input-field.tsx`, `auth-journey-screens.tsx`, `styles.ts`, `useFadeIn`, `inline-autocomplete-row.tsx`, `document-import.ts`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `delete-account.ts`, `tab-transition-context.tsx`, `orders-mail-list.ios.tsx`, `kv.ts`, `deep-link-resolver.ts`, `invite-accept-screen.tsx`, `order-row.tsx`, `copy-button.tsx`, `appearance-settings-screen.tsx`, `intake-evidence-checklist.tsx`, `gradients.ts`, `team-invite-card.tsx`, `types.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `useSession()` connect `profile-screen.tsx` to `create-operation-screen.tsx`, `team-screen.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `inventory-card.tsx`, `index.ts`, `index.ts`, `index.ts`, `useTheme`, `auth-provider.tsx`, `Text`, `radius`, `firestore-timestamp.ts`, `getJson`, `types.ts`, `scan-screen.tsx`, `useReducedMotion`, `useAuth`, `currency-screen.tsx`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `index.ts`, `rhythm`, `scan-document-sheet.tsx`, `team-invite-card.tsx`, `empty-state.tsx`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `login-screen.tsx`, `mobilePost`, `apple-sign-in.ts`, `auth-journey-screens.tsx`, `document-import.ts`, `app-loading-screen.tsx`, `local-inventory-resolve.ts`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `search-engine-card.tsx`, `kv.ts`, `deep-link-resolver.ts`, `order-row.tsx`, `gradients.ts`, `team-invite-card.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1171 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09206349206349207 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08602150537634409 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07864488808227466 - nodes in this community are weakly interconnected._