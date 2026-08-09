# Graph Report - autocore-mobile  (2026-08-09)

## Corpus Check
- 1110 files · ~966,940 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5100 nodes · 17545 edges · 228 communities (162 shown, 66 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 73 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eb3af4fb`
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
- work-symbols.ts
- react-native
- @react-native-async-storage/async-storage
- @react-native-community/datetimepicker
- @react-native-community/netinfo
- team-invite-card.tsx
- @react-native-google-signin/google-signin
- react-native-mmkv
- react-native-nitro-modules
- @autocore/domain-search
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
- expo-blur
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
1. `useTheme()` - 484 edges
2. `Text` - 245 edges
3. `workOsColors()` - 213 edges
4. `haptics` - 152 edges
5. `WORK_OS_FIXTURE_ORDERS` - 122 edges
6. `useReducedMotion()` - 111 edges
7. `workOsSpace` - 110 edges
8. `workOsType` - 109 edges
9. `useSession()` - 106 edges
10. `tokens` - 98 edges

## Surprising Connections (you probably didn't know these)
- `ThemeProvider()` --indirect_call--> `base()`  [INFERRED]
  hooks/use-theme.tsx → lib/subscriptions/dev-mode.ts
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  animations/presets.ts → hooks/use-accessibility.ts
- `TabLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/_layout.tsx → hooks/use-theme.tsx
- `useAuthActionsController()` --indirect_call--> `user()`  [INFERRED]
  authentication/auth-provider.tsx → lib/shell/workspace-registry.test.ts
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  authentication/auth-provider.tsx → services/auth/apple-sign-in.ts

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`

## Communities (228 total, 66 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.12
Nodes (14): PhoneIcon, ordersSpring, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), OrderCard, OrderCardProps, SF (+6 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.23
Nodes (9): CameraIcon, FlashList, OptimizedListProps, useListStaggerDelay(), IntakeJobRow(), IntakeJobRowProps, jobSerial(), jobSubtitle() (+1 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.10
Nodes (35): clearEntitlementCaches(), asPurchaseFailure(), isCancellation(), isPurchaseFailure(), getFlow(), isFlowBusy(), resetPurchaseStore(), setFlow() (+27 more)

### Community 3 - "text.tsx"
Cohesion: 0.03
Nodes (91): IconName, iconRegistry, AuthDivider(), InviteFormNotice(), InviteFormNoticeProps, normalizeCode(), VerificationCodeInput(), VerificationCodeInputProps (+83 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.11
Nodes (26): PlanOffer, UseSubscriptionResult, PlanDescriptor, purchasablePlans(), emit(), EMPTY_PRODUCTS, getPurchaseStoreSnapshot(), listeners (+18 more)

### Community 5 - "motion.ts"
Cohesion: 0.05
Nodes (44): ScreenEnterConfig, useFadeIn(), usePageEnter(), useScaleEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps, mcDuration (+36 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.07
Nodes (52): COMPOSER_TAB_ORDER, useComposerTabState(), GroupedSection(), CreateOrderScreen(), SheetNavButton(), SummaryRow(), useOrderCompositionForm(), UseOrderCompositionFormOptions (+44 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.14
Nodes (19): OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), SourceLayout, useOrderTransition(), OrderRowBody(), OrderRowProps, pressTiming (+11 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.02
Nodes (140): ThroughputBarsProps, TrendSparklineProps, ActiveJobHero, ActiveJobHeroProps, useScheme(), ActivityRow, ActivityRowProps, useScheme() (+132 more)

### Community 9 - "index.ts"
Cohesion: 0.23
Nodes (3): AnimatedTabScreen, AnimatedTabScreenProps, AiWorkspaceScreen()

### Community 10 - "index.ts"
Cohesion: 0.12
Nodes (32): clientRepository, useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useEmployeesRealtime(), useInventoryCatalog(), useMotorsRealtime(), useOperationsRealtime() (+24 more)

### Community 11 - "index.ts"
Cohesion: 0.24
Nodes (8): SearchEmptyActionId, SearchEmptyState(), SearchGroupHeader(), SearchGroupHeaderProps, pluralResults(), SearchResults(), SearchResultsProps, searchLayout

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.05
Nodes (62): EMPTY_JOB_DETAIL, JobDetailState, JobsState, useEngineIntakeJobDetail(), useCompanyInvites(), notifyFirestoreSnapshotError(), reviveDatesDeep(), shouldReviveDateField() (+54 more)

### Community 14 - "index.ts"
Cohesion: 0.11
Nodes (26): useCompanySubscription(), useEntitlementFor(), UseEntitlementResult, planById(), CachedEntitlement, acquireEntitlement(), clearEntitlementRegistry(), clearSettleTimer() (+18 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.07
Nodes (31): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+23 more)

### Community 16 - "useTheme"
Cohesion: 0.08
Nodes (42): Can(), CanProps, RequirePermission(), RequirePermissionProps, formatRelativeNow(), averageOfPoints(), buildWeeklyClosedCounts(), closedCountInRange() (+34 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.08
Nodes (55): HomeDashboard, useHomeDashboard(), ACTIVE_INTAKE, buildAiInsight(), buildAttentionRows(), buildHomeNow(), buildHomeToday(), buildHomeTrend() (+47 more)

### Community 18 - "Text"
Cohesion: 0.31
Nodes (14): ThroughputBars, TrendSparkline, BrowseTile, FilterChipRow, HealthRing, HighlightCard, KPIStrip, MetricHero (+6 more)

### Community 19 - "radius"
Cohesion: 0.10
Nodes (35): OrdersSummary(), OrdersSummaryProps, scanSheetAnimationConfigs, ScanCandidatesSheetProps, ScanCodePickerSheetProps, ScanDocumentSheetProps, ScanLauncherButton(), ScanMoveSheetProps (+27 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.44
Nodes (6): ScreenActionFooter(), ScreenActionFooterProps, useFloatingTabBarInset(), getFloatingTabBarOffset(), getScreenActionScrollInset(), useRegisterAutocompleteChromeInset()

### Community 21 - "notification-service.ts"
Cohesion: 0.15
Nodes (16): getOAuthButtonTheme(), OAuthButtonTheme, resolveScheme(), ThemeProvider(), designLanguageFromScheme(), defaultShadow(), floatingShadow(), ElevationLevel (+8 more)

### Community 22 - "getJson"
Cohesion: 0.08
Nodes (47): CREATE_HREF, HOME_HREF, JOIN_HREF, OrganizationCard, OrgCardProps, styles, SwitchOrganizationScreen(), EditProfileScreen() (+39 more)

### Community 23 - "types.ts"
Cohesion: 0.06
Nodes (59): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, workspaceImport(), useAuthHasAccess() (+51 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.07
Nodes (44): NotFoundScreen(), ImagesIcon, MapPinIcon, ActivityCard, ActivityCardProps, AnalyticsCard, AnalyticsCardProps, BusinessCardShell() (+36 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.10
Nodes (46): UseAccountingDataResult, AccountingAttentionAction, AccountingSnapshot, AttentionTone, CashFlowPeriod, InvoiceStatus, TransactionStatus, TrendTone (+38 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.11
Nodes (28): AccountingScreen(), AcAccountingEmptyState(), AcAccountingSkeleton(), TileSkeleton(), AcOperationsList(), AcTabBar(), AcTabBarProps, AcTabPanel() (+20 more)

### Community 27 - "useAuth"
Cohesion: 0.11
Nodes (35): ActionRoute(), ActionSheetState, useActionSheetStore, presentActionSheet(), ActionItem, AiCapability, AiCapabilityId, HomeSectionId (+27 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.09
Nodes (31): ActivityFeedFilters(), useNotificationInboxRealtime(), useNotificationPreferences(), useNotificationService(), stripUndefinedDeep(), mergeNotificationPreferences(), NotificationProvider(), NotificationProviderProps (+23 more)

### Community 29 - "paywall.tsx"
Cohesion: 0.10
Nodes (20): OrderWorkflowProgress(), OrderWorkflowProgressProps, orderStatusLabel, StatusEmphasis, StatusInk, getWorkflowStages(), resolveStageIndex(), STAGE_LABELS (+12 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.09
Nodes (38): useAccountingData(), useSessionBootstrapReady(), CachedRealtimeSnapshot, clearRealtimeSnapshots(), flushOneWrite(), isFresh(), lastDataJsonByKey, memoryCache (+30 more)

### Community 31 - "types.ts"
Cohesion: 0.05
Nodes (73): styles, TabLayout(), ChartPoint, LineChart, LineChartProps, ActionSheetHost(), styles, AnimatedPressable (+65 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.08
Nodes (52): ActivityIcon, ArrowUpRightIcon, BellIcon, BoxIcon, CarIcon, ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon (+44 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.11
Nodes (31): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, SLUG_TO_TYPE, useWorkOrderDocumentsRealtime(), orderShowsOilIntervalTag(), textMatches(), downloadPdfFromApi() (+23 more)

### Community 34 - "haptics"
Cohesion: 0.09
Nodes (21): FlashlightIcon, DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus (+13 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.08
Nodes (28): ModulesEditorList(), ModulesEditorListProps, ACCOUNTING_DEMO, PERMISSION_GROUPS, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModuleDefinition (+20 more)

### Community 36 - "index.ts"
Cohesion: 0.12
Nodes (27): CurrencyScreen(), useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), useSession(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS, AppDisplayCurrency (+19 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.12
Nodes (18): CreateInventoryItemInput, useMobileQuickReceive(), MobileAssignAssetResult, MobileRelocateResult, MobileWarehouseLocation, useMobileWarehouseLocations(), useMobileStockAdjust(), inventoryQueryKey() (+10 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.13
Nodes (25): CachedSubscription, date(), deserialize(), iso(), readEntitlementCache(), readEntitlementCacheSync(), serialize(), SerializedSubscription (+17 more)

### Community 39 - "rhythm"
Cohesion: 0.07
Nodes (51): OrderPickerSheet, SearchFilters(), SearchFiltersProps, SearchIdle(), SellMotorSheet, SellMotorSheetRef, searchFilters, inventoryCardSubtitle() (+43 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.07
Nodes (31): AutocompleteInput, Dropdown(), Segment, SegmentedControl(), SegmentedControlProps, Tab, TabLayout, Tabs() (+23 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.11
Nodes (22): StaticTabScreen, classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines() (+14 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.13
Nodes (14): NAV_ITEM_DEFINITIONS, NavItemId, EXPO_TAB_HREFS, isNavItemModuleEnabled(), isNavItemVisible(), isShellTabVisible(), NavModuleFlags, HIDDEN_TAB_ROUTES (+6 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.11
Nodes (26): NotificationsSettingsScreen(), useNotificationInbox(), MobileApiError, registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered() (+18 more)

### Community 44 - "index.ts"
Cohesion: 0.08
Nodes (66): BOARD_KEYS, DOCS, WorkOsCatalogHarness(), WorkOsStoryboard00(), WorkOsStoryboard01(), WorkOsStoryboard02(), WorkOsStoryboard03(), WorkOsStoryboard04() (+58 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.12
Nodes (21): TrendingDownIcon, AcAccountTiles, AcAccountTilesProps, AccountTile(), TileDef, AcBalanceCard, AcBalanceCardProps, typeBadgeColors() (+13 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.06
Nodes (74): IconProps, CheckCircle2Icon, CheckIcon, Badge(), BadgeProps, BadgeVariant, VARIANT_TONE, Checkbox() (+66 more)

### Community 47 - "inventory.ts"
Cohesion: 0.06
Nodes (25): WORK_OS_DESIGN_DOC_0, WORK_OS_DESIGN_DOC_1, WORK_OS_DESIGN_DOC_2, WORK_OS_DESIGN_DOC_3, WORK_OS_DESIGN_DOC_4, WORK_OS_DESIGN_DOC_5, WORK_OS_DESIGN_DOC_6, WORK_OS_DESIGN_DOC_7 (+17 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.07
Nodes (27): @autocore/billing, @autocore/rbac, expo-camera, expo-device, firebase, nativewind, dependencies, @autocore/billing (+19 more)

### Community 50 - "index.ts"
Cohesion: 0.10
Nodes (32): allStoreSkus(), skuForPlan(), CODE_MAP, failure(), MESSAGES, readErrorCode(), toPurchaseFailure(), connect() (+24 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.09
Nodes (32): AppProviders(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), getStartupSummary(), queryClient (+24 more)

### Community 52 - "types.ts"
Cohesion: 0.16
Nodes (22): OAuthProvider, ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), isAppleSignInCancellation() (+14 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.18
Nodes (14): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), fetchJsonWithTimeout(), AppleSignInApiPayload, AppleSignInApiResponse (+6 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.26
Nodes (17): markAllNotificationsRead(), markNotificationState(), fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord(), markAllInboxNotificationsRead(), subscribeInboxFromFirestore() (+9 more)

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.13
Nodes (16): EllipsisIcon, OrderStatusMoreSheet, OrderStatusMoreSheetRef, formatOrderVehicleLine(), footerStatusIcon(), footerStatusLabel(), HeaderTextButton(), OrderDetailScreen() (+8 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.11
Nodes (31): applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems(), paginateItems() (+23 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.04
Nodes (78): PrinterIcon, Share2Icon, AcMotorSaleDocumentsSheet, AcMotorSaleDocumentsSheetProps, AcMotorSaleDocumentsSheetRef, DocAction, AcOperationsListProps, operationAccountDetail() (+70 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.06
Nodes (39): ArrowRightIcon, AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP (+31 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.13
Nodes (11): HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs, InlineAutocompleteRow, InlineAutocompleteRowProps (+3 more)

### Community 61 - "ScanService"
Cohesion: 0.11
Nodes (30): mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), PendingScanContext, scanContextStore (+22 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.17
Nodes (13): XIcon, AuthenticatedLandingScreen(), InAppBannerProvider(), layoutTransition, styles, NotificationBellButton(), NotificationBellButtonProps, HomeHeader() (+5 more)

### Community 63 - "include"
Cohesion: 0.07
Nodes (27): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+19 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.15
Nodes (23): finalizeEngineIntakePhoto(), prepareEngineIntakePhoto(), sendEngineIntakeCommand(), buildSnapshot(), commandFailureBlocksJob(), drain(), drainIntakeOutbox(), errorMessage() (+15 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.11
Nodes (24): animationSpeed, buttonHeight, A11ySlice, cornerStyle, defaultEasing, glassStyle, iconWeight, iosControls (+16 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.21
Nodes (14): accentFor(), OperationsLiveActivityHost(), OperationsLiveActivity, OperationsLiveActivityLayout(), OperationsLiveActivityProps, systemIcon(), DesiredLiveActivity, liveActivityContentKey() (+6 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.17
Nodes (13): AutocompleteOverlay, AutocompleteOverlayProps, DockPanelProps, getAutocompleteDataSnapshot(), applySuggestion(), replaceLastToken(), AutocompleteReplaceMode, AutocompleteSession (+5 more)

### Community 68 - "mobilePost"
Cohesion: 0.07
Nodes (46): useAuth(), useAuthActions(), AuthBackdrop(), AuthShell(), AuthShellProps, ProgressBar(), ForgotPasswordScreen(), isValidEmail() (+38 more)

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.07
Nodes (31): ListGroup(), acTimeline, AcAdvancesOverview(), AcAdvancesOverviewProps, AdvanceRow(), AcHeader(), AcHeaderProps, todayLabel() (+23 more)

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.14
Nodes (12): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, kindLabel(), LocationContentsResponse (+4 more)

### Community 71 - "mapAuthError"
Cohesion: 0.17
Nodes (16): AutocompleteInputProps, useAutocomplete(), UseAutocompleteArgs, UseAutocompleteReturn, BASE, getNativeInputProps(), NativeProps, resolveAutocompleteType() (+8 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.16
Nodes (21): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, InputField (+13 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "composer-utils.ts"
Cohesion: 0.11
Nodes (17): body, callout, caption1, caption2, fontWeight, footnote, headline, identifier (+9 more)

### Community 75 - "animated-tab-screen.tsx"
Cohesion: 0.14
Nodes (24): comparePlans(), highestPlan(), PlanAvailability, planForSku(), PLANS, TIER_RANK, tierRank(), tierSatisfies() (+16 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.23
Nodes (15): buildWeekRevenueBars(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), resolveOverviewRevenue(), resolveWeekChartBars() (+7 more)

### Community 77 - "styles.ts"
Cohesion: 0.05
Nodes (45): AnimatedIconWrapper, createIcon(), IconState, AuthEmailChip(), AuthEmailChipProps, AnimatedLine, AuthHeroCar(), FRONT_WHEEL (+37 more)

### Community 78 - "inline-autocomplete-row.tsx"
Cohesion: 0.27
Nodes (9): hasShelfValue(), isEngine(), SearchEngineCard(), SearchEngineCardProps, formatVin(), statusLabel, statusVariant, InventoryStatus (+1 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.34
Nodes (17): filterAutocompleteOptions(), uniqueAutocompleteOptions(), computeMatchRanges(), inferEngineFuelBadge(), mergeEngineCustomOptions(), searchAutocomplete(), searchCategories(), searchCustomers() (+9 more)

### Community 80 - "profile.ts"
Cohesion: 0.07
Nodes (55): AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace() (+47 more)

### Community 81 - "document-import.ts"
Cohesion: 0.21
Nodes (12): FinanceSettingsScreen(), listsEqual(), normalizeList(), resolveFinanceSettingsReturnHref(), can(), canEditInventory(), canEditWorkOrders(), canManageEmployees() (+4 more)

### Community 82 - "modules.ts"
Cohesion: 0.14
Nodes (14): catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery(), quickCategories, recentlyViewedEngines (+6 more)

### Community 83 - "location-screen.tsx"
Cohesion: 0.06
Nodes (40): HomeRoute(), AuthBootLoadingProps, SPLASH_TO_LOGIN_SCALE, AuthLoadingScreen(), AuthLoadingScreenProps, AuthSplashSurface(), AuthSplashSurfaceProps, enterEase (+32 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.05
Nodes (61): AcAttention(), AcAttentionProps, AttentionCard, formatCounter(), formatGroupedInteger(), McAnimatedCounter(), McAnimatedCounterProps, McCounterFormat (+53 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.18
Nodes (14): OrderRow, OrdersGroupHeader(), OrdersMailList(), Bucket, BUCKET_LABEL, BUCKET_ORDER, bucketFor(), buildOrderRows() (+6 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.25
Nodes (10): ObjectsLayout(), AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), formSheetScreenOptions(), NavigationPolicy (+2 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.09
Nodes (22): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Dynamic Island (iOS Live Activities), Floating dock, Home (Mission Control) (+14 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.20
Nodes (12): withAlpha(), borderStyle(), toneStyles(), createCardStyle(), createIconBadgeStyle(), createInputTextStyle(), createListRowStyle(), createPressableControlStyle() (+4 more)

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.06
Nodes (47): NotificationCard, ActivityFeedFiltersProps, READ_FILTERS, ActivityNotificationRow, ActivityNotificationRowProps, SwipeActionProps, DateGroup, DateGroupKey (+39 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.21
Nodes (12): groupNotificationsByDate(), NotificationInboxScreen(), isSameStackInboxReturn(), notificationInboxHref(), NotificationInboxReturnTo, OpenInboxRouter, openNotificationInbox(), resolveInboxReturnToFromSegments() (+4 more)

### Community 92 - "kv.ts"
Cohesion: 0.17
Nodes (14): ScanSearchIcon, useSearchEnter(), AnimatedSection(), whTimeline, OPTIONS, WarehouseFilter, WarehouseFilterBar(), WarehouseFilterBarProps (+6 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.14
Nodes (17): EngineIntakeLaunch(), IntakeLaunchCard(), IntakeCreateSerialSheet, IntakeCreateSerialSheetRef, ACTIVE_STATES, BayFilter, EngineIntakeJobsScreen(), isPermissionError() (+9 more)

### Community 95 - "invite-accept-screen.tsx"
Cohesion: 0.14
Nodes (19): AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES (+11 more)

### Community 96 - "location-contents.ts"
Cohesion: 0.33
Nodes (6): computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters, isOpenOrderStatus()

### Community 97 - "order-row.tsx"
Cohesion: 0.26
Nodes (11): ComposerVehicleForm, useWorkOrderComposerOptions(), vehiclesInContext(), AutocompleteOption, brandByKey, brands, CatalogBrand, listVehicleMakes() (+3 more)

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.39
Nodes (7): useAppearanceSettingsStore, useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled(), DesignLanguageContext

### Community 100 - "google-sign-in-button.tsx"
Cohesion: 0.44
Nodes (8): fieldKey(), readFieldValues(), readRecentValues(), rememberFieldValue(), rememberRecentValue(), storageKey(), setJson(), saveExtendedPrefs()

### Community 101 - "appearance-settings-screen.tsx"
Cohesion: 0.33
Nodes (6): Sidebar(), SidebarItem, SidebarProps, SidebarSection, isTablet(), sidebarWidth

### Community 102 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+5 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.14
Nodes (28): appendLocalFile(), createLocalFileFormData(), AvatarUploadResult, uploadUserAvatar(), DocumentImportJobStatus, DocumentImportUploadResult, getDocumentImportStatus(), pollDocumentImportUntilSettled() (+20 more)

### Community 105 - "financial-operation-repository.ts"
Cohesion: 0.33
Nodes (5): LineRow(), OrderLine, OrderLinesList(), OrderLinesListProps, Section()

### Community 106 - "team-invite-card.tsx"
Cohesion: 0.04
Nodes (48): AlertTriangleIcon, ChevronRightIcon, CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, fontMap, radiusMap, sizeMap (+40 more)

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
Cohesion: 0.19
Nodes (9): resolveInviteHref(), guardedPush(), PushRouter, navigationHrefKey(), stackNavigationGuard, buildImportDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink() (+1 more)

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.32
Nodes (5): VersionSettingsScreen(), formatPlatformPhone(), getPlatformContacts(), PlatformContacts, readEnv()

### Community 113 - "advances.ts"
Cohesion: 0.13
Nodes (29): DevSubscriptionPanel(), readDevOffline(), SyncState, base(), clearDevMode(), DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS (+21 more)

### Community 114 - "team-employee-card.tsx"
Cohesion: 0.42
Nodes (7): AnimatedPolyline, buildPoints(), estimatePathLength(), McAnimatedSparkline(), McAnimatedSparklineProps, buildSparklinePoints(), sanitizeChartSeries()

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
Cohesion: 0.40
Nodes (5): HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.02
Nodes (100): useShimmer(), DesignSystemScreen(), CopyIcon, GripVerticalIcon, Loader2Icon, SearchIcon, TabScreenPlaceholderProps, ActionIconButton (+92 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.05
Nodes (47): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, AutocompleteDataSnapshot (+39 more)

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.06
Nodes (33): LockIcon, PlusIcon, AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButtonProps, styles (+25 more)

### Community 140 - "use-work-order-composer-options.ts"
Cohesion: 0.19
Nodes (16): IntakeCamera, IntakeCameraHandle, IntakeCaptureChrome(), IntakeCaptureDock(), createClaimCommand(), EngineIntakeSessionScreen(), makeWorkerCommand(), engineIntakeId() (+8 more)

### Community 141 - "expo-auth-session"
Cohesion: 0.29
Nodes (14): EMPTY, useAccountingPreferences(), useUserDisplayCurrency(), normalizeAppDisplayCurrency(), AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings(), patchAccountingSettings() (+6 more)

### Community 146 - "expo-device"
Cohesion: 0.27
Nodes (9): usePressAnimation(), JourneyOptionCard(), JourneyOptionCardProps, resolveIconColor(), SearchResultRow(), SearchResultRowProps, showStatusBadge(), kindVisual (+1 more)

### Community 148 - "expo-haptics"
Cohesion: 0.33
Nodes (3): WORK_OS_DAY_FIXTURES, WORK_OS_INTAKE_FIXTURES, WorkOsIntakeFixtureJob

### Community 157 - "expo-status-bar"
Cohesion: 0.35
Nodes (10): AddToOrderHandlers, MotorActionHandlers, motorActionMessage(), motorActionTitle(), openSearchResult(), SearchRouter, showCatalogActions(), showMotorActions() (+2 more)

### Community 159 - "@autocore/billing"
Cohesion: 0.50
Nodes (3): StickyActionBar, StickyActionBarProps, workOsElevation

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.05
Nodes (54): ExternalLinkIcon, MailIcon, FeatureGate(), TeamInvitePresentOptions, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS (+46 more)

### Community 203 - "auth-journey-screens.tsx"
Cohesion: 0.23
Nodes (14): AutocoreDockInner(), isTabRouteName(), NO_TRANSITION, resolveTabRouteName(), TAB_ORDER, TabRouteName, TabTransitionContext, TabTransitionContextValue (+6 more)

### Community 206 - "useFadeIn"
Cohesion: 0.16
Nodes (8): DeviceClass, BreakpointKey, breakpoints, platform, screen, { width, height }, screenPadding, SpacingKey

### Community 209 - "useScreenEnter"
Cohesion: 0.17
Nodes (18): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload(), ScanDocumentUploadResult, uploadScanDocument(), RecentScan (+10 more)

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.14
Nodes (20): FilterIcon, IosLiftMenuItem, ScreenGate(), OrdersLoadingState(), OrdersLiftContext, OrdersLiftContextValue, OrdersLiftProvider(), OrdersLiftSession (+12 more)

### Community 214 - "local-inventory-resolve.ts"
Cohesion: 0.15
Nodes (17): parseFeature(), PaywallRoute(), BarChart3Icon, CloudIcon, LifeBuoyIcon, useFeatureGate(), UseFeatureGateResult, PresentPaywall (+9 more)

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.04
Nodes (60): WorkspaceAccessScreen(), METRICS, PlanTag(), PremiumBadge(), PremiumBadgeProps, PremiumBadgeSize, PageHeader(), presentOrganizationSwitcher() (+52 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.08
Nodes (26): ArrowLeftIcon, IconButton, IconButtonProps, sizes, BrandWash(), ProductScreenShell(), ProductScreenShellProps, GateAction (+18 more)

### Community 219 - "orders-mail-list.ios.tsx"
Cohesion: 0.06
Nodes (44): scanSpring, scanTimeline, ScanCandidatesSheet, ScanCodePickerSheet, ScanConfirmFlash(), ScanConfirmFlashProps, normalizeBounds(), ScanDetectionOverlay() (+36 more)

### Community 223 - "useScreenEnter"
Cohesion: 0.28
Nodes (6): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter(), SearchEnterConfig

### Community 232 - "gradients.ts"
Cohesion: 0.08
Nodes (45): toast(), ToastAction, ToastItem, ToastStore, ToastVariant, PendingAdd, useAddToOrderFlow(), CompositionRouter (+37 more)

## Knowledge Gaps
- **1233 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1228 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **66 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `text.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `index.ts`, `index.ts`, `order-detail-screen.tsx`, `useTheme`, `expo-device`, `radius`, `firestore-timestamp.ts`, `getJson`, `types.ts`, `notifications-settings-screen.tsx`, `useReducedMotion`, `useAuth`, `paywall.tsx`, `types.ts`, `auth-gate.tsx`, `haptics`, `rhythm`, `order-composition-step.tsx`, `team-invite-card.tsx`, `my-earnings-screen.tsx`, `empty-state.tsx`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `profile-screen.tsx`, `mobilePost`, `ac-payroll-list.tsx`, `apple-sign-in.ts`, `input-field.tsx`, `auth-journey-screens.tsx`, `styles.ts`, `inline-autocomplete-row.tsx`, `document-import.ts`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `ScanDebounce`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `use-work-order-composer-options.ts`, `search-engine-card.tsx`, `app-loading-screen.tsx`, `orders-mail-list.ios.tsx`, `kv.ts`, `deep-link-resolver.ts`, `copy-button.tsx`, `appearance-settings-screen.tsx`, `gradients.ts`, `financial-operation-repository.ts`, `team-invite-card.tsx`, `advances.ts`, `types.ts`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `Text` connect `types.ts` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `text.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `index.ts`, `order-detail-screen.tsx`, `expo-device`, `radius`, `getJson`, `types.ts`, `notifications-settings-screen.tsx`, `useReducedMotion`, `paywall.tsx`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `index.ts`, `rhythm`, `order-composition-step.tsx`, `team-invite-card.tsx`, `my-earnings-screen.tsx`, `empty-state.tsx`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `profile-screen.tsx`, `mobilePost`, `ac-payroll-list.tsx`, `apple-sign-in.ts`, `input-field.tsx`, `styles.ts`, `inline-autocomplete-row.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `use-work-order-composer-options.ts`, `orders-mail-list.ios.tsx`, `kv.ts`, `deep-link-resolver.ts`, `invite-accept-screen.tsx`, `appearance-settings-screen.tsx`, `gradients.ts`, `financial-operation-repository.ts`, `team-invite-card.tsx`, `advances.ts`, `types.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `useSession()` connect `index.ts` to `text.tsx`, `team-screen.tsx`, `inventory-card.tsx`, `create-order-screen.tsx`, `use-work-order-composer-options.ts`, `index.ts`, `useTheme`, `auth-provider.tsx`, `getJson`, `types.ts`, `scan-screen.tsx`, `useReducedMotion`, `useAuth`, `currency-screen.tsx`, `subscription-registry.ts`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `rhythm`, `scan-document-sheet.tsx`, `team-invite-card.tsx`, `empty-state.tsx`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `profile-screen.tsx`, `login-screen.tsx`, `mobilePost`, `apple-sign-in.ts`, `document-import.ts`, `app-loading-screen.tsx`, `local-inventory-resolve.ts`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `search-engine-card.tsx`, `orders-mail-list.ios.tsx`, `deep-link-resolver.ts`, `gradients.ts`, `team-invite-card.tsx`, `advances.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1233 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12333333333333334 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Should `text.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.02675059008654603 - nodes in this community are weakly interconnected._