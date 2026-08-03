# Graph Report - autocore-mobile  (2026-08-03)

## Corpus Check
- 853 files · ~337,444 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4260 nodes · 13531 edges · 220 communities (157 shown, 63 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ab4989d`
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
- open-finance-settings.ts
- useFadeIn
- @autocore/avatars
- sidebar.tsx
- useScreenEnter
- sidebar.tsx
- CollectionSwitchRow
- app-loading-screen.tsx
- in-app-banner-provider.tsx
- tab-transition-context.tsx
- invite-service.ts
- @autocore/rbac
- recent-scans.ts
- expo-blur

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 410 edges
2. `Text` - 210 edges
3. `haptics` - 132 edges
4. `rhythm` - 94 edges
5. `useSession()` - 90 edges
6. `useReducedMotion()` - 84 edges
7. `getFirebaseDb()` - 81 edges
8. `normalizeCompanyId()` - 67 edges
9. `spacing` - 65 edges
10. `toneBackground()` - 62 edges

## Surprising Connections (you probably didn't know these)
- `ThemeProvider()` --indirect_call--> `base()`  [INFERRED]
  hooks/use-theme.tsx → lib/subscriptions/dev-mode.ts
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  animations/presets.ts → hooks/use-accessibility.ts
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  authentication/auth-provider.tsx → services/auth/apple-sign-in.ts
- `useAuthReady()` --calls--> `useAuthStore`  [EXTRACTED]
  authentication/auth-provider.tsx → store/auth-store.ts
- `AppLoadingLogo()` --calls--> `useReducedMotion()`  [EXTRACTED]
  components/brand/app-loading-logo.tsx → hooks/use-accessibility.ts

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`

## Communities (220 total, 63 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.05
Nodes (69): AutocompleteOverlay, AutocompleteOverlayProps, HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs (+61 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.08
Nodes (31): SLUG_TO_TYPE, notifyFirestoreSnapshotError(), toDateFromFirestore(), documentGenerationJobRepository, mapJob(), mapEmployee(), setEmployeePermissionOverrides(), setEmployeeRole() (+23 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.10
Nodes (43): planForSku(), isDevModeActive(), clearEntitlementCaches(), peekEntitlement(), asPurchaseFailure(), failure(), isCancellation(), emit() (+35 more)

### Community 3 - "text.tsx"
Cohesion: 0.24
Nodes (8): AppearanceSettingsScreen(), THEME_OPTIONS, ACCENT_COLORS, AppearanceSettingsState, DEFAULT_APPEARANCE, useAppearanceSettingsStore, AccentColorId, ThemePreference

### Community 4 - "team-screen.tsx"
Cohesion: 0.04
Nodes (49): DesignSystemScreen(), layoutTransition, styles, CollectionList(), CollectionListProps, CollectionRowProps, CollectionSwitchRowProps, pressTiming (+41 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (35): ScreenEnterConfig, useScaleEnter(), enterValues, presets, smoothEase, staggerDelay(), cardLift, cardPress (+27 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.06
Nodes (52): CreateOrderScreen(), FormCard(), SheetNavButton(), STEPS, StepTrail(), SummaryRow(), useOrderCompositionForm(), UseOrderCompositionFormOptions (+44 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.09
Nodes (31): OrderTransitionContext, OrderTransitionContextValue, SourceLayout, useOrderTransition(), OrderRow, OrderRowBody(), OrderRowProps, pressTiming (+23 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.20
Nodes (18): buildWeekRevenueBars(), computeMonthRevenueGrowth(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), resolveOverviewRevenue() (+10 more)

### Community 9 - "index.ts"
Cohesion: 0.16
Nodes (21): CompanySwitcherSheet(), CompanySwitcherSheetProps, OrganizationMembershipRow, profileRouteHref(), WorkspaceCompaniesSection(), WorkspaceCompaniesSectionProps, CompanySettingsScreen(), MODULE_LABELS (+13 more)

### Community 10 - "index.ts"
Cohesion: 0.17
Nodes (21): clientRepository, useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useEmployeesRealtime(), useInventoryCatalog(), useOperationsRealtime(), usePayrollTransactionsRealtime() (+13 more)

### Community 11 - "index.ts"
Cohesion: 0.10
Nodes (23): ImagesIcon, ActivityCard, ActivityCardProps, AnalyticsCard, AnalyticsCardProps, EngineStatus, EngineStatusProps, EngineStatusType (+15 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.05
Nodes (46): AutocompleteInput, createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema (+38 more)

### Community 14 - "index.ts"
Cohesion: 0.16
Nodes (15): OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, WarehouseFilter, StepperButton, WarehouseItemRow, WarehouseItemRowProps, wh (+7 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.05
Nodes (38): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+30 more)

### Community 16 - "useTheme"
Cohesion: 0.09
Nodes (29): HomeRoute(), OverviewScreen(), ActivityCategory, InsightTone, KpiTone, OverviewActivity, OverviewAttention, OverviewAttentionItem (+21 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.06
Nodes (58): useEntitlementFor(), dateMs(), devSubscription(), CachedEntitlement, CachedSubscription, date(), deserialize(), isCacheTrustworthy() (+50 more)

### Community 18 - "Text"
Cohesion: 0.10
Nodes (33): OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent(), ScanUnknownSheetProps, sheetPresentationKey(), useDevMockFallback(), useScanExperience(), classifyScanPayload() (+25 more)

### Community 19 - "radius"
Cohesion: 0.15
Nodes (26): setJson(), applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems() (+18 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.08
Nodes (43): CompanyEmployeeRow, useCompanyEmployees(), useCompanyProfile(), CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), normalizeCompanyId(), resolveCompanyIdsForSync() (+35 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.43
Nodes (6): useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled(), DesignLanguageContext

### Community 22 - "getJson"
Cohesion: 0.04
Nodes (94): TrendingDownIcon, AuthEmailChip(), AuthEmailChipProps, InviteFormNotice(), InviteFormNoticeProps, useNavigateTab(), DemoModeBanner(), DemoModeBannerProps (+86 more)

### Community 23 - "types.ts"
Cohesion: 0.11
Nodes (25): useCompanyInvites(), resolveWorkspaceAccessBlock(), WorkspaceAccessCopy, CompanyDocShape, ensureUserDocument(), loadFastUserProfile(), loadMemberships(), mergeProfileWithEmployee() (+17 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.24
Nodes (9): NotFoundScreen(), BusinessCardShell(), BusinessCardShellProps, EngineCard, EngineCardProps, statusLabel, statusTone, OrderCard (+1 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.14
Nodes (37): AccountingAttentionAction, AccountingQuickActionId, AccountingSnapshot, AttentionTone, CashFlowPeriod, InvoiceStatus, TransactionStatus, TrendTone (+29 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.12
Nodes (20): AccountingScreen(), AcAccountTiles, AcAccountingEmptyState(), AcBalanceCard, AcTabBar(), AcTabBarProps, AcTabPanel(), AcTabPanelProps (+12 more)

### Community 27 - "useAuth"
Cohesion: 0.22
Nodes (8): AppAccountTokenResponse, AppleVerificationRejection, RestoreApplePurchasesRequest, RestoreApplePurchasesResponse, subscriptionApi, VerifyApplePurchaseRequest, VerifyApplePurchaseResponse, BillingInterval

### Community 28 - "currency-screen.tsx"
Cohesion: 0.22
Nodes (11): ModulesEditorList(), ModulesEditorListProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModuleDefinition, ModulesConfigState, useModulesConfigStore (+3 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.14
Nodes (24): useRealtimeReconnect(), useSessionBootstrapReady(), clearScheduledQueryDataApplies(), clearRealtimeSnapshots(), acquireRealtimeSubscription(), applyCachedSnapshot(), areAcquiredSessionListenersReady(), areInteractiveSessionReady() (+16 more)

### Community 31 - "types.ts"
Cohesion: 0.04
Nodes (62): useShimmer(), PlusIcon, AuthBackdrop(), AuthShellProps, ProgressBar(), AuthSocialCluster(), AuthSocialClusterProps, NOTIFICATION_ROW_DIVIDER_INSET (+54 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.08
Nodes (52): ActivityIcon, ArrowRightIcon, ArrowUpRightIcon, BarChart3Icon, BellIcon, BoxIcon, CarIcon, ChevronDownIcon (+44 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.12
Nodes (29): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile() (+21 more)

### Community 34 - "haptics"
Cohesion: 0.10
Nodes (20): DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus, ImportSuccessView() (+12 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.17
Nodes (13): getOAuthButtonTheme(), OAuthButtonTheme, resolveScheme(), ThemeProvider(), defaultShadow(), floatingShadow(), ElevationLevel, getElevation() (+5 more)

### Community 36 - "index.ts"
Cohesion: 0.11
Nodes (37): EMPTY, useAccountingPreferences(), useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), useUserDisplayCurrency(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS (+29 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.08
Nodes (39): CreateInventoryItemInput, useMobileQuickReceive(), MobileAssignAssetResult, MobileRelocateResult, MobileWarehouseLocation, useMobileWarehouseLocations(), appendLocalFile(), createLocalFileFormData() (+31 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.34
Nodes (10): ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), canUseNativeGoogleSignIn(), configureNativeGoogleSignIn() (+2 more)

### Community 39 - "rhythm"
Cohesion: 0.15
Nodes (13): catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery(), quickCategories, recentlyViewedEngines (+5 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.13
Nodes (20): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabPanel(), ComposerTabPanelProps, resolveEntering(), resolveExiting(), CompositionAddCard() (+12 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.13
Nodes (21): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+13 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.18
Nodes (15): TabLayout(), getNavItemHref(), NavItemId, EXPO_TAB_HREFS, isNavItemModuleEnabled(), isNavItemVisible(), NavModuleFlags, resolveInitialTabHref() (+7 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.14
Nodes (22): MobileApiError, registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken(), fetchExpoPushTokenViaExperienceId() (+14 more)

### Community 44 - "index.ts"
Cohesion: 0.25
Nodes (7): CheckCircle2Icon, CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, sizeMap, OrganizationMembershipRowProps, styles

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.07
Nodes (38): AppleIcon(), BrandIconProps, GoogleIcon(), AuthProviderKind, badgeSize, monogramFontSize, UserAvatar(), UserAvatarProps (+30 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.06
Nodes (70): IconProps, CheckIcon, ClockIcon, CloudIcon, XIcon, Button, ActivityDateGroupProps, ActivityNotificationRow (+62 more)

### Community 47 - "inventory.ts"
Cohesion: 0.12
Nodes (22): parseFeature(), PaywallRoute(), LifeBuoyIcon, LockIcon, FeatureGate(), FeatureGateProps, FeatureLockedCard(), FeatureLockedCardProps (+14 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.08
Nodes (25): @autocore/billing, @autocore/org, expo-constants, expo-router, nativewind, dependencies, @autocore/billing, @autocore/org (+17 more)

### Community 50 - "index.ts"
Cohesion: 0.09
Nodes (32): allStoreSkus(), skuForPlan(), CODE_MAP, isPurchaseFailure(), MESSAGES, readErrorCode(), toPurchaseFailure(), connect() (+24 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.07
Nodes (53): AppProviders(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, reviveDatesDeep(), shouldReviveDateField(), markStartup(), queryClient, hydrateOne() (+45 more)

### Community 52 - "types.ts"
Cohesion: 0.10
Nodes (16): computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters, isOpenOrderStatus(), OrdersScreen(), OrdersState (+8 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.15
Nodes (18): AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES (+10 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.18
Nodes (22): useNotificationInboxRealtime(), backfillTeamNotifications(), fetchNotificationInbox(), InboxResponse, markAllNotificationsRead(), markNotificationState(), PreferencesResponse, fetchInboxFromFirestore() (+14 more)

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.06
Nodes (43): NativeContextMenu(), NativeContextMenuAction, NativeContextMenuProps, presentNativeMenu(), PresentNativeMenuOptions, OrderClaimSection(), OrderClaimSectionProps, LineRow() (+35 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.23
Nodes (12): isTabRouteName(), NO_TRANSITION, resolveTabRouteName(), TAB_ORDER, TabRouteName, TabTransitionContext, TabTransitionContextValue, TabTransitionProvider() (+4 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.09
Nodes (29): AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, CreateOperationScreen(), parseAmountInput(), readPreset(), buildOperationsCsv(), escapeCsv() (+21 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.15
Nodes (17): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), isValidEmail(), LoginScreen(), readInviteCompanyName(), readInviteEmail(), readInviteToken() (+9 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.10
Nodes (27): AuthShell(), ForgotPasswordScreen(), isValidEmail(), Input, CompanyJourneyScreen(), CompanyMode, OrgDangerZone(), OrgDangerZoneProps (+19 more)

### Community 61 - "ScanService"
Cohesion: 0.11
Nodes (30): mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), PendingScanContext, scanContextStore (+22 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.11
Nodes (32): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, workspaceImport(), useAuthHasAccess() (+24 more)

### Community 63 - "include"
Cohesion: 0.08
Nodes (25): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+17 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.12
Nodes (19): animationSpeed, buttonHeight, A11ySlice, defaultEasing, glassStyle, iconWeight, iosControls, layering (+11 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.14
Nodes (19): withAlpha(), borderStyle(), designLanguageFromScheme(), cornerStyle, surfaceStyle(), toneStyles(), touchTarget, pickMotion() (+11 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.15
Nodes (15): Can(), CanProps, RequirePermission(), RequirePermissionProps, buildWeekBars(), formatMoney(), MyEarningsScreen(), MyEarningsScreenProps (+7 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.14
Nodes (13): AuthBootLoadingProps, SPLASH_TO_LOGIN_SCALE, AuthLoadingScreen(), AuthLoadingScreenProps, AuthSplashSurface(), AuthSplashSurfaceProps, enterEase, exitEase (+5 more)

### Community 68 - "document-import-screen.tsx"
Cohesion: 0.16
Nodes (10): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, kindLabel(), LocationContentsResponse (+2 more)

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.14
Nodes (20): orderStatusLabel, SearchFilters(), SearchFiltersProps, searchFilters, parseFilter(), SearchScreen(), InventoryStatus, QuickCategory (+12 more)

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.10
Nodes (28): OAuthProvider, formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), fetchJsonWithTimeout(), AppleSignInApiPayload (+20 more)

### Community 71 - "mapAuthError"
Cohesion: 0.40
Nodes (3): CreateInventoryItemScreen(), parseNumber(), useMobileCreateInventoryItem()

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
Cohesion: 0.11
Nodes (26): PlanOffer, useSubscription(), UseSubscriptionResult, comparePlans(), highestPlan(), PlanAvailability, PlanDescriptor, PLANS (+18 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.23
Nodes (4): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, WarehouseScreen()

### Community 77 - "styles.ts"
Cohesion: 0.10
Nodes (16): useScreenEnter(), PhoneIcon, ordersSpring, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), OrderCard, OrderCardProps (+8 more)

### Community 78 - "inline-autocomplete-row.tsx"
Cohesion: 0.20
Nodes (9): ExternalLinkIcon, MailIcon, Share2Icon, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS, profileLayout (+1 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.14
Nodes (13): ACCOUNTING_DEMO, PERMISSION_GROUPS, AppearanceSettings, DemoPermission, NavItemConfig, PermissionGroupId, ProductModuleConfig, SettingsHubCard (+5 more)

### Community 80 - "profile.ts"
Cohesion: 0.08
Nodes (54): AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace() (+46 more)

### Community 81 - "document-import.ts"
Cohesion: 0.35
Nodes (10): ADVANCE_KEYWORDS, AdvanceDirection, AdvanceSnapshot, appendAdvanceMarker(), buildAdvanceSnapshot(), filterAdvanceOperations(), isAdvanceOperation(), isAdvancePaid() (+2 more)

### Community 82 - "modules.ts"
Cohesion: 0.24
Nodes (7): MapPinIcon, InventoryCard, InventoryCardProps, LocationBadge, LocationBadgeProps, StockBadge, StockBadgeProps

### Community 83 - "location-screen.tsx"
Cohesion: 0.20
Nodes (9): APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON, LOGIN_LOCKUP (+1 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.14
Nodes (13): PrinterIcon, AcMotorSaleDocumentsSheet, AcMotorSaleDocumentsSheetProps, AcMotorSaleDocumentsSheetRef, DocAction, AcOperationsList(), AcOperationsListProps, OperationRow (+5 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.08
Nodes (24): CollectionRow, ListSection(), ProfileScreenShell(), ProfileScreenShellProps, CurrencyScreen(), CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark() (+16 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.25
Nodes (10): AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), OrderTransitionProvider(), formSheetScreenOptions(), NavigationPolicy (+2 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.10
Nodes (19): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Icons, List dialects, Living gallery (+11 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.42
Nodes (8): can(), canEditInventory(), canEditWorkOrders(), canManageEmployees(), canManageSettings(), canViewEmployees(), canViewInventory(), canViewWorkOrders()

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.06
Nodes (51): ActivityFeedFiltersProps, READ_FILTERS, buildOrderDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType, ERROR_EVENTS, ErrorEventType (+43 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.11
Nodes (22): InAppBannerProvider(), NotificationBellButton(), NotificationBellButtonProps, ActivityDateGroup(), ActivityFeedFilters(), NotificationInboxSkeleton(), DateGroup, DateGroupKey (+14 more)

### Community 92 - "kv.ts"
Cohesion: 0.36
Nodes (9): useInventorySearch(), motorMatchesSearchQuery(), inventoryMatchesQuery(), compactAlphanumeric(), digitsOnly(), joinSearchFields(), matchesSearchQuery(), normalizeSearchQuery() (+1 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.19
Nodes (9): resolveInviteHref(), guardedPush(), PushRouter, navigationHrefKey(), stackNavigationGuard, buildImportDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink() (+1 more)

### Community 96 - "useFloatingTabBarInset"
Cohesion: 0.14
Nodes (14): useAccountingData(), UseAccountingDataResult, useSessionQueryData(), BalanceSnapshot, incomingTypes, outgoingTypes, PAYROLL_STATUS_LABELS, FinancialOperation (+6 more)

### Community 97 - "order-row.tsx"
Cohesion: 0.22
Nodes (7): AnimatedLine, FRONT_WHEEL, HERO_DISPLAY_HEIGHT, HERO_DISPLAY_WIDTH, REAR_WHEEL, SPEED_LINES, WheelProps

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.24
Nodes (7): Listener, listeners, resetAppShellReady(), setAppShellReady(), hasSeenCatalogApply(), markCatalogApplyNow(), SessionBootstrapGate

### Community 100 - "google-sign-in-button.tsx"
Cohesion: 0.24
Nodes (13): applyNow(), drainOne(), flushScheduledQueryDataApplies(), getMsSinceLastCatalogApply(), getPendingQueryDataApplyCount(), keyOf(), noteCatalogApply(), PendingApply (+5 more)

### Community 101 - "highlighted-text.tsx"
Cohesion: 0.34
Nodes (10): inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode(), resolveInventoryShelf(), inventoryStatus(), inventoryVehicleLabel(), mapInventoryItemToSearchEngine(), mapInventoryItemToSearchResult() (+2 more)

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+3 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.44
Nodes (6): ScreenActionFooter(), ScreenActionFooterProps, useFloatingTabBarInset(), getFloatingTabBarOffset(), getScreenActionScrollInset(), useRegisterAutocompleteChromeInset()

### Community 105 - "financial-operation-repository.ts"
Cohesion: 0.39
Nodes (10): AddToOrderHandlers, MotorActionHandlers, motorActionMessage(), motorActionTitle(), openSearchResult(), SearchRouter, showCatalogActions(), showMotorActions() (+2 more)

### Community 106 - "team-invite-card.tsx"
Cohesion: 0.18
Nodes (9): DeviceClass, BreakpointKey, breakpoints, platform, screen, sidebarWidth, { width, height }, layoutRhythm (+1 more)

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
Nodes (9): WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, daysUntil(), formatDaysRemaining(), formatShortDate(), planLabel(), renewalLine(), subscriptionHint() (+1 more)

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.05
Nodes (54): ScanSearchIcon, SearchIcon, IconButton, profileSpring, profileTimeline, searchSpring, searchTimeline, SearchEnterConfig (+46 more)

### Community 113 - "advances.ts"
Cohesion: 0.13
Nodes (24): DevSubscriptionPanel(), readDevOffline(), base(), clearDevMode(), DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS, devDisplayPrice() (+16 more)

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
Cohesion: 0.14
Nodes (17): useAuth(), useAuthActions(), AuthenticatedLandingScreen(), SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, WorkspaceAccessScreen(), McHeader(), resolveGreetingHeadline() (+9 more)

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.02
Nodes (100): AlertTriangleIcon, CopyIcon, TabScreenPlaceholder(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize, ActionIconButtonVariant (+92 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.29
Nodes (5): GripVerticalIcon, NavEditorRowProps, NavigationEditorList(), NavigationEditorListProps, NAV_ITEM_DEFINITIONS

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.38
Nodes (5): MarketplaceCard, MarketplaceCardProps, statusTone, PriceCard, PriceCardProps

### Community 140 - "use-work-order-composer-options.ts"
Cohesion: 0.32
Nodes (7): assertValidPayload(), createFinancialOperation(), CreatePayload, createTypedFinancialOperation(), FinancialOperationRepository, CreateFinancialOperationInput, OperationType

### Community 150 - "organization-switch-button.tsx"
Cohesion: 0.33
Nodes (7): getStartupMarks(), logStartupTable(), MarkEntry, marks, StartupMark, hideNativeSplashAndLogStartup(), hideNativeSplashOnce()

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.07
Nodes (35): TeamEmployeeCard, TeamEmployeeCardProps, styles, TeamInviteCardProps, TeamInviteRow, INVITE_FILTER_OPTIONS, InviteStatusFilter, TeamInviteStatusFilters() (+27 more)

### Community 199 - "notification-bell-button.tsx"
Cohesion: 0.14
Nodes (20): stripUndefinedDeep(), mergeNotificationPreferences(), updateNotificationPreferences(), buildPreferencesPayload(), preferencesRef(), saveNotificationPreferences(), subscribeNotificationPreferences(), CategoryPreferences (+12 more)

### Community 201 - "create-icon.tsx"
Cohesion: 0.32
Nodes (5): AnimatedIconWrapper, createIcon(), IconState, IconSize, iconSizes

### Community 202 - "use-notification-preferences.ts"
Cohesion: 0.29
Nodes (6): CustomerCard, CustomerCardProps, Avatar, AvatarFallback(), AvatarProps, AvatarSize

### Community 203 - "auth-journey-screens.tsx"
Cohesion: 0.08
Nodes (27): FlashlightIcon, scanSpring, scanTimeline, ScanConfirmFlash(), ScanConfirmFlashProps, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps (+19 more)

### Community 205 - "open-finance-settings.ts"
Cohesion: 0.38
Nodes (6): financeSettingsHref(), FinanceSettingsReturnTo, openFinanceSettings(), OpenFinanceSettingsRouter, resolveFinanceSettingsReturnHref(), RETURN_TO_KEYS

### Community 206 - "useFadeIn"
Cohesion: 0.53
Nodes (5): useFadeIn(), usePageEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps

### Community 208 - "sidebar.tsx"
Cohesion: 0.11
Nodes (20): ArrowLeftIcon, GateAction, ScreenGate(), ScreenGateProps, VARIANT_ICON, Screen(), ScreenProps, ScreenScroll() (+12 more)

### Community 209 - "useScreenEnter"
Cohesion: 0.17
Nodes (18): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload(), ScanDocumentUploadResult, uploadScanDocument(), RecentScan (+10 more)

### Community 210 - "sidebar.tsx"
Cohesion: 0.40
Nodes (5): Sidebar(), SidebarItem, SidebarProps, SidebarSection, isTablet()

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.11
Nodes (34): FilterIcon, IosLiftMenuItem, OrdersLoadingState(), OrdersLiftContext, OrdersLiftContextValue, OrdersLiftProvider(), OrdersLiftSession, useOrdersLift() (+26 more)

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.20
Nodes (16): toast(), ToastAction, ToastItem, ToastStore, ToastVariant, PendingAdd, useAddToOrderFlow(), CompositionRouter (+8 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.03
Nodes (70): ChevronRightIcon, AuthDivider(), AuthHeroCar(), AuthHeroShell(), AuthHeroShellProps, HeroBackdrop(), takeLoginRiseHandoff(), normalizeCode() (+62 more)

### Community 218 - "invite-service.ts"
Cohesion: 0.11
Nodes (24): ProfileNameJourneyScreen(), VerifyEmailJourneyScreen(), MODULE_KEYS, SetupWizardScreen(), StaggerRow(), AUTH_JOURNEY_PROGRESS_ORDER, AUTH_JOURNEY_STEP_LABELS, authJourneyProgressLabel() (+16 more)

### Community 222 - "recent-scans.ts"
Cohesion: 0.09
Nodes (42): scanSheetAnimationConfigs, ScanCandidatesSheet, ScanCandidatesSheetProps, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanDocumentSheet, ScanDocumentSheetProps, ScanLauncherButton() (+34 more)

## Knowledge Gaps
- **1084 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1079 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **63 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `tab-transition-context.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `text.tsx`, `team-screen.tsx`, `inventory-card.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `index.ts`, `app-tab-bar.tsx`, `index.ts`, `order-detail-screen.tsx`, `Text`, `notification-service.ts`, `getJson`, `notifications-settings-screen.tsx`, `types.ts`, `auth-gate.tsx`, `haptics`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `mapAuthError`, `input-field.tsx`, `use-notification-preferences.ts`, `auth-journey-screens.tsx`, `styles.ts`, `inline-autocomplete-row.tsx`, `sidebar.tsx`, `sidebar.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `ScanDebounce`, `app-loading-screen.tsx`, `search-engine-card.tsx`, `invite-service.ts`, `recent-scans.ts`, `order-row.tsx`, `useFloatingTabBarInset`, `diagnostics-settings-screen.tsx`, `advances.ts`, `types.ts`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `Text` connect `getJson` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `text.tsx`, `team-screen.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `inventory-card.tsx`, `index.ts`, `index.ts`, `app-tab-bar.tsx`, `index.ts`, `order-detail-screen.tsx`, `Text`, `notifications-settings-screen.tsx`, `useReducedMotion`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `order-composition-step.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `push-channel.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `ac-payroll-list.tsx`, `input-field.tsx`, `use-notification-preferences.ts`, `auth-journey-screens.tsx`, `styles.ts`, `inline-autocomplete-row.tsx`, `sidebar.tsx`, `modules.ts`, `sidebar.tsx`, `ac-payroll-list.tsx`, `app-loading-screen.tsx`, `order-documents-section.tsx`, `tab-transition-context.tsx`, `search-engine-card.tsx`, `invite-service.ts`, `recent-scans.ts`, `use-search-idle-data.ts`, `diagnostics-settings-screen.tsx`, `types.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `useSession()` connect `index.ts` to `create-order-screen.tsx`, `app-tab-bar.tsx`, `index.ts`, `useTheme`, `Text`, `firestore-timestamp.ts`, `getJson`, `useReducedMotion`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `index.ts`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `login-screen.tsx`, `profile-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `ac-payroll-list.tsx`, `mapAuthError`, `notification-bell-button.tsx`, `animated-tab-screen.tsx`, `search-idle.tsx`, `sidebar.tsx`, `app-loading-screen.tsx`, `order-documents-section.tsx`, `in-app-banner-provider.tsx`, `delete-account.ts`, `search-engine-card.tsx`, `invite-service.ts`, `recent-scans.ts`, `useFloatingTabBarInset`, `advances.ts`, `types.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1084 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0547008547008547 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08383838383838384 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10106382978723404 - nodes in this community are weakly interconnected._