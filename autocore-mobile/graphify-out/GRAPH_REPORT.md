# Graph Report - autocore-mobile  (2026-08-03)

## Corpus Check
- 856 files · ~338,781 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4278 nodes · 13605 edges · 234 communities (172 shown, 62 thin omitted)
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
- local-inventory-resolve.ts
- in-app-banner-provider.tsx
- tab-transition-context.tsx
- inline-autocomplete-row.tsx
- invite-service.ts
- menu.tsx
- @autocore/rbac
- priority-router.ts
- recent-scans.ts
- useScreenEnter
- export-operations-csv.ts
- scan-frame-overlay.tsx
- expo-blur
- engine-status.tsx
- mock-scan-registry.ts
- scan-top-bar.tsx
- engine-card.tsx
- scan-toolbar.tsx
- gradients.ts
- @autocore/billing

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 412 edges
2. `Text` - 210 edges
3. `haptics` - 133 edges
4. `rhythm` - 95 edges
5. `useSession()` - 90 edges
6. `getFirebaseDb()` - 85 edges
7. `useReducedMotion()` - 84 edges
8. `normalizeCompanyId()` - 67 edges
9. `spacing` - 65 edges
10. `toneBackground()` - 62 edges

## Surprising Connections (you probably didn't know these)
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  animations/presets.ts → hooks/use-accessibility.ts
- `AuthGate()` --indirect_call--> `subscribePaywallBypass()`  [INFERRED]
  authentication/auth-gate.tsx → lib/subscriptions/paywall-bypass.ts
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  authentication/auth-provider.tsx → services/auth/apple-sign-in.ts
- `useAuthReady()` --calls--> `useAuthStore`  [EXTRACTED]
  authentication/auth-provider.tsx → store/auth-store.ts
- `DrawablePath()` --calls--> `useTheme()`  [EXTRACTED]
  components/brand/app-loading-logo.tsx → hooks/use-theme.tsx

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`

## Communities (234 total, 62 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.06
Nodes (65): AutocompleteOverlay, AutocompleteOverlayProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs, AutocompleteInputProps, ComposerVehicleForm (+57 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.14
Nodes (17): clientRepository, notifyFirestoreSnapshotError(), toDateFromFirestore(), createClientRepository(), mapClient(), mapJob(), coerceInventoryString(), createInventoryItemRepository() (+9 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.07
Nodes (58): planById(), planForSku(), purchasablePlans(), skuForPlan(), isDevModeActive(), isDevModeAvailable(), scenarioForPlan(), clearEntitlementCaches() (+50 more)

### Community 3 - "text.tsx"
Cohesion: 0.15
Nodes (10): CollectionSwitchRow, SettingsToggleRowProps, AppearanceSettingsScreen(), THEME_OPTIONS, ACCENT_COLORS, AppearanceSettingsState, DEFAULT_APPEARANCE, AccentColorId (+2 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.04
Nodes (69): useShimmer(), PlusIcon, SearchIcon, XIcon, layoutTransition, styles, Badge(), BadgeProps (+61 more)

### Community 5 - "motion.ts"
Cohesion: 0.05
Nodes (43): ScreenEnterConfig, useFadeIn(), usePageEnter(), useScaleEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps, mcDuration (+35 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.14
Nodes (19): useOrderCompositionForm(), UseOrderCompositionFormOptions, formatMotorDisplayName(), formatMotorLineLabel(), MotorNameParts, resolveQuickSpecificCategories(), SETUP_WIZARD_CATEGORY_PRESETS, assigneeRoleLabel() (+11 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.09
Nodes (31): OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), SourceLayout, useOrderTransition(), OrderRow, OrderRowBody(), OrderRowProps (+23 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.21
Nodes (17): buildWeekRevenueBars(), computeMonthRevenueGrowth(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), resolveOverviewRevenue() (+9 more)

### Community 9 - "index.ts"
Cohesion: 0.12
Nodes (25): OrganizationMembershipRow, InvitePreviewCard(), presentOrganizationSwitcher(), PresentOrganizationSwitcherArgs, ProfileScreenShell(), ProfileScreenShellProps, profileRouteHref(), WorkspaceCompaniesSection() (+17 more)

### Community 10 - "index.ts"
Cohesion: 0.18
Nodes (22): useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useEmployeesRealtime(), useInventoryCatalog(), useMotorsRealtime(), useOperationsRealtime(), usePayrollTransactionsRealtime() (+14 more)

### Community 11 - "index.ts"
Cohesion: 0.15
Nodes (16): ImagesIcon, AnalyticsCard, AnalyticsCardProps, MarketplaceCard, MarketplaceCardProps, statusTone, NotificationCardProps, PhotoGrid (+8 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.10
Nodes (21): AutocompleteInput, SellMotorSheet, SellMotorSheetProps, SellMotorSheetRef, enqueueMotorSoldEffects(), clientRepository, createMotorRepository(), dedupeMotors() (+13 more)

### Community 14 - "index.ts"
Cohesion: 0.14
Nodes (15): CreateOrderScreen(), FormCard(), SheetNavButton(), STEPS, StepTrail(), SummaryRow(), resolveInventoryUnitPrice(), compositionGrandTotal() (+7 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.06
Nodes (36): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+28 more)

### Community 16 - "useTheme"
Cohesion: 0.10
Nodes (28): OverviewBody(), OverviewScreen(), ActivityCategory, InsightTone, KpiTone, OverviewActivity, OverviewAttention, OverviewAttentionItem (+20 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.05
Nodes (65): useEntitlementFor(), UseEntitlementResult, dateMs(), comparePlans(), highestPlan(), PlanAvailability, PlanDescriptor, PLANS (+57 more)

### Community 18 - "Text"
Cohesion: 0.10
Nodes (34): OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent(), ScanUnknownSheetProps, sheetPresentationKey(), useDevMockFallback(), useScanExperience(), classifyScanPayload() (+26 more)

### Community 19 - "radius"
Cohesion: 0.17
Nodes (23): applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems(), paginateItems() (+15 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.12
Nodes (35): LocationContentsResponse, useCompanyProfile(), CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), normalizeCompanyId(), buildLocationEntityLink(), getFirebaseDb() (+27 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.52
Nodes (6): useAppearanceSettingsStore, useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled()

### Community 22 - "getJson"
Cohesion: 0.06
Nodes (46): TrendingDownIcon, resolveTabRouteName(), useTabTransition(), resolveCurrentTab(), resolveTabFromHref(), TabNavigateTarget, useNavigateTab(), NotificationBellButton() (+38 more)

### Community 23 - "types.ts"
Cohesion: 0.39
Nodes (6): useCompanyInvites(), createCompanyInvite(), CreateInviteApiResponse, mapInviteDoc(), subscribeCompanyInvites(), InviteDocument

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.18
Nodes (12): NotFoundScreen(), ActivityCard, ActivityCardProps, BusinessCardShell(), BusinessCardShellProps, CustomerCard, CustomerCardProps, OrderCard (+4 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.18
Nodes (25): CashFlowPeriod, InvoiceStatus, TrendTone, CATEGORY_ICONS, buildAttentionItems(), buildDailySeries(), buildInvoices(), buildPeriodSeries() (+17 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.17
Nodes (11): AccountingScreen(), newOperationHref(), NewOperationPreset, advanceDirectionLabel(), CreatableOperationType, filterCashboxOperations(), filterExpenseOperations(), filterPayrollExpenseOperations() (+3 more)

### Community 27 - "useAuth"
Cohesion: 0.13
Nodes (17): OrderStatusBadge(), OrderStatusBadgeProps, OrderWorkflowProgress(), OrderWorkflowProgressProps, orderStatusLabel, resolveStatusInk(), StatusEmphasis, StatusInk (+9 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.19
Nodes (11): ModulesEditorList(), ModulesEditorListProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModulesScreen(), ModulesConfigState, useModulesConfigStore (+3 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.09
Nodes (39): useRealtimeReconnect(), useSessionBootstrapReady(), reviveDatesDeep(), shouldReviveDateField(), CachedRealtimeSnapshot, flushOneWrite(), isFresh(), lastDataJsonByKey (+31 more)

### Community 31 - "types.ts"
Cohesion: 0.08
Nodes (34): AuthSocialCluster(), AuthSocialClusterProps, AnimatedPath, AppLoadingLogo(), AppLoadingLogoProps, AppLoadingLogoStatic(), DrawablePath(), easeInOut (+26 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.07
Nodes (57): AnimatedIconWrapper, createIcon(), IconProps, IconState, ActivityIcon, ArrowRightIcon, ArrowUpRightIcon, BarChart3Icon (+49 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.21
Nodes (18): OrderDocumentsSection(), downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile(), ensureWarrantyPdfFile(), getAuthHeaders(), printWarrantyDocument(), printWorkOrderDocument() (+10 more)

### Community 34 - "haptics"
Cohesion: 0.09
Nodes (24): DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus, ImportSuccessView() (+16 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.10
Nodes (18): getOAuthButtonTheme(), OAuthButtonTheme, resolveScheme(), ThemeProvider(), base(), ACCENT_PALETTE, applyAccentToColors(), BreakpointKey (+10 more)

### Community 36 - "index.ts"
Cohesion: 0.15
Nodes (23): CurrencyScreen(), useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS, AppDisplayCurrency, appDisplayCurrencyAffix() (+15 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.12
Nodes (19): CreateInventoryItemInput, useMobileQuickReceive(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), appendLocalFile(), createLocalFileFormData(), AvatarUploadResult (+11 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.16
Nodes (23): OAuthProvider, ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), isAppleSignInCancellation() (+15 more)

### Community 39 - "rhythm"
Cohesion: 0.09
Nodes (22): SearchFilters(), SearchFiltersProps, catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery() (+14 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.11
Nodes (24): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBar(), ComposerTabBarProps, ComposerTabOption, TabIcon, ComposerTabPanel() (+16 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.14
Nodes (20): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+12 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.17
Nodes (16): TabLayout(), NAV_ITEM_DEFINITIONS, getNavItemHref(), NavItemId, EXPO_TAB_HREFS, isNavItemModuleEnabled(), isNavItemVisible(), NavModuleFlags (+8 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.14
Nodes (22): PushRegistrationHead(), registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken(), fetchExpoPushTokenViaExperienceId() (+14 more)

### Community 44 - "index.ts"
Cohesion: 0.05
Nodes (46): ChevronRightIcon, IconName, iconRegistry, CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, sizeMap, HorizontalFilterBar() (+38 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.11
Nodes (22): AppleIcon(), BrandIconProps, GoogleIcon(), AuthProviderKind, badgeSize, monogramFontSize, UserAvatar(), UserAvatarProps (+14 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.08
Nodes (49): CheckIcon, CloudIcon, Button, featureDelay(), paywallDuration, paywallEase, paywallEnter, paywallSpring (+41 more)

### Community 47 - "inventory.ts"
Cohesion: 0.13
Nodes (20): parseFeature(), PaywallRoute(), LifeBuoyIcon, LockIcon, FeatureGate(), FeatureGateProps, FeatureLockedCard(), FeatureLockedCardProps (+12 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.08
Nodes (25): @autocore/org, expo-auth-session, expo-constants, expo-router, nativewind, dependencies, @autocore/org, expo-auth-session (+17 more)

### Community 50 - "index.ts"
Cohesion: 0.11
Nodes (26): allStoreSkus(), readErrorCode(), toPurchaseFailure(), connect(), disconnect(), emitFailure(), emitPurchase(), FailureHandler (+18 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.08
Nodes (37): AppProviders(), AuthProvider(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), getStartupSummary() (+29 more)

### Community 52 - "types.ts"
Cohesion: 0.15
Nodes (13): computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters, isOpenOrderStatus(), OrderActivity, OrderActivityTone (+5 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.14
Nodes (14): AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES (+6 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.27
Nodes (14): backfillTeamNotifications(), fetchNotificationInbox(), InboxResponse, markAllNotificationsRead(), markNotificationState(), PreferencesResponse, updateInboxNotificationState(), archiveServerNotification() (+6 more)

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.10
Nodes (25): ScreenActionFooter(), ScreenActionFooterProps, NativeContextMenu(), NativeContextMenuAction, NativeContextMenuProps, presentNativeMenu(), PresentNativeMenuOptions, OrderClaimSection() (+17 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.32
Nodes (7): isTabRouteName(), NO_TRANSITION, TAB_ORDER, TabRouteName, TabTransitionContext, TabTransitionContextValue, TabTransitionProvider()

### Community 58 - "startup-tracer.ts"
Cohesion: 0.08
Nodes (31): AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, CoCard(), CoCardProps, CoSection(), CoSectionProps, CoToggleRow() (+23 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.15
Nodes (17): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), isValidEmail(), LoginScreen(), readInviteCompanyName(), readInviteEmail(), readInviteToken() (+9 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.08
Nodes (37): useAuth(), AuthShell(), AuthenticatedLandingScreen(), ForgotPasswordScreen(), isValidEmail(), SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, Input (+29 more)

### Community 61 - "ScanService"
Cohesion: 0.20
Nodes (21): mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), PendingScanContext, disambiguateScanPayload() (+13 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.13
Nodes (28): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, workspaceImport(), useAuthHasAccess() (+20 more)

### Community 63 - "include"
Cohesion: 0.08
Nodes (25): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+17 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.11
Nodes (24): animationSpeed, buttonHeight, A11ySlice, DesignLanguageContext, designLanguageFromScheme(), defaultEasing, glassStyle, iconWeight (+16 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.16
Nodes (15): withAlpha(), borderStyle(), cornerStyle, layoutRhythm, touchTarget, ringBorder(), createCardStyle(), createInputTextStyle() (+7 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.15
Nodes (14): Can(), CanProps, RequirePermission(), RequirePermissionProps, buildWeekBars(), formatMoney(), MyEarningsScreen(), MyEarningsScreenProps (+6 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.09
Nodes (21): AuthBootLoadingProps, APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON (+13 more)

### Community 68 - "document-import-screen.tsx"
Cohesion: 0.18
Nodes (9): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, kindLabel(), LocationScreen() (+1 more)

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.42
Nodes (7): QUICK_CATEGORIES, useSearchIdleData(), getRecentQueriesCache(), hydrateSearchIdleCache(), readRecentSearchQueries(), rememberSearchQuery(), getJson()

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.17
Nodes (15): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), fetchJsonWithTimeout(), AppleSignInApiPayload, AppleSignInApiResponse (+7 more)

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
Cohesion: 0.12
Nodes (21): PlanOffer, useSubscription(), UseSubscriptionResult, CODE_MAP, isPurchaseFailure(), MESSAGES, getPurchaseStoreSnapshot(), subscribePurchaseStore() (+13 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.23
Nodes (4): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, WarehouseScreen()

### Community 77 - "styles.ts"
Cohesion: 0.10
Nodes (21): PhoneIcon, ordersSpring, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), OrderCard, OrderCardProps, SF (+13 more)

### Community 78 - "inline-autocomplete-row.tsx"
Cohesion: 0.19
Nodes (7): acceptsCameraInput(), activeResultForOutcome(), isInstantOutcome(), ScanService, sheetKindForOutcome(), ScanOutcome, ScanServiceSnapshot

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.20
Nodes (10): ACCOUNTING_DEMO, PERMISSION_GROUPS, DemoPermission, NavItemConfig, PermissionGroupId, ProductModuleConfig, SettingsHubCard, SettingsHubSectionId (+2 more)

### Community 80 - "profile.ts"
Cohesion: 0.08
Nodes (55): AuthActions, AuthActionsContext, ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace(), useAuthActions() (+47 more)

### Community 81 - "document-import.ts"
Cohesion: 0.35
Nodes (10): ADVANCE_KEYWORDS, AdvanceDirection, AdvanceSnapshot, appendAdvanceMarker(), buildAdvanceSnapshot(), filterAdvanceOperations(), isAdvanceOperation(), isAdvancePaid() (+2 more)

### Community 82 - "modules.ts"
Cohesion: 0.24
Nodes (7): MapPinIcon, InventoryCard, InventoryCardProps, LocationBadge, LocationBadgeProps, StockBadge, StockBadgeProps

### Community 83 - "location-screen.tsx"
Cohesion: 0.14
Nodes (19): EMPLOYEE_ROLE_LABELS, formatMoney(), laborAssigneeLabel(), laborLineLabel(), ROLE_LABELS, laborLineTotal(), normalizeLaborPricingMode(), CreateWorkOrderInput (+11 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.05
Nodes (66): PrinterIcon, Share2Icon, acTimeline, AcAccountTiles, AcAccountTilesProps, AccountTile(), TileDef, AcAccountingEmptyState() (+58 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.20
Nodes (8): CollectionRow, ListSection(), TaxesSettingsScreen(), VersionSettingsScreen(), formatPlatformPhone(), getPlatformContacts(), PlatformContacts, readEnv()

### Community 86 - "ScanDebounce"
Cohesion: 0.28
Nodes (9): AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), formSheetScreenOptions(), NavigationPolicy, RouteCategory (+1 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.10
Nodes (19): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Icons, List dialects, Living gallery (+11 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.15
Nodes (16): FinanceSettingsScreen(), listsEqual(), normalizeList(), financeSettingsHref(), FinanceSettingsReturnTo, openFinanceSettings(), OpenFinanceSettingsRouter, resolveFinanceSettingsReturnHref() (+8 more)

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.08
Nodes (38): ActivityFeedFilters(), ActivityFeedFiltersProps, READ_FILTERS, buildOrderDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType, ERROR_EVENTS (+30 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.10
Nodes (21): NotificationCard, ActivityDateGroup(), ActivityNotificationRow, ActivityNotificationRowProps, SwipeActionProps, DateGroup, DateGroupKey, formatNotificationTime() (+13 more)

### Community 92 - "kv.ts"
Cohesion: 0.28
Nodes (15): parseFilter(), SearchScreen(), useInventorySearch(), calendarDaysBetween(), isMotorStale(), isWarehouseLowStock(), motorMatchesSearchQuery(), warehouseLowStockThreshold() (+7 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.19
Nodes (9): resolveInviteHref(), guardedPush(), PushRouter, navigationHrefKey(), stackNavigationGuard, buildImportDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink() (+1 more)

### Community 96 - "useFloatingTabBarInset"
Cohesion: 0.17
Nodes (17): useAccountingData(), UseAccountingDataResult, useSessionQueryData(), calculateCashBalance(), incomingTypes, outgoingTypes, computeAccountingSnapshot(), ComputeAccountingSnapshotInput (+9 more)

### Community 97 - "order-row.tsx"
Cohesion: 0.22
Nodes (7): AnimatedLine, FRONT_WHEEL, HERO_DISPLAY_HEIGHT, HERO_DISPLAY_WIDTH, REAR_WHEEL, SPEED_LINES, WheelProps

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.18
Nodes (12): AutocompleteDataSnapshot, AutocompleteDataStore, EMPTY, useAutocompleteDataStore, AutocompleteDataHead(), extractOperationCategories(), useCachedRealtime(), warehouseRepository (+4 more)

### Community 100 - "google-sign-in-button.tsx"
Cohesion: 0.14
Nodes (20): Listener, listeners, resetAppShellReady(), setAppShellReady(), applyNow(), drainOne(), flushScheduledQueryDataApplies(), getMsSinceLastCatalogApply() (+12 more)

### Community 101 - "highlighted-text.tsx"
Cohesion: 0.28
Nodes (12): inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode(), resolveInventoryShelf(), inventoryStatus(), inventoryVehicleLabel(), mapInventoryItemToSearchEngine(), mapInventoryItemToSearchResult() (+4 more)

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+3 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.22
Nodes (17): getApiBaseUrl(), getBearerToken(), humanizeApiErrorBody(), MobileApiError, mobileFetch(), mobileFetchBlob(), mobileGet(), mobilePatch() (+9 more)

### Community 105 - "financial-operation-repository.ts"
Cohesion: 0.20
Nodes (17): SearchEmptyActionId, SearchEmptyState(), pluralResults(), SearchResults(), SearchResultsProps, AddToOrderHandlers, MotorActionHandlers, motorActionMessage() (+9 more)

### Community 106 - "team-invite-card.tsx"
Cohesion: 0.15
Nodes (14): ProfileHeader(), PROFILE_ROUTES, profileHubRouteHref(), ProfileHubRow, ProfileScreen(), ProfileDangerAction, ProfileHubData, ProfileHubRouteId (+6 more)

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
Cohesion: 0.13
Nodes (26): AlertTriangleIcon, CheckCircle2Icon, ClockIcon, WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, BannerContent, contentFor(), PurchaseStatusBannerProps (+18 more)

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.06
Nodes (47): ScanSearchIcon, searchSpring, searchTimeline, useSearchEnter(), HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps (+39 more)

### Community 113 - "advances.ts"
Cohesion: 0.20
Nodes (19): DevSubscriptionPanel(), DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS, devDisplayPrice(), devProducts(), DevScenario, DevScenarioId (+11 more)

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
Cohesion: 0.60
Nodes (4): McHeader(), resolveGreetingHeadline(), resolveGreetingMeta(), resolveProfileHeadline()

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.02
Nodes (122): DesignSystemScreen(), CopyIcon, TabScreenPlaceholder(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize, ActionIconButtonVariant (+114 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.33
Nodes (4): GripVerticalIcon, NavEditorRowProps, NavigationEditorList(), NavigationEditorListProps

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.18
Nodes (14): getWebAppUrl(), getPublicApiBaseUrl(), AuthEmailApiError, PasswordResetDelivery, postAuthEmailApi(), sendPasswordResetViaApi(), sendVerificationEmailViaApi(), verifyEmailCodeViaApi() (+6 more)

### Community 140 - "use-work-order-composer-options.ts"
Cohesion: 0.22
Nodes (11): assertValidPayload(), createFinancialOperation(), CreatePayload, createTypedFinancialOperation(), FinancialOperationRepository, FinancialOperationsFilters, mapOperation(), readAmount() (+3 more)

### Community 141 - "expo-auth-session"
Cohesion: 0.29
Nodes (14): EMPTY, useAccountingPreferences(), useUserDisplayCurrency(), normalizeAppDisplayCurrency(), AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings(), patchAccountingSettings() (+6 more)

### Community 150 - "organization-switch-button.tsx"
Cohesion: 0.18
Nodes (16): HomeRoute(), getStartupMarks(), logStartupTable(), MarkEntry, marks, markStartup(), StartupMark, hydrateOne() (+8 more)

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.05
Nodes (56): ExternalLinkIcon, MailIcon, TeamInvitePresentOptions, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS, TeamProGate() (+48 more)

### Community 199 - "notification-bell-button.tsx"
Cohesion: 0.12
Nodes (24): CATEGORY_HINTS, NotificationsSettingsScreen(), useNotificationInbox(), useNotificationPreferences(), stripUndefinedDeep(), mergeNotificationPreferences(), updateNotificationPreferences(), buildPreferencesPayload() (+16 more)

### Community 201 - "create-icon.tsx"
Cohesion: 0.20
Nodes (10): SLUG_TO_TYPE, isUnassignedCompanyId(), resolveCompanyIdsForSync(), documentGenerationJobRepository, mapWorkOrderDocument(), workOrderDocumentRepository, DocumentGenerationJobRecord, DocumentJobStatus (+2 more)

### Community 202 - "use-notification-preferences.ts"
Cohesion: 0.18
Nodes (12): InAppBannerProvider(), useNotificationInboxRealtime(), useNotificationService(), NotificationProvider(), NotificationProviderProps, subscribeInboxRealtime(), ExtendedCategoryPreferences, ImportProgressNotification (+4 more)

### Community 203 - "auth-journey-screens.tsx"
Cohesion: 0.08
Nodes (27): OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, ScanCandidatesSheet, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanDocumentSheet (+19 more)

### Community 205 - "open-finance-settings.ts"
Cohesion: 0.16
Nodes (13): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, allocateWorkOrderNumber() (+5 more)

### Community 206 - "useFadeIn"
Cohesion: 0.23
Nodes (12): DocumentAction, OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), resolveApplicableDocumentSlugs(), resolveDocumentsForOrderCompleted(), resolveDocumentsForOrderCreated(), DOCUMENT_BY_SLUG (+4 more)

### Community 208 - "sidebar.tsx"
Cohesion: 0.11
Nodes (20): ArrowLeftIcon, IconButton, IconButtonProps, sizes, GateAction, ScreenGate(), ScreenGateProps, VARIANT_ICON (+12 more)

### Community 209 - "useScreenEnter"
Cohesion: 0.36
Nodes (10): RecentScan, formatRelativeTime(), loadRecentScans(), mapStored(), mergeRecents(), migrateLegacyIfNeeded(), normalizeStored(), readMmkv() (+2 more)

### Community 210 - "sidebar.tsx"
Cohesion: 0.40
Nodes (5): Sidebar(), SidebarItem, SidebarProps, SidebarSection, isTablet()

### Community 212 - "CollectionSwitchRow"
Cohesion: 0.19
Nodes (8): companyAppConfigRef(), loadCompanyAppConfig(), saveCompanyAppConfig(), subscribeCompanyAppConfig(), firebaseConfig, BarcodeMapping, barcodeMappingRepository, createBarcodeMappingRepository()

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.11
Nodes (30): FilterIcon, IosLiftMenuItem, OrdersLiftContext, OrdersLiftContextValue, OrdersLiftProvider(), OrdersLiftSession, useOrdersLift(), canMarkCompleted() (+22 more)

### Community 214 - "local-inventory-resolve.ts"
Cohesion: 0.35
Nodes (9): queryClient, itemMatchesPayload(), resolveBarcodeFromLocalCatalog(), toMobileScanItem(), compactBarcode(), compactCode(), extractGs1Primary(), normalizeScanPayload() (+1 more)

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.16
Nodes (20): toast(), ToastAction, ToastItem, ToastStore, ToastVariant, useToastStore, ToastProvider(), PendingAdd (+12 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.04
Nodes (63): AuthDivider(), AuthEmailChip(), AuthEmailChipProps, AuthHeroCar(), AuthHeroShell(), AuthHeroShellProps, HeroBackdrop(), AuthBackdrop() (+55 more)

### Community 217 - "inline-autocomplete-row.tsx"
Cohesion: 0.24
Nodes (5): HighlightedText, HighlightedTextProps, InlineAutocompleteRow, InlineAutocompleteRowProps, styles

### Community 218 - "invite-service.ts"
Cohesion: 0.11
Nodes (26): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), AUTH_JOURNEY_STEP_LABELS, BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS (+18 more)

### Community 219 - "menu.tsx"
Cohesion: 0.22
Nodes (6): Menu(), MenuItem, MenuProps, StyleSheetFill, zIndex, ZIndexKey

### Community 221 - "priority-router.ts"
Cohesion: 0.22
Nodes (8): DeliveryChannels, isServerCategoryEnabled(), PRIORITY_BASE, resolveDeliveryChannels(), resolveLiveEditingChannels(), resolveSyncChannels(), CategoryChannelPrefs, DEFAULT_EXTENDED_CATEGORY_PREFS

### Community 222 - "recent-scans.ts"
Cohesion: 0.12
Nodes (29): scanSheetAnimationConfigs, ScanCandidatesSheetProps, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanDocumentSheetProps, ScanMoveSheetProps, ScanNotFoundSheetProps, ScanProductSheetProps (+21 more)

### Community 223 - "useScreenEnter"
Cohesion: 0.28
Nodes (6): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter(), SearchEnterConfig

### Community 224 - "export-operations-csv.ts"
Cohesion: 0.46
Nodes (7): buildOperationsCsv(), escapeCsv(), operationToCsvRow(), shareOperationsCsv(), operationCategoryLabel(), operationTypeLabel(), formatTimestamp()

### Community 225 - "scan-frame-overlay.tsx"
Cohesion: 0.33
Nodes (4): scanSpring, scanTimeline, ScanFrameOverlay(), ScanFrameOverlayProps

### Community 227 - "engine-status.tsx"
Cohesion: 0.33
Nodes (5): EngineStatus, EngineStatusProps, EngineStatusType, labels, toneMap

### Community 228 - "mock-scan-registry.ts"
Cohesion: 0.47
Nodes (5): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload()

### Community 229 - "scan-top-bar.tsx"
Cohesion: 0.50
Nodes (3): FlashlightIcon, ScanTopBar(), ScanTopBarProps

### Community 230 - "engine-card.tsx"
Cohesion: 0.40
Nodes (4): EngineCard, EngineCardProps, statusLabel, statusTone

### Community 231 - "scan-toolbar.tsx"
Cohesion: 0.50
Nodes (3): ScanToolbar(), ScanToolbarProps, Tool()

### Community 232 - "gradients.ts"
Cohesion: 0.67
Nodes (3): blend(), getGradients(), GradientStop

## Knowledge Gaps
- **1087 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1082 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `tab-transition-context.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `text.tsx`, `team-screen.tsx`, `inventory-card.tsx`, `snapshot-builders.ts`, `index.ts`, `app-tab-bar.tsx`, `index.ts`, `order-detail-screen.tsx`, `Text`, `getJson`, `notifications-settings-screen.tsx`, `useAuth`, `types.ts`, `auth-gate.tsx`, `haptics`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `mapAuthError`, `input-field.tsx`, `use-notification-preferences.ts`, `auth-journey-screens.tsx`, `styles.ts`, `sidebar.tsx`, `sidebar.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `ScanDebounce`, `in-app-banner-provider.tsx`, `app-loading-screen.tsx`, `inline-autocomplete-row.tsx`, `invite-service.ts`, `menu.tsx`, `search-engine-card.tsx`, `delete-account.ts`, `recent-scans.ts`, `order-row.tsx`, `use-search-idle-data.ts`, `diagnostics-settings-screen.tsx`, `advances.ts`, `types.ts`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `Text` connect `index.ts` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `text.tsx`, `team-screen.tsx`, `inventory-card.tsx`, `snapshot-builders.ts`, `index.ts`, `index.ts`, `app-tab-bar.tsx`, `index.ts`, `order-detail-screen.tsx`, `Text`, `getJson`, `notifications-settings-screen.tsx`, `useAuth`, `types.ts`, `auth-gate.tsx`, `haptics`, `index.ts`, `order-composition-step.tsx`, `team-invite-card.tsx`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `client-repository.ts`, `push-channel.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `notification-bell-button.tsx`, `input-field.tsx`, `auth-journey-screens.tsx`, `styles.ts`, `useFadeIn`, `sidebar.tsx`, `modules.ts`, `sidebar.tsx`, `ac-payroll-list.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `inline-autocomplete-row.tsx`, `invite-service.ts`, `menu.tsx`, `search-engine-card.tsx`, `kv.ts`, `recent-scans.ts`, `engine-status.tsx`, `engine-card.tsx`, `scan-toolbar.tsx`, `financial-operation-repository.ts`, `use-search-idle-data.ts`, `diagnostics-settings-screen.tsx`, `advances.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `useSession()` connect `index.ts` to `authenticated-landing-screen.tsx`, `index.ts`, `useTheme`, `auth-provider.tsx`, `Text`, `firestore-timestamp.ts`, `getJson`, `useReducedMotion`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `index.ts`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `my-earnings-screen.tsx`, `inventory.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `login-screen.tsx`, `profile-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `ac-payroll-list.tsx`, `mapAuthError`, `notification-bell-button.tsx`, `use-notification-preferences.ts`, `auth-journey-screens.tsx`, `search-idle.tsx`, `animated-tab-screen.tsx`, `useFadeIn`, `sidebar.tsx`, `ac-payroll-list.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `delete-account.ts`, `search-engine-card.tsx`, `invite-service.ts`, `kv.ts`, `useFloatingTabBarInset`, `copy-button.tsx`, `team-invite-card.tsx`, `diagnostics-settings-screen.tsx`, `advances.ts`, `types.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1087 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06293285155073773 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0744047619047619 - nodes in this community are weakly interconnected._