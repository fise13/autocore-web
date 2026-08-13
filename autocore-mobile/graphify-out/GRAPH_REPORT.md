# Graph Report - autocore-mobile  (2026-08-13)

## Corpus Check
- 1167 files · ~998,051 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5452 nodes · 18747 edges · 249 communities (179 shown, 70 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4de2ef1b`
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
- react-native-keyboard-controller
- styles.ts
- labels.ts
- classify-payload.ts
- profile.ts
- cache-settings-screen.tsx
- modules.ts
- location-screen.tsx
- ac-payroll-list.tsx
- order-documents-section.tsx
- ScanDebounce
- version-settings-screen.tsx
- work-order.ts
- use-work-order-composer-options.ts
- search-engine-card.tsx
- kv.ts
- Manual Matrix
- deep-link-resolver.ts
- invite-accept-screen.tsx
- location-contents.ts
- create-operation-screen.tsx
- package.json
- copy-button.tsx
- apple-sign-in.ts
- sell-motor-sheet.tsx
- scripts
- mobilePost
- useFloatingTabBarInset
- search-registry.ts
- location-screen.tsx
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
- inline-autocomplete.tsx
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
- use-subscription.ts
- expo-blur
- expo-clipboard
- expo-constants
- expo-crypto
- activity-notification-row.tsx
- expo-file-system
- expo-haptics
- expo-image
- orders-filters.tsx
- expo-linear-gradient
- expo-notifications
- expo-print
- expo-router
- expo-sharing
- inventory.ts
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
- use-work-order-composer-options.ts
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
- priority-router.ts
- mock-search-catalog.ts
- auth-store.ts
- NotificationService
- expo-image-picker
- goBackOrReplace
- useEngineIntakeOutbox
- expo-glass-effect
- firebase
- useScreenEnter
- nativewind
- react
- app-loading-screen.tsx
- @react-native-async-storage/async-storage
- in-app-banner-provider.tsx
- tab-transition-context.tsx
- @react-native-community/datetimepicker
- react-native-nitro-modules
- orders-mail-list.ios.tsx
- @autocore/rbac
- priority-router.ts
- react-native-svg
- @tanstack/react-query-persist-client
- relocate-pending-store.ts
- useScreenEnter
- expo-blur
- useRbacPolicy
- intake-evidence-checklist.tsx
- flash-list.tsx
- goBackOrReplace
- company-settings-screen.tsx
- @autocore/billing
- matchesSearchQuery
- EditProfileScreen
- @autocore/avatars
- expo-auth-session
- expo-font
- expo-notifications
- @react-native-community/netinfo
- react-native-gesture-handler
- expo-task-manager
- NATIVE_TAB_BAR_HEIGHT
- @gorhom/bottom-sheet
- react-dom
- react-native-iap
- tailwind-merge

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 512 edges
2. `Text` - 257 edges
3. `workOsColors()` - 213 edges
4. `haptics` - 162 edges
5. `WORK_OS_FIXTURE_ORDERS` - 122 edges
6. `useSession()` - 113 edges
7. `workOsSpace` - 110 edges
8. `useReducedMotion()` - 110 edges
9. `workOsType` - 109 edges
10. `rhythm` - 105 edges

## Surprising Connections (you probably didn't know these)
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  animations/presets.ts → hooks/use-accessibility.ts
- `TabLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/_layout.tsx → hooks/use-theme.tsx
- `AuthDivider()` --calls--> `useTheme()`  [EXTRACTED]
  authentication/auth-divider.tsx → hooks/use-theme.tsx
- `useAuthActionsController()` --indirect_call--> `user()`  [INFERRED]
  authentication/auth-provider.tsx → lib/shell/workspace-registry.test.ts
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  authentication/auth-provider.tsx → services/auth/apple-sign-in.ts

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`

## Communities (249 total, 70 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.04
Nodes (82): CREATE_HREF, HOME_HREF, JOIN_HREF, OrganizationCard, OrgCardProps, styles, EditProfileScreen(), isEmailProvider() (+74 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.11
Nodes (21): AnimatedPressable, canUseLiquidGlass(), CenterAction(), DockItem(), LiquidGlassTabBar, LiquidGlassTabBarInner(), styles, isTabRouteName() (+13 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.08
Nodes (54): planForSku(), isDevModeActive(), scenarioForPlan(), clearEntitlementCaches(), peekEntitlement(), setLocalSubscriptions(), asPurchaseFailure(), failure() (+46 more)

### Community 3 - "text.tsx"
Cohesion: 0.09
Nodes (23): ChevronRightIcon, EmptyState(), IosLiftMenu(), IosLiftMenuAnchor, IosLiftMenuProps, styles, defaultLogo, PageHeader() (+15 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.18
Nodes (10): parseFeature(), PaywallRoute(), useFeatureGate(), UseFeatureGateResult, PresentPaywall, evaluateGate(), FEATURE_MATRIX, FeatureLockedError (+2 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (40): ScreenEnterConfig, useFadeIn(), usePageEnter(), useScaleEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps, enterValues (+32 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.06
Nodes (53): FormListRow(), FormListSplitRow(), GroupedList(), GroupedSection(), SheetNavButton(), SummaryRow(), useOrderCompositionForm(), UseOrderCompositionFormOptions (+45 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.17
Nodes (18): useSessionBootstrapReady(), acquireRealtimeSubscription(), applyCachedSnapshot(), areAcquiredSessionListenersReady(), areInteractiveSessionReady(), areRealtimeKeysReady(), attachListener(), getSessionBootstrapStatus() (+10 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.02
Nodes (140): ThroughputBarsProps, TrendSparklineProps, ActiveJobHero, ActiveJobHeroProps, useScheme(), ActivityRow, ActivityRowProps, useScheme() (+132 more)

### Community 9 - "index.ts"
Cohesion: 0.08
Nodes (37): resolveInviteHref(), buildImportDeepLink(), buildOrderDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType (+29 more)

### Community 10 - "index.ts"
Cohesion: 0.10
Nodes (36): CreateOrderScreen(), clientRepository, useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useEmployeesRealtime(), useInventoryCatalog(), useMotorsRealtime() (+28 more)

### Community 11 - "index.ts"
Cohesion: 0.05
Nodes (60): AutocompleteInput, AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, CoSection(), CoToggleRow(), BUILTIN_CATEGORY_SUGGESTIONS, CreateOperationScreen() (+52 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.11
Nodes (17): HorizontalFilterBar(), HorizontalFilterBarProps, HorizontalFilterOption, TabLayout, Tab, TabLayout, Tabs(), TabsProps (+9 more)

### Community 14 - "index.ts"
Cohesion: 0.08
Nodes (43): PlanOffer, useSubscription(), UseSubscriptionResult, comparePlans(), highestPlan(), PlanAvailability, PlanDescriptor, PLANS (+35 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.06
Nodes (35): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+27 more)

### Community 16 - "useTheme"
Cohesion: 0.06
Nodes (53): Can(), CanProps, RequirePermission(), RequirePermissionProps, formatRelativeNow(), averageOfPoints(), buildWeeklyClosedCounts(), closedCountInRange() (+45 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.09
Nodes (53): HomeDashboard, useHomeDashboard(), ACTIVE_INTAKE, buildAiInsight(), buildAttentionRows(), buildHomeNow(), buildHomeToday(), buildHomeTrend() (+45 more)

### Community 18 - "Text"
Cohesion: 0.31
Nodes (14): ThroughputBars, TrendSparkline, BrowseTile, FilterChipRow, HealthRing, HighlightCard, KPIStrip, MetricHero (+6 more)

### Community 19 - "radius"
Cohesion: 0.19
Nodes (18): reviveDatesDeep(), shouldReviveDateField(), CachedRealtimeSnapshot, flushOneWrite(), isFresh(), lastDataJsonByKey, memoryCache, PendingWrite (+10 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.04
Nodes (64): ExternalLinkIcon, MailIcon, FeatureGate(), OrganizationMembershipRow, InvitePreviewCard(), TeamInvitePresentOptions, TeamInviteSheet, TeamInviteSheetProps (+56 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.14
Nodes (13): CollectionSwitchRow, ModulesEditorList(), ModulesEditorListProps, SettingsToggleRowProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModulesScreen() (+5 more)

### Community 22 - "getJson"
Cohesion: 0.29
Nodes (14): EMPTY, useAccountingPreferences(), useUserDisplayCurrency(), normalizeAppDisplayCurrency(), AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings(), patchAccountingSettings() (+6 more)

### Community 23 - "types.ts"
Cohesion: 0.10
Nodes (41): EMPTY_JOB_DETAIL, JobDetailState, jobsCacheKey(), JobsState, useEngineIntakeJobDetail(), applyOptimisticClaim(), buildOptimisticIntakeJob(), buildOptimisticIntakeSession() (+33 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.11
Nodes (22): AnalyticsCard, AnalyticsCardProps, EngineStatus, EngineStatusProps, EngineStatusType, labels, toneMap, MarketplaceCard (+14 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.07
Nodes (56): IconProps, ActivityIcon, ArrowRightIcon, ArrowUpRightIcon, BarChart3Icon, BellIcon, BoxIcon, CarIcon (+48 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.09
Nodes (42): finalizeEngineIntakePhoto(), prepareEngineIntakePhoto(), sendEngineIntakeCommand(), buildSnapshot(), clearFailedIntakeOutbox(), commandFailureBlocksJob(), completeUploadedPhoto(), countPendingCommands() (+34 more)

### Community 27 - "useAuth"
Cohesion: 0.12
Nodes (34): node(), ActionItem, AiCapability, AiCapabilityId, HomeSectionId, HomeSectionSpec, SearchScopeId, ShellModel (+26 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.10
Nodes (27): CATEGORY_HINTS, NotificationsSettingsScreen(), useNotificationInbox(), useNotificationPreferences(), stripUndefinedDeep(), mergeNotificationPreferences(), PushRegistrationHead(), MobileApiError (+19 more)

### Community 29 - "paywall.tsx"
Cohesion: 0.22
Nodes (10): NotFoundScreen(), ActivityCard, ActivityCardProps, BusinessCardShell(), BusinessCardShellProps, EngineCard, EngineCardProps, statusLabel (+2 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.14
Nodes (12): HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs, InlineAutocompleteRow, InlineAutocompleteRowProps (+4 more)

### Community 31 - "types.ts"
Cohesion: 0.16
Nodes (14): AutocompleteOverlay, AutocompleteOverlayProps, DockPanelProps, getAutocompleteDataSnapshot(), applySuggestion(), replaceLastToken(), AutocompleteAnchor, AutocompleteReplaceMode (+6 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.16
Nodes (10): NotificationCard, ActivityNotificationRow, ActivityNotificationRowProps, SwipeActionProps, DateGroup, DateGroupKey, formatNotificationTime(), GROUP_LABELS (+2 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.06
Nodes (53): ScanSearchIcon, SearchIcon, searchSpring, searchTimeline, SearchEnterConfig, useSearchEnter(), HighlightedText(), HighlightedTextProps (+45 more)

### Community 34 - "haptics"
Cohesion: 0.12
Nodes (18): ArrowLeftIcon, FlashlightIcon, DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles (+10 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.16
Nodes (23): MapPinIcon, catalogRowPosition, EngineLocationSheet, EngineLocationSheetProps, LocationPickRow(), Row, compareLocations(), groupLocationsByZone() (+15 more)

### Community 36 - "index.ts"
Cohesion: 0.14
Nodes (23): CurrencyScreen(), useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS, AppDisplayCurrency, appDisplayCurrencyAffix() (+15 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.15
Nodes (24): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile(), ensureWarrantyPdfFile(), getAuthHeaders() (+16 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.09
Nodes (38): CachedEntitlement, CachedSubscription, date(), deserialize(), iso(), readEntitlementCache(), readEntitlementCacheSync(), serialize() (+30 more)

### Community 39 - "rhythm"
Cohesion: 0.08
Nodes (27): ACCOUNTING_DEMO, PERMISSION_GROUPS, AppearanceSettingsScreen(), THEME_OPTIONS, ACCENT_COLORS, AppearanceSettingsState, DEFAULT_APPEARANCE, useAppearanceSettingsStore (+19 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.07
Nodes (42): EngineThumbnail, EngineRow, EnginesScreen(), flattenVariants(), UnitSubtitle(), clean(), daysOnLot(), documentationLine (+34 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.13
Nodes (20): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+12 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.13
Nodes (26): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, workspaceImport(), useAuthHasAccess() (+18 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.14
Nodes (24): reconcileIntakeSyncLocalNotification(), registerNotificationDevice(), attachForegroundListener(), cancelLocalNotification(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken() (+16 more)

### Community 44 - "index.ts"
Cohesion: 0.08
Nodes (66): BOARD_KEYS, DOCS, WorkOsCatalogHarness(), WorkOsStoryboard00(), WorkOsStoryboard01(), WorkOsStoryboard02(), WorkOsStoryboard03(), WorkOsStoryboard04() (+58 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.12
Nodes (42): useAccountingData(), UseAccountingDataResult, AccountingSnapshot, CashFlowPeriod, resolveWeekChartBars(), BalanceSnapshot, calculateCashBalance(), CATEGORY_ICONS (+34 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.08
Nodes (50): CheckCircle2Icon, CheckIcon, SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, featureDelay(), paywallDuration, paywallEase, paywallEnter (+42 more)

### Community 47 - "inventory.ts"
Cohesion: 0.06
Nodes (25): WORK_OS_DESIGN_DOC_0, WORK_OS_DESIGN_DOC_1, WORK_OS_DESIGN_DOC_2, WORK_OS_DESIGN_DOC_3, WORK_OS_DESIGN_DOC_4, WORK_OS_DESIGN_DOC_5, WORK_OS_DESIGN_DOC_6, WORK_OS_DESIGN_DOC_7 (+17 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.07
Nodes (27): @autocore/engine-intake, expo-auth-session, expo-background-task, expo-camera, expo-router, expo-sharing, expo-splash-screen, expo-web-browser (+19 more)

### Community 50 - "index.ts"
Cohesion: 0.09
Nodes (31): allStoreSkus(), CODE_MAP, isPurchaseFailure(), MESSAGES, readErrorCode(), toPurchaseFailure(), connect(), disconnect() (+23 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.22
Nodes (15): applyNow(), drainOne(), flushScheduledQueryDataApplies(), getMsSinceLastCatalogApply(), getPendingQueryDataApplyCount(), hasSeenCatalogApply(), keyOf(), markCatalogApplyNow() (+7 more)

### Community 52 - "types.ts"
Cohesion: 0.28
Nodes (18): AutocompleteDataSnapshot, filterAutocompleteOptions(), uniqueAutocompleteOptions(), computeMatchRanges(), inferEngineFuelBadge(), mergeEngineCustomOptions(), searchAutocomplete(), searchCategories() (+10 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.25
Nodes (12): buildWeekRevenueBars(), computeMonthRevenueGrowth(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), resolveOverviewRevenue() (+4 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.15
Nodes (26): buildWorkModel(), buildWorkToday(), fallback(), groupThousands(), plural(), ResolvedDetail, resolveEngines(), resolveIntake() (+18 more)

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.06
Nodes (59): OrderStatusMoreSheetProps, scanSheetAnimationConfigs, ScanCandidatesSheet, ScanCandidatesSheetProps, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanDocumentSheet, ScanDocumentSheetProps (+51 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.17
Nodes (22): applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems(), paginateItems() (+14 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.21
Nodes (20): operationAccountDetail(), CoMixedSplit(), CoMixedSplitProps, formatDraft(), accountForPaymentMethod(), accumulateOperationBalance(), buildMixedPaymentFields(), defaultMixedSplit() (+12 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.18
Nodes (9): PrinterIcon, Share2Icon, AcMotorSaleDocumentsSheet, AcMotorSaleDocumentsSheetProps, AcMotorSaleDocumentsSheetRef, DocAction, isMotorSaleOperation(), motorSaleDetail() (+1 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.09
Nodes (31): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), OAuthProvider, formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce() (+23 more)

### Community 61 - "ScanService"
Cohesion: 0.11
Nodes (30): mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), PendingScanContext, scanContextStore (+22 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.20
Nodes (9): ListRow, ListRowProps, styles, ProfileDangerZone(), ProfileDangerZoneProps, ProfileNavCard(), ProfileNavCardProps, ProfileSettingsGroup() (+1 more)

### Community 63 - "include"
Cohesion: 0.07
Nodes (27): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+19 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.12
Nodes (25): IntakeCaptureChrome(), IntakeCaptureDock(), ACTIVE_STATES, createClaimCommand(), EngineIntakeJobsScreen(), isPermissionError(), isWorkerScoped(), sortJobs() (+17 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.06
Nodes (50): resolveScheme(), ThemeProvider(), base(), platform, animationSpeed, borderStyle(), buttonHeight, A11ySlice (+42 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.15
Nodes (18): styles, TabLayout(), APP_ICON, ensureLiveActivityAppIconUri(), OperationsLiveActivityHost(), OperationsLiveActivity, OperationsLiveActivityProps, assertLiveActivityAppGroup() (+10 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.29
Nodes (10): ComposerVehicleForm, useWorkOrderComposerOptions(), vehiclesInContext(), brandByKey, brands, CatalogBrand, listVehicleMakes(), listVehicleModels() (+2 more)

### Community 68 - "mobilePost"
Cohesion: 0.30
Nodes (8): queryClient, hydrateOne(), preloadSessionSnapshots(), preloadSessionSnapshotsChunked(), sessionBootstrapQueryKeys(), sessionInteractiveQueryKeys(), SessionSnapshot, warmSessionCacheFromDisk()

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.10
Nodes (20): scanSpring, scanTimeline, ScanConfirmFlash(), ScanConfirmFlashProps, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanFrameOverlay() (+12 more)

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.07
Nodes (49): toast(), ToastAction, ToastItem, ToastStore, ToastVariant, PendingAdd, useAddToOrderFlow(), CompositionRouter (+41 more)

### Community 71 - "mapAuthError"
Cohesion: 0.19
Nodes (15): AutocompleteInputProps, useAutocomplete(), UseAutocompleteArgs, UseAutocompleteReturn, BASE, getNativeInputProps(), NativeProps, resolveAutocompleteType() (+7 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.16
Nodes (21): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, InputField (+13 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "composer-utils.ts"
Cohesion: 0.11
Nodes (18): body, callout, caption1, caption2, fontWeight, footnote, headline, identifier (+10 more)

### Community 75 - "animated-tab-screen.tsx"
Cohesion: 0.14
Nodes (19): AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES (+11 more)

### Community 76 - "react-native-keyboard-controller"
Cohesion: 0.18
Nodes (9): EMPTY_WORK_COUNTS, DOCUMENTS, ENGINES, INTAKE, LOCATIONS, ORDERS, PARTS, RECEIVING (+1 more)

### Community 77 - "styles.ts"
Cohesion: 0.32
Nodes (10): isSameStackInboxReturn(), notificationInboxHref(), NotificationInboxReturnTo, OpenInboxRouter, openNotificationInbox(), resolveInboxReturnToFromSegments(), resolveInboxReturnToFromTab(), resolveNotificationInboxReturnHref() (+2 more)

### Community 78 - "labels.ts"
Cohesion: 0.27
Nodes (7): IntakeCamera, IntakeCameraHandle, IntakeCameraProps, CameraWithLenses, usePreferredMacroLens(), preferIphoneMacroLens(), VIRTUAL_LENS_HINTS

### Community 79 - "classify-payload.ts"
Cohesion: 0.29
Nodes (7): NavItemId, EXPO_TAB_HREFS, isNavItemModuleEnabled(), isNavItemVisible(), NavModuleFlags, isMobileNavItemAllowed(), NAV_TO_TAB

### Community 80 - "profile.ts"
Cohesion: 0.07
Nodes (56): AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace() (+48 more)

### Community 81 - "cache-settings-screen.tsx"
Cohesion: 0.15
Nodes (14): AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButton(), AuthOAuthButtonProps, styles, getOAuthButtonTheme() (+6 more)

### Community 82 - "modules.ts"
Cohesion: 0.28
Nodes (6): InventoryCard, InventoryCardProps, LocationBadge, LocationBadgeProps, StockBadge, StockBadgeProps

### Community 83 - "location-screen.tsx"
Cohesion: 0.09
Nodes (21): AuthBootLoadingProps, APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON (+13 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.03
Nodes (103): Loader2Icon, TrendingDownIcon, AuthEmailChip(), AuthEmailChipProps, AuthEmailPillProps, AuthHeroCar(), AuthHeroShellProps, HeroBackdrop() (+95 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.12
Nodes (14): computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters, isOpenOrderStatus(), OrdersScreen(), OrderActivity (+6 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.25
Nodes (10): ObjectsLayout(), AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), formSheetScreenOptions(), NavigationPolicy (+2 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.09
Nodes (22): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Dynamic Island (iOS Live Activities), Floating dock, Home (Mission Control) (+14 more)

### Community 88 - "work-order.ts"
Cohesion: 0.16
Nodes (17): useEngineIntakeJobs(), useWorkCounts(), isAwaitingPlacement(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), isOpenStatus(), coerceInventoryString() (+9 more)

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.18
Nodes (22): mobileGet(), backfillTeamNotifications(), fetchNotificationInbox(), fetchNotificationPreferences(), InboxResponse, markAllNotificationsRead(), markNotificationState(), PreferencesResponse (+14 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.13
Nodes (16): OrderStatusBadge(), OrderWorkflowProgress(), OrderWorkflowProgressProps, orderStatusLabel, resolveStatusInk(), StatusEmphasis, StatusInk, getWorkflowStages() (+8 more)

### Community 92 - "kv.ts"
Cohesion: 0.44
Nodes (8): fieldKey(), readFieldValues(), readRecentValues(), rememberFieldValue(), rememberRecentValue(), storageKey(), setJson(), saveExtendedPrefs()

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.25
Nodes (19): enqueueMutation(), shouldQueueMutation(), assertJsonApiResponse(), bodyAsString(), defaultQueueWhenOffline(), getApiBaseUrl(), getBearerToken(), humanizeApiErrorBody() (+11 more)

### Community 95 - "invite-accept-screen.tsx"
Cohesion: 0.31
Nodes (9): readInviteCompanyName(), readInviteEmail(), readInviteToken(), getRecentQueriesCache(), hydrateSearchIdleCache(), readRecentSearchQueries(), rememberSearchQuery(), getJson() (+1 more)

### Community 96 - "location-contents.ts"
Cohesion: 0.08
Nodes (35): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES (+27 more)

### Community 97 - "create-operation-screen.tsx"
Cohesion: 0.19
Nodes (15): AddToOrderHandlers, MotorActionHandlers, motorActionMessage(), motorActionTitle(), openSearchResult(), SearchRouter, showCatalogActions(), showMotorActions() (+7 more)

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.29
Nodes (6): CustomerCard, CustomerCardProps, Avatar, AvatarFallback(), AvatarProps, AvatarSize

### Community 100 - "apple-sign-in.ts"
Cohesion: 0.05
Nodes (56): AuthEmailPill(), useAuthPressSpring(), AuthShell(), ForgotPasswordScreen(), isValidEmail(), ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps (+48 more)

### Community 101 - "sell-motor-sheet.tsx"
Cohesion: 0.21
Nodes (4): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, TabRouteName

### Community 102 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+6 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.13
Nodes (25): getOutboxPending(), OfflineSessionBanner(), styles, subscribeOutbox(), hasPendingIntakeWork(), BackgroundTask, BackgroundTaskApi, hasQueuedWork() (+17 more)

### Community 105 - "search-registry.ts"
Cohesion: 0.42
Nodes (7): AnimatedPolyline, buildPoints(), estimatePathLength(), McAnimatedSparkline(), McAnimatedSparklineProps, buildSparklinePoints(), sanitizeChartSeries()

### Community 106 - "location-screen.tsx"
Cohesion: 0.09
Nodes (30): OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), SourceLayout, useOrderTransition(), OrderRow, OrderRowBody(), OrderRowProps (+22 more)

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
Cohesion: 0.21
Nodes (12): FlashList, OptimizedListProps, useListStaggerDelay(), canCancelJob(), canEditIdentity(), IntakeJobRow(), IntakeJobRowBody(), IntakeJobRowProps (+4 more)

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.04
Nodes (64): GripVerticalIcon, normalizeCode(), VerificationCodeInput(), VerificationCodeInputProps, METRICS, PlanTag(), PremiumBadge(), PremiumBadgeProps (+56 more)

### Community 113 - "advances.ts"
Cohesion: 0.18
Nodes (21): DevSubscriptionPanel(), DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS, devDisplayPrice(), devProducts(), DevScenario, DevScenarioId (+13 more)

### Community 114 - "team-employee-card.tsx"
Cohesion: 0.04
Nodes (76): UserAvatar(), ChartPoint, LineChart, LineChartProps, ActionSheetHost(), styles, GlassSheen, styles (+68 more)

### Community 115 - "metro.config.js"
Cohesion: 0.33
Nodes (5): config, { getDefaultConfig }, path, sharedPackages, { withNativeWind }

### Community 116 - "invite-code.ts"
Cohesion: 0.83
Nodes (3): generateInviteCode(), generateInviteToken(), pickFromAlphabet()

### Community 117 - "with-ios-universal-links.js"
Cohesion: 0.67
Nodes (3): isUniversalLinksEnabled(), { withEntitlementsPlist }, withIosUniversalLinks()

### Community 120 - "inline-autocomplete.tsx"
Cohesion: 0.27
Nodes (8): INTAKE_BAY, IntakeRouter, openEngineIntakeBay(), openEngineIntakeSession(), guardedPush(), PushRouter, navigationHrefKey(), stackNavigationGuard

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.03
Nodes (93): useCardLift(), DesignSystemScreen(), CopyIcon, QuickActionCard, TabScreenPlaceholder(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps (+85 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.38
Nodes (5): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter()

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.43
Nodes (4): ActionRoute(), ActionSheetState, useActionSheetStore, presentActionSheet()

### Community 140 - "use-work-order-composer-options.ts"
Cohesion: 0.13
Nodes (16): CreateInventoryItemInput, useMobileQuickReceive(), appendLocalFile(), createLocalFileFormData(), AvatarUploadResult, uploadUserAvatar(), DocumentImportJobStatus, DocumentImportUploadResult (+8 more)

### Community 141 - "use-subscription.ts"
Cohesion: 0.10
Nodes (26): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBar(), ComposerTabBarProps, ComposerTabOption, TabIcon, ComposerTabPanel() (+18 more)

### Community 142 - "expo-blur"
Cohesion: 0.08
Nodes (37): AccountingScreen(), AcAccountTiles, AcAccountingEmptyState(), AcBalanceCard, AcOperationsList(), AcTabBar(), AcTabBarProps, AcTabPanel() (+29 more)

### Community 146 - "activity-notification-row.tsx"
Cohesion: 0.06
Nodes (59): OrderPickerSheet, SearchFilters(), SearchFiltersProps, catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter() (+51 more)

### Community 148 - "expo-haptics"
Cohesion: 0.33
Nodes (3): WORK_OS_DAY_FIXTURES, WORK_OS_INTAKE_FIXTURES, WorkOsIntakeFixtureJob

### Community 150 - "orders-filters.tsx"
Cohesion: 0.50
Nodes (6): downloadToCache(), shareEnginePhoto(), buildEnginePhotoFilename(), PHOTO_MIME_BY_EXTENSION, PHOTO_UTI_BY_EXTENSION, photoExtension()

### Community 152 - "expo-notifications"
Cohesion: 0.26
Nodes (13): classifySyncError(), codeFromStatus(), describeSyncError(), ErrorLike, isIdempotentPhotoSuccess(), isRetryableSyncError(), looksOffline(), mayDeleteLocalFile() (+5 more)

### Community 154 - "expo-router"
Cohesion: 0.52
Nodes (5): orderShowsOilIntervalTag(), textMatches(), resolveApplicableDocumentSlugs(), resolveDocumentsForOrderCompleted(), resolveDocumentsForOrderCreated()

### Community 155 - "expo-sharing"
Cohesion: 0.14
Nodes (20): SyncErrorCode, isJobRunnable(), nextRetryAt(), nextWakeUpAt(), reconcileOnLaunch(), resolveFailureTransition(), RETRY_DELAYS_MS, retryDelayMs() (+12 more)

### Community 156 - "inventory.ts"
Cohesion: 0.08
Nodes (29): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, AutocompleteDataStore (+21 more)

### Community 157 - "expo-status-bar"
Cohesion: 0.13
Nodes (17): ActivityFeedFilters(), ActivityFeedFiltersProps, READ_FILTERS, useNotificationInboxRealtime(), useNotificationService(), NotificationProvider(), NotificationProviderProps, subscribeInboxRealtime() (+9 more)

### Community 159 - "@autocore/billing"
Cohesion: 0.50
Nodes (3): StickyActionBar, StickyActionBarProps, workOsElevation

### Community 161 - "@gorhom/bottom-sheet"
Cohesion: 0.13
Nodes (15): AcPayrollListProps, PayrollRow(), PayrollStatusBadge(), statusColors(), AcDivider(), statusColor(), TransactionRow(), formatKzt() (+7 more)

### Community 163 - "lucide-react-native"
Cohesion: 0.29
Nodes (3): capturePath, optionsPath, root

### Community 167 - "@react-native-async-storage/async-storage"
Cohesion: 0.47
Nodes (3): ActivityDateGroup(), groupNotificationsByDate(), NotificationInboxScreen()

### Community 169 - "@react-native-community/netinfo"
Cohesion: 0.26
Nodes (11): drainAllIntakeOutboxes(), drainIntakeOutbox(), dropIdempotentPhotoConflicts(), getIntakeOutboxSnapshot, intakeOutboxCompanyIds(), photoFileMissing(), purgeUnrecoverableIntakeOutbox(), requeueIdempotentPhotoConflicts() (+3 more)

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.22
Nodes (15): ClockIcon, SubscriptionStatusCard(), SubscriptionStatusCardProps, TrialCountdown(), TrialCountdownProps, daysUntil(), formatDaysRemaining(), formatRenewalDate() (+7 more)

### Community 177 - "@shopify/flash-list"
Cohesion: 0.40
Nodes (3): CreateInventoryItemScreen(), parseNumber(), useMobileCreateInventoryItem()

### Community 178 - "tailwind-merge"
Cohesion: 0.16
Nodes (18): AppProviders(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, getString(), remove(), setString(), busterListeners, getQueryPersistBuster() (+10 more)

### Community 179 - "tailwindcss"
Cohesion: 0.40
Nodes (4): ImagesIcon, PhotoGrid, PhotoGridProps, useAdaptiveLayout()

### Community 199 - "priority-router.ts"
Cohesion: 0.04
Nodes (61): AuthDivider(), CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, fontMap, radiusMap, sizeMap, ScreenActionFooter() (+53 more)

### Community 203 - "NotificationService"
Cohesion: 0.23
Nodes (9): Listener, listeners, resetAppShellReady(), setAppShellReady(), clearScheduledQueryDataApplies(), clearRealtimeSubscriptions(), clearRecentQueriesCache(), clearSessionSnapshot() (+1 more)

### Community 205 - "goBackOrReplace"
Cohesion: 0.32
Nodes (9): HomeRoute(), getStartupMarks(), logStartupTable(), MarkEntry, marks, markStartup(), StartupMark, hideNativeSplashAndLogStartup() (+1 more)

### Community 206 - "useEngineIntakeOutbox"
Cohesion: 0.20
Nodes (8): DeviceClass, BreakpointKey, breakpoints, screen, sidebarWidth, { width, height }, layoutRhythm, screenPadding

### Community 208 - "firebase"
Cohesion: 0.21
Nodes (10): CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), getStartupSummary(), clearRealtimeSnapshots(), appStorage, clearNamespace(), estimateCacheSizeBytes() (+2 more)

### Community 209 - "useScreenEnter"
Cohesion: 0.29
Nodes (12): ScanDocumentUploadResult, uploadScanDocument(), formatRelativeTime(), loadRecentScans(), mapStored(), mergeRecents(), migrateLegacyIfNeeded(), normalizeStored() (+4 more)

### Community 212 - "react"
Cohesion: 0.22
Nodes (8): DeliveryChannels, isServerCategoryEnabled(), PRIORITY_BASE, resolveDeliveryChannels(), resolveLiveEditingChannels(), resolveSyncChannels(), CategoryChannelPrefs, ExtendedCategoryPreferences

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.09
Nodes (37): FilterIcon, IosLiftMenuItem, OrderRowSkeleton(), OrderRowSkeletonProps, OrdersLoadingState(), OrdersLoadingStateProps, OrdersLiftContext, OrdersLiftContextValue (+29 more)

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.06
Nodes (65): useAuth(), AuthenticatedLandingScreen(), WorkspaceAccessScreen(), CollectionRow, ListSection(), presentOrganizationSwitcher(), SwitchOrganizationScreen(), HomeHeader() (+57 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.03
Nodes (69): useShimmer(), AlertTriangleIcon, CameraIcon, LockIcon, FeatureGateProps, FeatureLockedCard(), FeatureLockedCardProps, Button (+61 more)

### Community 219 - "orders-mail-list.ios.tsx"
Cohesion: 0.04
Nodes (52): usePressAnimation(), AnimatedIconWrapper, createIcon(), IconState, AnimatedLine, FRONT_WHEEL, HERO_DISPLAY_HEIGHT, HERO_DISPLAY_WIDTH (+44 more)

### Community 224 - "relocate-pending-store.ts"
Cohesion: 0.25
Nodes (6): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore

### Community 225 - "useScreenEnter"
Cohesion: 0.08
Nodes (28): EllipsisIcon, PhoneIcon, OrderCard, OrderCardProps, SF, OrderClaimSection(), OrderClaimSectionProps, LineRow() (+20 more)

### Community 230 - "goBackOrReplace"
Cohesion: 0.53
Nodes (4): WorkScreen(), useShellModel(), useWorkspaceContextStore, WorkspaceContextState

## Knowledge Gaps
- **1309 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1304 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **70 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `diagnostics-settings-screen.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `text.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `index.ts`, `index.ts`, `app-tab-bar.tsx`, `use-subscription.ts`, `order-detail-screen.tsx`, `useTheme`, `firestore-timestamp.ts`, `scan-screen.tsx`, `paywall.tsx`, `subscription-registry.ts`, `auth-gate.tsx`, `@gorhom/bottom-sheet`, `haptics`, `use-scan-experience.ts`, `mc-featured-insight.tsx`, `@react-native-async-storage/async-storage`, `order-composition-step.tsx`, `rhythm`, `team-invite-card.tsx`, `empty-state.tsx`, `@shopify/flash-list`, `zustand`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `profile-screen.tsx`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `ac-payroll-list.tsx`, `apple-sign-in.ts`, `priority-router.ts`, `input-field.tsx`, `cache-settings-screen.tsx`, `ac-payroll-list.tsx`, `app-loading-screen.tsx`, `ScanDebounce`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `search-engine-card.tsx`, `orders-mail-list.ios.tsx`, `location-contents.ts`, `useScreenEnter`, `copy-button.tsx`, `apple-sign-in.ts`, `sell-motor-sheet.tsx`, `goBackOrReplace`, `useFloatingTabBarInset`, `location-screen.tsx`, `use-search-idle-data.ts`, `advances.ts`, `team-employee-card.tsx`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `Text` connect `team-employee-card.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `text.tsx`, `create-order-screen.tsx`, `index.ts`, `app-tab-bar.tsx`, `expo-blur`, `order-detail-screen.tsx`, `use-subscription.ts`, `useTheme`, `activity-notification-row.tsx`, `firestore-timestamp.ts`, `notifications-settings-screen.tsx`, `scan-screen.tsx`, `currency-screen.tsx`, `paywall.tsx`, `subscription-registry.ts`, `auth-gate.tsx`, `@gorhom/bottom-sheet`, `haptics`, `use-scan-experience.ts`, `index.ts`, `scan-product-sheet.tsx`, `mc-featured-insight.tsx`, `@react-native-async-storage/async-storage`, `order-composition-step.tsx`, `rhythm`, `team-invite-card.tsx`, `empty-state.tsx`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `profile-screen.tsx`, `ac-payroll-list.tsx`, `apple-sign-in.ts`, `priority-router.ts`, `input-field.tsx`, `animated-tab-screen.tsx`, `labels.ts`, `firebase`, `cache-settings-screen.tsx`, `modules.ts`, `ac-payroll-list.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `search-engine-card.tsx`, `orders-mail-list.ios.tsx`, `location-contents.ts`, `useScreenEnter`, `copy-button.tsx`, `apple-sign-in.ts`, `useFloatingTabBarInset`, `location-screen.tsx`, `use-search-idle-data.ts`, `diagnostics-settings-screen.tsx`, `advances.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `useSession()` connect `in-app-banner-provider.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `index.ts`, `index.ts`, `expo-blur`, `index.ts`, `useTheme`, `auth-provider.tsx`, `activity-notification-row.tsx`, `firestore-timestamp.ts`, `currency-screen.tsx`, `inventory.ts`, `expo-status-bar`, `use-scan-experience.ts`, `index.ts`, `scan-product-sheet.tsx`, `@react-native-async-storage/async-storage`, `order-composition-step.tsx`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `@react-native-community/netinfo`, `my-earnings-screen.tsx`, `@shopify/flash-list`, `autocomplete-provider.tsx`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `apple-sign-in.ts`, `priority-router.ts`, `app-loading-screen.tsx`, `tab-transition-context.tsx`, `work-order.ts`, `location-contents.ts`, `useScreenEnter`, `apple-sign-in.ts`, `goBackOrReplace`, `diagnostics-settings-screen.tsx`, `advances.ts`, `team-employee-card.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1309 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04355492858402398 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07740112994350283 - nodes in this community are weakly interconnected._