# Graph Report - autocore-mobile  (2026-08-12)

## Corpus Check
- 1144 files · ~988,880 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5299 nodes · 18330 edges · 235 communities (167 shown, 68 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 86 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77c52f69`
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
- expo-blur
- useRbacPolicy
- company-settings-screen.tsx
- expo-auth-session
- expo-router
- flash-list.tsx
- @react-native-community/netinfo
- react-native-gesture-handler
- @react-native-google-signin/google-signin
- NATIVE_TAB_BAR_HEIGHT

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 512 edges
2. `Text` - 256 edges
3. `workOsColors()` - 213 edges
4. `haptics` - 162 edges
5. `WORK_OS_FIXTURE_ORDERS` - 122 edges
6. `useSession()` - 111 edges
7. `workOsSpace` - 110 edges
8. `useReducedMotion()` - 110 edges
9. `workOsType` - 109 edges
10. `rhythm` - 105 edges

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

## Communities (235 total, 68 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.12
Nodes (31): CREATE_HREF, HOME_HREF, JOIN_HREF, OrganizationCard, OrgCardProps, styles, SwitchOrganizationScreen(), HomeHeader() (+23 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.13
Nodes (16): ActionRoute(), AnimatedPressable, canUseLiquidGlass(), CenterAction(), DockItem(), LiquidGlassTabBar, LiquidGlassTabBarInner(), styles (+8 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.08
Nodes (55): purchasablePlans(), skuForPlan(), isDevModeActive(), clearEntitlementCaches(), peekEntitlement(), setLocalSubscriptions(), asPurchaseFailure(), failure() (+47 more)

### Community 3 - "text.tsx"
Cohesion: 0.06
Nodes (34): CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, fontMap, radiusMap, sizeMap, UserAvatar(), METRICS (+26 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.16
Nodes (22): dateMs(), comparePlans(), highestPlan(), PlanAvailability, PlanDescriptor, planForSku(), PLANS, TIER_RANK (+14 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (32): ScreenEnterConfig, useScaleEnter(), enterValues, cardLift, cardPress, dialogBackdropEnter, dialogBackdropExit, dialogEnter (+24 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.06
Nodes (53): FormListRow(), FormListSplitRow(), GroupedList(), GroupedSection(), SheetNavButton(), SummaryRow(), useOrderCompositionForm(), UseOrderCompositionFormOptions (+45 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.09
Nodes (27): ActivityFeedFiltersProps, READ_FILTERS, DeliveryChannels, isServerCategoryEnabled(), PRIORITY_BASE, resolveDeliveryChannels(), resolveLiveEditingChannels(), resolveSyncChannels() (+19 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.02
Nodes (140): ThroughputBarsProps, TrendSparklineProps, ActiveJobHero, ActiveJobHeroProps, useScheme(), ActivityRow, ActivityRowProps, useScheme() (+132 more)

### Community 9 - "index.ts"
Cohesion: 0.10
Nodes (29): resolveInviteHref(), notifyApiError(), notifyNetworkStatus(), buildImportDeepLink(), buildOrderDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink(), AI_EVENTS (+21 more)

### Community 10 - "index.ts"
Cohesion: 0.11
Nodes (37): CreateOrderScreen(), clientRepository, useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useEmployeesRealtime(), useInventoryCatalog(), useInventorySearch() (+29 more)

### Community 11 - "index.ts"
Cohesion: 0.10
Nodes (28): CoCard(), CoCardProps, CoSection(), CoSectionProps, CoToggleRow(), BUILTIN_CATEGORY_SUGGESTIONS, CreateOperationScreen(), parseAmountInput() (+20 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.15
Nodes (16): presentOrganizationSwitcher(), profileRouteHref(), SETTINGS_ROUTES, settingsRouteHref(), AccountScreen(), resolveProvider(), ROLE_LABELS, AdvancedScreen() (+8 more)

### Community 14 - "index.ts"
Cohesion: 0.08
Nodes (44): CheckCircle2Icon, ClockIcon, CloudIcon, WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, BannerContent, contentFor(), PurchaseStatusBanner() (+36 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.05
Nodes (44): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+36 more)

### Community 16 - "useTheme"
Cohesion: 0.09
Nodes (33): averageOfPoints(), buildWeeklyClosedCounts(), closedCountInRange(), insightChartIsUseful(), startOfDay(), WEEK_LABELS, OverviewBody(), ActivityCategory (+25 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.07
Nodes (49): ChartPoint, LineChart, LineChartProps, Menu(), MenuItem, MenuProps, StyleSheetFill, StackScreen() (+41 more)

### Community 18 - "Text"
Cohesion: 0.31
Nodes (14): ThroughputBars, TrendSparkline, BrowseTile, FilterChipRow, HealthRing, HighlightCard, KPIStrip, MetricHero (+6 more)

### Community 19 - "radius"
Cohesion: 0.12
Nodes (29): scanSheetAnimationConfigs, ScanCandidatesSheetProps, ScanCodePickerSheetProps, ScanDocumentSheetProps, ScanMoveSheetProps, ScanNotFoundSheetProps, ScanProductSheetProps, ScanProductThumb() (+21 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.05
Nodes (66): ExternalLinkIcon, MailIcon, Share2Icon, OrganizationMembershipRow, InvitePreviewCard(), TeamInvitePresentOptions, TeamInviteSheet, TeamInviteSheetProps (+58 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.17
Nodes (12): resolveScheme(), ThemeProvider(), platform, defaultShadow(), floatingShadow(), ElevationLevel, getElevation(), blend() (+4 more)

### Community 22 - "getJson"
Cohesion: 0.09
Nodes (22): CollectionSwitchRow, SettingsToggleRowProps, ACCOUNTING_DEMO, PERMISSION_GROUPS, AppearanceSettingsScreen(), THEME_OPTIONS, ACCENT_COLORS, AppearanceSettingsState (+14 more)

### Community 23 - "types.ts"
Cohesion: 0.18
Nodes (16): CompanyJourneyScreen(), CompanyMode, InviteAcceptScreen(), InviteAcceptScreenProps, clearPendingInvite(), storePendingInvite(), mobilePost(), acceptInvite() (+8 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.14
Nodes (17): ImagesIcon, AnalyticsCard, AnalyticsCardProps, MarketplaceCard, MarketplaceCardProps, statusTone, NotificationCard, NotificationCardProps (+9 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.06
Nodes (60): ActivityIcon, ArrowUpRightIcon, BarChart3Icon, BellIcon, BoxIcon, CarIcon, ChevronDownIcon, ChevronsUpDownIcon (+52 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.38
Nodes (5): workspaceImport(), WorkspaceAccessScreen(), getWorkspaceAccessCopy(), WorkspaceAccessCopy, productCta

### Community 27 - "useAuth"
Cohesion: 0.12
Nodes (33): ActionItem, AiCapability, AiCapabilityId, HomeSectionId, HomeSectionSpec, SearchScopeId, ShellModel, ShellTabId (+25 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.10
Nodes (27): CATEGORY_HINTS, NotificationsSettingsScreen(), useNotificationInboxRealtime(), useNotificationInbox(), useNotificationPreferences(), stripUndefinedDeep(), mergeNotificationPreferences(), NotificationProvider() (+19 more)

### Community 29 - "paywall.tsx"
Cohesion: 0.07
Nodes (43): OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), SourceLayout, useOrderTransition(), OrderRow, OrderRowBody(), OrderRowProps (+35 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.13
Nodes (11): HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs, InlineAutocompleteRow, InlineAutocompleteRowProps (+3 more)

### Community 31 - "types.ts"
Cohesion: 0.17
Nodes (13): AutocompleteOverlay, AutocompleteOverlayProps, DockPanelProps, getAutocompleteDataSnapshot(), applySuggestion(), replaceLastToken(), AutocompleteReplaceMode, AutocompleteSession (+5 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.10
Nodes (25): ArrowRightIcon, Loader2Icon, AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AuthEmailPill(), AuthEmailPillProps, AuthHeroShell() (+17 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.05
Nodes (62): usePressAnimation(), ScanSearchIcon, SearchIcon, Badge(), ListSkeleton(), JourneyOptionCard(), profileSpring, profileTimeline (+54 more)

### Community 34 - "haptics"
Cohesion: 0.05
Nodes (39): FlashlightIcon, ScreenActionFooter(), ScreenActionFooterProps, DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps (+31 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.09
Nodes (39): FlashList, OptimizedListProps, inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode(), parseFilter(), SearchScreen(), WarehouseFilter (+31 more)

### Community 36 - "index.ts"
Cohesion: 0.18
Nodes (16): CurrencyScreen(), useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), AppDisplayCurrency, formatAppMoney(), formatAppMoneyExample(), APP_MONEY_BASE_CURRENCY (+8 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.12
Nodes (29): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile() (+21 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.07
Nodes (46): useCompanySubscription(), useEntitlement(), useEntitlementFor(), UseEntitlementResult, planById(), CachedEntitlement, CachedSubscription, date() (+38 more)

### Community 39 - "rhythm"
Cohesion: 0.07
Nodes (33): SearchFilters(), SearchFiltersProps, catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery() (+25 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.10
Nodes (33): EngineThumbnail, EngineRow, EnginesScreen(), flattenVariants(), UnitSubtitle(), clean(), daysOnLot(), documentationLine (+25 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.13
Nodes (21): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+13 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.13
Nodes (26): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, useAuthReady(), AuthRedirectEffect() (+18 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.16
Nodes (22): PushRegistrationHead(), registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken(), fetchExpoPushTokenViaExperienceId() (+14 more)

### Community 44 - "index.ts"
Cohesion: 0.08
Nodes (66): BOARD_KEYS, DOCS, WorkOsCatalogHarness(), WorkOsStoryboard00(), WorkOsStoryboard01(), WorkOsStoryboard02(), WorkOsStoryboard03(), WorkOsStoryboard04() (+58 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.09
Nodes (55): useAccountingData(), UseAccountingDataResult, CashFlowPeriod, InvoiceStatus, TrendTone, buildWeekRevenueBars(), computeMonthRevenueGrowth(), computeWeekRevenueGrowth() (+47 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.07
Nodes (52): parseFeature(), PaywallRoute(), CheckIcon, LifeBuoyIcon, LockIcon, FeatureGate(), FeatureGateProps, FeatureLockedCard() (+44 more)

### Community 47 - "inventory.ts"
Cohesion: 0.06
Nodes (25): WORK_OS_DESIGN_DOC_0, WORK_OS_DESIGN_DOC_1, WORK_OS_DESIGN_DOC_2, WORK_OS_DESIGN_DOC_3, WORK_OS_DESIGN_DOC_4, WORK_OS_DESIGN_DOC_5, WORK_OS_DESIGN_DOC_6, WORK_OS_DESIGN_DOC_7 (+17 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.07
Nodes (27): @autocore/billing, @autocore/org, clsx, expo-constants, expo-notifications, expo-sharing, expo-splash-screen, @gorhom/bottom-sheet (+19 more)

### Community 50 - "index.ts"
Cohesion: 0.09
Nodes (30): allStoreSkus(), CODE_MAP, isPurchaseFailure(), MESSAGES, readErrorCode(), toPurchaseFailure(), connect(), disconnect() (+22 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.05
Nodes (54): HomeRoute(), OverviewScreen(), OverviewSnapshot, useSessionBootstrapReady(), Listener, listeners, resetAppShellReady(), setAppShellReady() (+46 more)

### Community 52 - "types.ts"
Cohesion: 0.34
Nodes (17): filterAutocompleteOptions(), uniqueAutocompleteOptions(), computeMatchRanges(), inferEngineFuelBadge(), mergeEngineCustomOptions(), searchAutocomplete(), searchCategories(), searchCustomers() (+9 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.13
Nodes (27): MapPinIcon, catalogRowPosition, EngineLocationSheet, EngineLocationSheetProps, LocationPickRow(), Row, useModulesConfigStore, compareLocations() (+19 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.09
Nodes (36): buildWorkModel(), buildWorkToday(), EMPTY_WORK_COUNTS, fallback(), groupThousands(), plural(), ResolvedDetail, resolveEngines() (+28 more)

### Community 55 - "toneBackground"
Cohesion: 0.10
Nodes (10): ScanLauncherButton(), ScanLauncherButtonProps, ScanLauncherRow(), ScanEntityKind, PendingScanContext, scanContextStore, ScanCommitResult, ScanDebounce (+2 more)

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.07
Nodes (39): EllipsisIcon, PhoneIcon, OrderCard, OrderCardProps, SF, OrderClaimSection(), OrderClaimSectionProps, LineRow() (+31 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.15
Nodes (25): applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems(), paginateItems() (+17 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.21
Nodes (20): operationAccountDetail(), CoMixedSplit(), CoMixedSplitProps, formatDraft(), accountForPaymentMethod(), accumulateOperationBalance(), buildMixedPaymentFields(), defaultMixedSplit() (+12 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.10
Nodes (23): AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, SellMotorSheetProps, assertValidPayload(), createFinancialOperation(), CreatePayload, createTypedFinancialOperation() (+15 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.17
Nodes (10): ActivityCard, ActivityCardProps, BusinessCardShell(), BusinessCardShellProps, CustomerCard, CustomerCardProps, OrderCard, OrderCardProps (+2 more)

### Community 61 - "ScanService"
Cohesion: 0.12
Nodes (27): mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), disambiguateScanPayload(), pickScanCandidate() (+19 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.34
Nodes (10): ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), canUseNativeGoogleSignIn(), configureNativeGoogleSignIn() (+2 more)

### Community 63 - "include"
Cohesion: 0.07
Nodes (27): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+19 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.05
Nodes (75): ScreenGate(), EngineIntakeLaunch(), IntakeLaunchCard(), IntakeCamera, IntakeCameraHandle, IntakeCameraProps, IntakeCreateIdentityDraft, IntakeCreateSerialSheet (+67 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.12
Nodes (23): smoothEase, staggerDelay(), animationSpeed, borderStyle(), buttonHeight, A11ySlice, designLanguageFromScheme(), defaultEasing (+15 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.12
Nodes (21): styles, TabLayout(), reconcileIntakeSyncLocalNotification(), APP_ICON, ensureLiveActivityAppIconUri(), OperationsLiveActivityHost(), OperationsLiveActivity, OperationsLiveActivityProps (+13 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.26
Nodes (11): ComposerVehicleForm, useWorkOrderComposerOptions(), vehiclesInContext(), AutocompleteOption, brandByKey, brands, CatalogBrand, listVehicleMakes() (+3 more)

### Community 68 - "mobilePost"
Cohesion: 0.11
Nodes (23): useAuth(), useAuthActions(), AuthShell(), ForgotPasswordScreen(), isValidEmail(), SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, Input (+15 more)

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.08
Nodes (23): DesignSystemScreen(), GripVerticalIcon, CollectionList(), CollectionListProps, CollectionRowProps, CollectionSwitchRowProps, pressTiming, SwipeableRow() (+15 more)

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.09
Nodes (40): PendingAdd, useAddToOrderFlow(), CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart(), OptionRow() (+32 more)

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
Nodes (18): body, callout, caption1, caption2, fontFamily, fontWeight, footnote, headline (+10 more)

### Community 75 - "animated-tab-screen.tsx"
Cohesion: 0.15
Nodes (18): AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES (+10 more)

### Community 77 - "styles.ts"
Cohesion: 0.03
Nodes (74): ArrowLeftIcon, XIcon, AuthEmailChipProps, AuthHeroCar(), AuthHeroShellProps, HeroBackdrop(), AuthSocialCluster(), AuthSocialClusterProps (+66 more)

### Community 78 - "labels.ts"
Cohesion: 0.18
Nodes (10): HorizontalFilterBar(), HorizontalFilterBarProps, HorizontalFilterOption, TabLayout, AcTabBar(), AcTabBarProps, AcTabPanel(), AcTabPanelProps (+2 more)

### Community 79 - "classify-payload.ts"
Cohesion: 0.27
Nodes (8): useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), INVENTORY_ITEM_STATUSES, INVENTORY_ITEM_TYPES, MobileQuickAdjustResult, MobileScanItem, MobileScanStockLevel

### Community 80 - "profile.ts"
Cohesion: 0.06
Nodes (70): OAuthProvider, AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore() (+62 more)

### Community 81 - "cache-settings-screen.tsx"
Cohesion: 0.24
Nodes (8): AppleIcon(), BrandIconProps, GoogleIcon(), AuthProviderKind, badgeSize, monogramFontSize, UserAvatarProps, UserAvatarSize

### Community 82 - "modules.ts"
Cohesion: 0.08
Nodes (54): HomeDashboard, useHomeDashboard(), ACTIVE_INTAKE, buildAiInsight(), buildAttentionRows(), buildHomeNow(), buildHomeToday(), buildHomeTrend() (+46 more)

### Community 83 - "location-screen.tsx"
Cohesion: 0.09
Nodes (21): AuthBootLoadingProps, APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON (+13 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.04
Nodes (104): PlusIcon, TrendingDownIcon, resolveTabRouteName(), resolveCurrentTab(), resolveTabFromHref(), TabNavigateTarget, useNavigateTab(), acTimeline (+96 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.21
Nodes (8): computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters, isOpenOrderStatus(), OrderFilterOption, OrdersListMeta

### Community 86 - "ScanDebounce"
Cohesion: 0.25
Nodes (10): ObjectsLayout(), AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), formSheetScreenOptions(), NavigationPolicy (+2 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.09
Nodes (22): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Dynamic Island (iOS Live Activities), Floating dock, Home (Mission Control) (+14 more)

### Community 88 - "work-order.ts"
Cohesion: 0.25
Nodes (5): CreateInventoryItemScreen(), parseNumber(), CreateInventoryItemInput, useMobileCreateInventoryItem(), MobileCreateInventoryItemResult

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.18
Nodes (23): mobilePatch(), backfillTeamNotifications(), fetchNotificationInbox(), InboxResponse, markAllNotificationsRead(), markNotificationState(), PreferencesResponse, updateNotificationPreferences() (+15 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.11
Nodes (17): ActivityDateGroup(), ActivityDateGroupProps, ActivityFeedFilters(), ActivityNotificationRow, ActivityNotificationRowProps, SwipeActionProps, NotificationInboxSkeleton(), DateGroup (+9 more)

### Community 92 - "kv.ts"
Cohesion: 0.22
Nodes (7): AnimatedLine, FRONT_WHEEL, HERO_DISPLAY_HEIGHT, HERO_DISPLAY_WIDTH, REAR_WHEEL, SPEED_LINES, WheelProps

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.15
Nodes (12): CollectionRow, ProfileScreenShell(), ProfileScreenShellProps, CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), ModulesScreen(), TaxesSettingsScreen() (+4 more)

### Community 95 - "invite-accept-screen.tsx"
Cohesion: 0.33
Nodes (10): useListStaggerDelay(), canCancelJob(), canEditIdentity(), IntakeJobRow(), IntakeJobRowBody(), IntakeJobRowProps, jobSerial(), jobSubtitle() (+2 more)

### Community 96 - "location-contents.ts"
Cohesion: 0.28
Nodes (6): InventoryCard, InventoryCardProps, LocationBadge, LocationBadgeProps, StockBadge, StockBadgeProps

### Community 97 - "create-operation-screen.tsx"
Cohesion: 0.31
Nodes (6): VersionSettingsScreen(), formatPlatformPhone(), getPlatformContacts(), PlatformContacts, readEnv(), openPhone()

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.43
Nodes (6): useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled(), DesignLanguageContext

### Community 100 - "apple-sign-in.ts"
Cohesion: 0.17
Nodes (15): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), fetchJsonWithTimeout(), AppleSignInApiPayload, AppleSignInApiResponse (+7 more)

### Community 101 - "sell-motor-sheet.tsx"
Cohesion: 0.14
Nodes (10): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, isTabRouteName(), NO_TRANSITION, TAB_ORDER, TabRouteName, TabTransitionContext (+2 more)

### Community 102 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+5 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.07
Nodes (42): EditProfileScreen(), isEmailProvider(), CompanyEmployeeRow, useCompanyEmployees(), useMobileQuickReceive(), useUserPhotoUrl(), appendLocalFile(), createLocalFileFormData() (+34 more)

### Community 105 - "search-registry.ts"
Cohesion: 0.42
Nodes (7): AnimatedPolyline, buildPoints(), estimatePathLength(), McAnimatedSparkline(), McAnimatedSparklineProps, buildSparklinePoints(), sanitizeChartSeries()

### Community 106 - "location-screen.tsx"
Cohesion: 0.44
Nodes (8): fieldKey(), readFieldValues(), readRecentValues(), rememberFieldValue(), rememberRecentValue(), storageKey(), setJson(), saveExtendedPrefs()

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
Cohesion: 0.27
Nodes (7): NotFoundScreen(), AnimatedIconWrapper, createIcon(), IconState, useDesignLanguage(), IconSize, iconSizes

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.03
Nodes (94): useCardLift(), AlertTriangleIcon, AuthDivider(), normalizeCode(), VerificationCodeInput(), VerificationCodeInputProps, AnimatedPath, AppLoadingLogo() (+86 more)

### Community 113 - "advances.ts"
Cohesion: 0.10
Nodes (34): DevSubscriptionPanel(), OfflineNotice(), SyncIndicator(), SyncIndicatorProps, IncludedRow(), IncludedRowProps, ManageSubscriptionScreen(), UpgradeCallout() (+26 more)

### Community 114 - "team-employee-card.tsx"
Cohesion: 0.21
Nodes (10): ActionSheetHost(), styles, GlassSheen, styles, WorkScreen(), ActionSheetState, useActionSheetStore, useShellModel() (+2 more)

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
Cohesion: 0.18
Nodes (12): ListSection(), AiBlockList(), Props, AiActionBlock, AiConfirmationBlock, AiMetricBlock, AiObjectCardBlock, AiTextBlock (+4 more)

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.03
Nodes (87): IconProps, CopyIcon, AuthenticatedLandingScreen(), QuickActionCard, TabScreenPlaceholder(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps (+79 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.46
Nodes (7): buildOperationsCsv(), escapeCsv(), operationToCsvRow(), shareOperationsCsv(), operationAccountLabel(), operationCategoryLabel(), operationTypeLabel()

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.33
Nodes (5): EngineStatus, EngineStatusProps, EngineStatusType, labels, toneMap

### Community 141 - "use-subscription.ts"
Cohesion: 0.12
Nodes (21): AutocompleteInput, COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabPanel(), ComposerTabPanelProps, resolveEntering(), resolveExiting() (+13 more)

### Community 142 - "expo-blur"
Cohesion: 0.16
Nodes (18): AccountingScreen(), ADVANCE_KEYWORDS, AdvanceDirection, advanceDirectionLabel(), AdvanceSnapshot, appendAdvanceMarker(), buildAdvanceSnapshot(), filterAdvanceOperations() (+10 more)

### Community 146 - "activity-notification-row.tsx"
Cohesion: 0.40
Nodes (4): EngineCard, EngineCardProps, statusLabel, statusTone

### Community 148 - "expo-haptics"
Cohesion: 0.33
Nodes (3): WORK_OS_DAY_FIXTURES, WORK_OS_INTAKE_FIXTURES, WorkOsIntakeFixtureJob

### Community 150 - "orders-filters.tsx"
Cohesion: 0.50
Nodes (5): downloadToCache(), buildEnginePhotoFilename(), PHOTO_MIME_BY_EXTENSION, PHOTO_UTI_BY_EXTENSION, photoExtension()

### Community 155 - "expo-sharing"
Cohesion: 0.29
Nodes (14): EMPTY, useAccountingPreferences(), useUserDisplayCurrency(), normalizeAppDisplayCurrency(), AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings(), patchAccountingSettings() (+6 more)

### Community 156 - "inventory.ts"
Cohesion: 0.04
Nodes (86): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, EMPTY_JOB_DETAIL (+78 more)

### Community 157 - "expo-status-bar"
Cohesion: 0.14
Nodes (14): cornerStyle, layoutRhythm, toneStyles(), touchTarget, ringBorder(), createCardStyle(), createIconBadgeStyle(), createInputTextStyle() (+6 more)

### Community 159 - "@autocore/billing"
Cohesion: 0.50
Nodes (3): StickyActionBar, StickyActionBarProps, workOsElevation

### Community 161 - "@gorhom/bottom-sheet"
Cohesion: 0.05
Nodes (37): AuthEmailChip(), AuthBackdrop(), AuthShellProps, ProgressBar(), InviteFormNotice(), InviteFormNoticeProps, DemoModeBanner(), DemoModeBannerProps (+29 more)

### Community 169 - "@react-native-community/netinfo"
Cohesion: 0.50
Nodes (3): opacity, OpacityKey, semanticOpacity

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.21
Nodes (8): NAV_ITEM_DEFINITIONS, NavItemId, EXPO_TAB_HREFS, isNavItemModuleEnabled(), isNavItemVisible(), NavModuleFlags, isMobileNavItemAllowed(), NAV_TO_TAB

### Community 178 - "tailwind-merge"
Cohesion: 0.07
Nodes (50): AppProviders(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, QUICK_CATEGORIES, useSearchIdleData(), clearScheduledQueryDataApplies(), CachedRealtimeSnapshot, clearRealtimeSnapshots() (+42 more)

### Community 199 - "priority-router.ts"
Cohesion: 0.29
Nodes (4): BreakpointKey, breakpoints, screen, { width, height }

### Community 202 - "auth-store.ts"
Cohesion: 0.08
Nodes (39): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES (+31 more)

### Community 205 - "goBackOrReplace"
Cohesion: 0.35
Nodes (9): isSameStackInboxReturn(), notificationInboxHref(), NotificationInboxReturnTo, OpenInboxRouter, openNotificationInbox(), resolveInboxReturnToFromSegments(), resolveInboxReturnToFromTab(), RETURN_TO_KEYS (+1 more)

### Community 209 - "useScreenEnter"
Cohesion: 0.17
Nodes (18): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload(), ScanDocumentUploadResult, uploadScanDocument(), RecentScan (+10 more)

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.10
Nodes (33): FilterIcon, IosLiftMenuItem, OrdersLoadingState(), OrdersLiftContext, OrdersLiftContextValue, OrdersLiftProvider(), OrdersLiftSession, useOrdersLift() (+25 more)

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.11
Nodes (21): ProfileHeader(), ProfileHeroCard(), ProfileHeroCardProps, PROFILE_ROUTES, profileHubRouteHref(), ProfileHubRow, ProfileScreen(), ProfileDangerAction (+13 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.04
Nodes (63): useShimmer(), CameraIcon, ChevronRightIcon, AUTH_BUTTON_HEIGHT, AuthOAuthButton(), AuthOAuthButtonProps, styles, getOAuthButtonTheme() (+55 more)

### Community 219 - "orders-mail-list.ios.tsx"
Cohesion: 0.06
Nodes (44): scanSpring, scanTimeline, ScanCandidatesSheet, ScanCodePickerSheet, ScanConfirmFlash(), ScanConfirmFlashProps, normalizeBounds(), ScanDetectionOverlay() (+36 more)

### Community 227 - "useRbacPolicy"
Cohesion: 0.17
Nodes (15): Can(), CanProps, RequirePermission(), RequirePermissionProps, formatMoney(), MyEarningsScreen(), useWorkCounts(), isAwaitingPlacement() (+7 more)

### Community 231 - "company-settings-screen.tsx"
Cohesion: 0.53
Nodes (5): useFadeIn(), usePageEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps

## Knowledge Gaps
- **1275 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1270 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **68 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `diagnostics-settings-screen.tsx` to `search-registry.ts`, `create-operation-screen.tsx`, `authenticated-landing-screen.tsx`, `text.tsx`, `create-order-screen.tsx`, `index.ts`, `index.ts`, `use-subscription.ts`, `app-tab-bar.tsx`, `order-detail-screen.tsx`, `index.ts`, `auth-provider.tsx`, `radius`, `firestore-timestamp.ts`, `getJson`, `types.ts`, `scan-screen.tsx`, `useReducedMotion`, `paywall.tsx`, `subscription-registry.ts`, `auth-gate.tsx`, `@gorhom/bottom-sheet`, `haptics`, `mc-featured-insight.tsx`, `order-composition-step.tsx`, `empty-state.tsx`, `push-channel.ts`, `toneBackground`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `mobilePost`, `ac-payroll-list.tsx`, `apple-sign-in.ts`, `input-field.tsx`, `auth-store.ts`, `styles.ts`, `labels.ts`, `cache-settings-screen.tsx`, `ac-payroll-list.tsx`, `app-loading-screen.tsx`, `ScanDebounce`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `work-order.ts`, `search-engine-card.tsx`, `orders-mail-list.ios.tsx`, `kv.ts`, `invite-accept-screen.tsx`, `useRbacPolicy`, `copy-button.tsx`, `sell-motor-sheet.tsx`, `useFloatingTabBarInset`, `use-search-idle-data.ts`, `advances.ts`, `team-employee-card.tsx`, `inline-autocomplete.tsx`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `Text` connect `text.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `index.ts`, `use-subscription.ts`, `index.ts`, `order-detail-screen.tsx`, `app-tab-bar.tsx`, `auth-provider.tsx`, `activity-notification-row.tsx`, `radius`, `firestore-timestamp.ts`, `getJson`, `types.ts`, `notifications-settings-screen.tsx`, `scan-screen.tsx`, `useReducedMotion`, `currency-screen.tsx`, `paywall.tsx`, `subscription-registry.ts`, `auth-gate.tsx`, `@gorhom/bottom-sheet`, `haptics`, `mc-featured-insight.tsx`, `index.ts`, `scan-product-sheet.tsx`, `use-scan-experience.ts`, `order-composition-step.tsx`, `empty-state.tsx`, `push-channel.ts`, `toneBackground`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `setup-wizard-screen.tsx`, `mobilePost`, `ac-payroll-list.tsx`, `apple-sign-in.ts`, `input-field.tsx`, `auth-store.ts`, `animated-tab-screen.tsx`, `styles.ts`, `labels.ts`, `cache-settings-screen.tsx`, `ac-payroll-list.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `search-engine-card.tsx`, `orders-mail-list.ios.tsx`, `deep-link-resolver.ts`, `invite-accept-screen.tsx`, `location-contents.ts`, `useFloatingTabBarInset`, `diagnostics-settings-screen.tsx`, `advances.ts`, `inline-autocomplete.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `useSession()` connect `useRbacPolicy` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `create-order-screen.tsx`, `index.ts`, `index.ts`, `use-work-order-composer-options.ts`, `app-tab-bar.tsx`, `expo-blur`, `index.ts`, `useTheme`, `auth-provider.tsx`, `firestore-timestamp.ts`, `scan-screen.tsx`, `currency-screen.tsx`, `inventory.ts`, `mc-featured-insight.tsx`, `haptics`, `use-scan-experience.ts`, `index.ts`, `scan-product-sheet.tsx`, `getFirebaseDb`, `order-composition-step.tsx`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `my-earnings-screen.tsx`, `empty-state.tsx`, `tailwind-merge`, `push-channel.ts`, `autocomplete-provider.tsx`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `mobilePost`, `apple-sign-in.ts`, `auth-store.ts`, `styles.ts`, `profile.ts`, `modules.ts`, `ac-payroll-list.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `work-order.ts`, `search-engine-card.tsx`, `orders-mail-list.ios.tsx`, `diagnostics-settings-screen.tsx`, `advances.ts`, `team-employee-card.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1275 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11740890688259109 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12648221343873517 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07540983606557378 - nodes in this community are weakly interconnected._