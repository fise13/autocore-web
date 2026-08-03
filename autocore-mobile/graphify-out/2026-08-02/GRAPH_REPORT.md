# Graph Report - autocore-mobile  (2026-08-02)

## Corpus Check
- 845 files · ~327,740 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4198 nodes · 13354 edges · 224 communities (162 shown, 62 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.66)
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
- team-employee-card.tsx
- team-invite-sheet.tsx
- @autocore/avatars
- sidebar.tsx
- useScreenEnter
- useFloatingTabBarInset
- permissions.ts
- app-loading-screen.tsx
- team-invite-status-filters.tsx
- in-app-banner-provider.tsx
- tab-transition-context.tsx
- team-pro-gate.tsx
- invite-service.ts
- ac-transfer-sheet.tsx
- @autocore/rbac
- photo-grid.tsx
- recent-scans.ts
- expo-blur

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 399 edges
2. `Text` - 208 edges
3. `haptics` - 129 edges
4. `rhythm` - 94 edges
5. `useSession()` - 88 edges
6. `useReducedMotion()` - 81 edges
7. `getFirebaseDb()` - 81 edges
8. `spacing` - 69 edges
9. `normalizeCompanyId()` - 67 edges
10. `toneBackground()` - 62 edges

## Surprising Connections (you probably didn't know these)
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  animations/presets.ts → hooks/use-accessibility.ts
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  authentication/auth-provider.tsx → services/auth/apple-sign-in.ts
- `useAuthReady()` --calls--> `useAuthStore`  [EXTRACTED]
  authentication/auth-provider.tsx → store/auth-store.ts
- `AppLoadingLogo()` --calls--> `useReducedMotion()`  [EXTRACTED]
  components/brand/app-loading-logo.tsx → hooks/use-accessibility.ts
- `RootStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  components/navigation/root-navigator.tsx → hooks/use-theme.tsx

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`

## Communities (224 total, 62 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.06
Nodes (68): AutocompleteOverlay, AutocompleteOverlayProps, HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs (+60 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.05
Nodes (54): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, AutocompleteDataSnapshot (+46 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.09
Nodes (41): isDevModeActive(), isDevModeAvailable(), scenarioForPlan(), clearEntitlementCaches(), peekEntitlement(), isCancellation(), getFlow(), isFlowBusy() (+33 more)

### Community 3 - "text.tsx"
Cohesion: 0.24
Nodes (7): profileSpring, profileTimeline, scanSpring, scanTimeline, searchSpring, screenMotion, ScreenTokens

### Community 4 - "team-screen.tsx"
Cohesion: 0.14
Nodes (12): ScanSearchIcon, PageHeader(), ProfileHeader(), whTimeline, OPTIONS, WarehouseFilter, WarehouseFilterBar(), WarehouseFilterBarProps (+4 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (32): ScreenEnterConfig, useScaleEnter(), enterValues, cardLift, cardPress, dialogBackdropEnter, dialogBackdropExit, dialogEnter (+24 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.07
Nodes (47): CreateOrderScreen(), STEPS, useOrderCompositionForm(), UseOrderCompositionFormOptions, resolveInventoryUnitPrice(), compositionGrandTotal(), isSellOnlyComposition(), mapCompositionToWorkOrderLines() (+39 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.16
Nodes (17): OrderRow, OrdersGroupHeader(), OrdersMailList(), OrdersMailListProps, Bucket, BUCKET_LABEL, BUCKET_ORDER, bucketFor() (+9 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.09
Nodes (27): MailIcon, TrendingDownIcon, InviteFormNotice(), InviteFormNoticeProps, DemoModeBanner(), DemoModeBannerProps, AcAccountTiles, AcAccountTilesProps (+19 more)

### Community 9 - "index.ts"
Cohesion: 0.23
Nodes (18): useNotificationInboxRealtime(), markAllNotificationsRead(), markNotificationState(), fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord(), markAllInboxNotificationsRead() (+10 more)

### Community 10 - "index.ts"
Cohesion: 0.14
Nodes (25): clientRepository, useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useEmployeesRealtime(), useMotorsRealtime(), useOperationsRealtime(), usePayrollTransactionsRealtime() (+17 more)

### Community 11 - "index.ts"
Cohesion: 0.13
Nodes (19): AnalyticsCard, AnalyticsCardProps, EngineStatus, EngineStatusProps, EngineStatusType, labels, toneMap, MarketplaceCard (+11 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.19
Nodes (12): CreateInventoryItemInput, useMobileQuickReceive(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), mobileApi, INVENTORY_ITEM_STATUSES, INVENTORY_ITEM_TYPES (+4 more)

### Community 14 - "index.ts"
Cohesion: 0.12
Nodes (30): SearchScreen(), StepperButton, WarehouseItemRow, WarehouseItemRowProps, wh, WarehouseScreen(), useInventoryCatalog(), useInventorySearch() (+22 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.09
Nodes (26): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+18 more)

### Community 16 - "useTheme"
Cohesion: 0.10
Nodes (22): Can(), CanProps, RequirePermission(), RequirePermissionProps, ScreenScroll(), McActivityFeed, McFeaturedInsight, McRevenueCard (+14 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.10
Nodes (28): CachedEntitlement, CachedSubscription, date(), deserialize(), iso(), readEntitlementCache(), readEntitlementCacheSync(), serialize() (+20 more)

### Community 18 - "Text"
Cohesion: 0.09
Nodes (35): OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent(), ScanUnknownSheetProps, sheetPresentationKey(), useDevMockFallback(), useScanExperience(), classifyScanPayload() (+27 more)

### Community 19 - "radius"
Cohesion: 0.15
Nodes (25): openNotificationDeepLink(), applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems() (+17 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.07
Nodes (57): touchLastActive(), usePresenceHeartbeat(), useWorkspaceAccessRealtime(), CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), normalizeCompanyId(), resolveCompanyIdsForSync() (+49 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.39
Nodes (7): useAppearanceSettingsStore, useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled(), DesignLanguageContext

### Community 22 - "getJson"
Cohesion: 0.05
Nodes (57): PlusIcon, acTimeline, AcAdvancesOverview(), AcAdvancesOverviewProps, AcAttention(), AcAttentionProps, AttentionCard, AcHeader() (+49 more)

### Community 23 - "types.ts"
Cohesion: 0.17
Nodes (19): Badge(), LineRow(), OrderLine, OrderLinesList(), OrderLinesListProps, Section(), hasShelfValue(), isEngine() (+11 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.15
Nodes (14): NotFoundScreen(), ActivityCard, ActivityCardProps, BusinessCardShell(), BusinessCardShellProps, EngineCard, EngineCardProps, statusLabel (+6 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.09
Nodes (56): useAccountingData(), UseAccountingDataResult, AccountingAttentionAction, AccountingQuickActionId, AccountingSnapshot, CashFlowPeriod, InvoiceStatus, TransactionStatus (+48 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.07
Nodes (41): PrinterIcon, Share2Icon, AccountingScreen(), AcAccountingEmptyState(), AcAccountingEmptyStateProps, AcAccountingSkeleton(), TileSkeleton(), AcMotorSaleDocumentsSheet (+33 more)

### Community 27 - "useAuth"
Cohesion: 0.19
Nodes (16): useCompanySubscription(), useEntitlementFor(), planById(), subscribeEntitlementRegistry(), companySubscriptionRef(), mapSubscription(), readCompanySubscription(), subscribeCompanySubscription() (+8 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.13
Nodes (15): useFadeIn(), usePageEnter(), useStaggerFadeIn(), AnimatedLine, AuthHeroCar(), FRONT_WHEEL, REAR_WHEEL, SPEED_LINES (+7 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.07
Nodes (45): OverviewScreen(), useRealtimeReconnect(), useSessionBootstrapReady(), reviveDatesDeep(), shouldReviveDateField(), preloadSessionSnapshots(), clearScheduledQueryDataApplies(), sessionBootstrapQueryKeys() (+37 more)

### Community 31 - "types.ts"
Cohesion: 0.07
Nodes (19): AuthEmailChip(), AuthEmailChipProps, NOTIFICATION_ROW_DIVIDER_INSET, CoAmountFieldProps, CoTypeSegment, CoTypeSelectorProps, JourneyOptionCard(), JourneyOptionCardProps (+11 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.09
Nodes (47): ActivityIcon, BarChart3Icon, BellIcon, BoxIcon, CarIcon, ChevronsUpDownIcon, ChevronUpIcon, ClipboardListIcon (+39 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.12
Nodes (29): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile() (+21 more)

### Community 34 - "haptics"
Cohesion: 0.06
Nodes (44): FlashlightIcon, DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus (+36 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.16
Nodes (14): getOAuthButtonTheme(), OAuthButtonTheme, resolveScheme(), ThemeProvider(), base(), defaultShadow(), floatingShadow(), ElevationLevel (+6 more)

### Community 36 - "index.ts"
Cohesion: 0.11
Nodes (33): useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), useNotificationPreferences(), useSession(), useUserDisplayCurrency(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS (+25 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.26
Nodes (17): getApiBaseUrl(), getBearerToken(), humanizeApiErrorBody(), mobileFetch(), mobileFetchBlob(), mobileGet(), mobilePatch(), mobilePostFlexible() (+9 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.17
Nodes (21): OAuthProvider, ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), accountUsesPassword() (+13 more)

### Community 39 - "rhythm"
Cohesion: 0.08
Nodes (27): SearchFilters(), SearchFiltersProps, AnimatedSection(), CATEGORY_ICONS, SearchIdle(), SearchIdleProps, catalog, CatalogEntry (+19 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.10
Nodes (26): ordersSpring, COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBar(), ComposerTabBarProps, ComposerTabOption, TabIcon (+18 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.14
Nodes (20): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+12 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.18
Nodes (10): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButton() (+2 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.15
Nodes (21): registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken(), fetchExpoPushTokenViaExperienceId(), ForegroundPushHandler (+13 more)

### Community 44 - "index.ts"
Cohesion: 0.08
Nodes (22): CheckCircle2Icon, ChevronRightIcon, CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, sizeMap, ListRow, ListRowProps (+14 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.07
Nodes (36): AuthProviderKind, badgeSize, monogramFontSize, UserAvatar(), UserAvatarProps, UserAvatarSize, DeleteAccountDialog(), DeleteAccountDialogProps (+28 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.05
Nodes (92): parseFeature(), PaywallRoute(), CheckIcon, ClockIcon, CloudIcon, LockIcon, AuthSocialCluster(), AuthSocialClusterProps (+84 more)

### Community 47 - "inventory.ts"
Cohesion: 0.14
Nodes (23): AuthenticatedLandingScreen(), CollectionRow, CompanySwitcherSheet(), CompanySwitcherSheetProps, profileRouteHref(), ProfileSnapshot, WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps (+15 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.08
Nodes (25): @autocore/billing, @autocore/org, expo-constants, expo-router, nativewind, dependencies, @autocore/billing, @autocore/org (+17 more)

### Community 50 - "index.ts"
Cohesion: 0.09
Nodes (34): allStoreSkus(), skuForPlan(), asPurchaseFailure(), CODE_MAP, failure(), isPurchaseFailure(), MESSAGES, readErrorCode() (+26 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.16
Nodes (13): CompanyEmployeeRow, useCompanyEmployees(), WorkspaceAccessCopy, SessionBootstrapPayload, AuthStore, initialState, AuthSnapshot, AuthStatus (+5 more)

### Community 52 - "types.ts"
Cohesion: 0.36
Nodes (6): computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters, isOpenOrderStatus()

### Community 53 - "push-channel.ts"
Cohesion: 0.22
Nodes (14): InviteAcceptScreen(), InviteAcceptScreenProps, clearPendingInvite(), storePendingInvite(), mobilePost(), acceptInvite(), acceptInviteByCode(), declineInvite() (+6 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.10
Nodes (23): OrderStatusBadge(), OrderStatusBadgeProps, OrderWorkflowProgress(), OrderWorkflowProgressProps, orderStatusLabel, resolveStatusInk(), StatusEmphasis, StatusInk (+15 more)

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.09
Nodes (32): ScreenActionFooter(), ScreenActionFooterProps, useOrdersLift(), canMarkCompleted(), explainCannotComplete(), humanizeTransitionError(), FOOTER_BUTTON_STYLE, footerStatusLabel() (+24 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.22
Nodes (14): isTabRouteName(), NO_TRANSITION, resolveTabRouteName(), TAB_ORDER, TabRouteName, TabTransitionContext, TabTransitionContextValue, TabTransitionProvider() (+6 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.13
Nodes (17): CoAmountField(), CoCard(), CoCardProps, CoSection(), CoSectionProps, CoToggleRow(), CoToggleRowProps, CoTypeSelector() (+9 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.43
Nodes (4): useFeatureGate(), evaluateGate(), FeatureLockedError, GateResult

### Community 60 - "login-screen.tsx"
Cohesion: 0.14
Nodes (18): ArrowRightIcon, Loader2Icon, AuthEmailPill(), AuthEmailPillProps, isValidEmail(), LoginScreen(), readInviteCompanyName(), readInviteEmail() (+10 more)

### Community 61 - "ScanService"
Cohesion: 0.22
Nodes (18): mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), disambiguateScanPayload(), pickScanCandidate() (+10 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.19
Nodes (13): withAlpha(), borderStyle(), toneStyles(), ringBorder(), createCardStyle(), createIconBadgeStyle(), createInputTextStyle(), createListRowStyle() (+5 more)

### Community 63 - "include"
Cohesion: 0.08
Nodes (25): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+17 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.10
Nodes (27): smoothEase, staggerDelay(), animationSpeed, buttonHeight, A11ySlice, designLanguageFromScheme(), cornerStyle, defaultEasing (+19 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.20
Nodes (15): AddToOrderHandlers, MotorActionHandlers, motorActionMessage(), motorActionTitle(), openSearchResult(), SearchRouter, showCatalogActions(), showMotorActions() (+7 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.21
Nodes (14): purchasablePlans(), emit(), EMPTY_PRODUCTS, getPurchaseStoreSnapshot(), listeners, PurchaseStoreSnapshot, setIntroEligible(), setProducts() (+6 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.27
Nodes (4): acceptsCameraInput(), ScanService, ScanDetection, ScanServiceSnapshot

### Community 68 - "document-import-screen.tsx"
Cohesion: 0.27
Nodes (6): kindLabel(), LocationContentsResponse, LocationScreen(), StatPill(), buildLocationEntityLink(), fetchLocationContentsFromFirestore()

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.39
Nodes (6): useCompanyInvites(), createCompanyInvite(), CreateInviteApiResponse, mapInviteDoc(), subscribeCompanyInvites(), InviteDocument

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.16
Nodes (16): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), fetchJsonWithTimeout(), AppleSignInApiPayload, AppleSignInApiResponse (+8 more)

### Community 71 - "mapAuthError"
Cohesion: 0.31
Nodes (5): AutocompleteInput, CreateInventoryItemScreen(), parseNumber(), ordersLayout, useMobileCreateInventoryItem()

### Community 72 - "input-field.tsx"
Cohesion: 0.16
Nodes (20): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStackProps, InputField, InputFieldProps (+12 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "composer-utils.ts"
Cohesion: 0.11
Nodes (18): body, callout, caption1, caption2, fontFamily, fontWeight, footnote, headline (+10 more)

### Community 75 - "animated-tab-screen.tsx"
Cohesion: 0.09
Nodes (35): PlanOffer, UseSubscriptionResult, comparePlans(), highestPlan(), PlanAvailability, PlanDescriptor, planForSku(), PLANS (+27 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.22
Nodes (12): usePressAnimation(), HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart, resolveIconColor(), SearchResultRow() (+4 more)

### Community 77 - "styles.ts"
Cohesion: 0.10
Nodes (16): PhoneIcon, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), OrderCard, OrderCardProps, SF, OrderClaimSection() (+8 more)

### Community 78 - "inline-autocomplete-row.tsx"
Cohesion: 0.23
Nodes (7): OrderRowBody(), OrderRowProps, pressTiming, SF, formatOrderListVehicleLine(), formatOrderVehicleLine(), formatWorkOrderLabel()

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.05
Nodes (48): TabLayout(), GripVerticalIcon, ModulesEditorList(), ModulesEditorListProps, NavEditorRowProps, NavigationEditorList(), NavigationEditorListProps, ACCOUNTING_DEMO (+40 more)

### Community 80 - "profile.ts"
Cohesion: 0.08
Nodes (47): AuthActions, AuthActionsContext, ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace(), useAuthActions() (+39 more)

### Community 81 - "document-import.ts"
Cohesion: 0.22
Nodes (8): DeliveryChannels, isServerCategoryEnabled(), PRIORITY_BASE, resolveDeliveryChannels(), resolveLiveEditingChannels(), resolveSyncChannels(), CategoryChannelPrefs, DEFAULT_EXTENDED_CATEGORY_PREFS

### Community 82 - "modules.ts"
Cohesion: 0.31
Nodes (10): queryClient, itemMatchesPayload(), resolveBarcodeFromLocalCatalog(), toMobileScanItem(), compactBarcode(), compactCode(), extractGs1Primary(), normalizeScanPayload() (+2 more)

### Community 83 - "location-screen.tsx"
Cohesion: 0.20
Nodes (11): IconButtonProps, PressableIconButton, sizes, ScreenProps, ScreenScrollProps, StackScreen(), StackScreenProps, useReleaseStackNavigationOnFocus() (+3 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.15
Nodes (14): SellMotorSheet, SellMotorSheetProps, SellMotorSheetRef, enqueueMotorSoldEffects(), fetchMotorWarrantyId(), MotorSoldEffectsPayload, MotorSoldEffectsResult, clientRepository (+6 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.07
Nodes (25): CollectionSwitchRow, ListSection(), StickyActionBarProps, ProfileAnimatedSectionProps, ProfileSegmentedControl(), ProfileSegmentedControlProps, ProfileScreenShell(), ProfileScreenShellProps (+17 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.28
Nodes (9): AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), formSheetScreenOptions(), NavigationPolicy, RouteCategory (+1 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.10
Nodes (19): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Icons, List dialects, Living gallery (+11 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.08
Nodes (37): useAuth(), AuthShell(), ForgotPasswordScreen(), isValidEmail(), SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, WorkspaceAccessScreen(), Button (+29 more)

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.10
Nodes (32): buildOrderDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType, ERROR_EVENTS, ErrorEventType, FINANCE_EVENTS, FinanceEventType (+24 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.09
Nodes (29): NotificationBellButton(), ActivityFeedFilters(), ActivityFeedFiltersProps, READ_FILTERS, DateGroup, DateGroupKey, formatNotificationTime(), GROUP_LABELS (+21 more)

### Community 92 - "kv.ts"
Cohesion: 0.11
Nodes (30): AppProviders(), AuthProvider(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, readRealtimeSnapshot(), clearRealtimeSubscriptions(), clearRecentQueriesCache(), clearSessionSnapshot() (+22 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.29
Nodes (6): resolveInviteHref(), guardedPush(), PushRouter, navigationHrefKey(), buildImportDeepLink(), resolveNotificationDeepLink()

### Community 96 - "useFloatingTabBarInset"
Cohesion: 0.19
Nodes (12): AcPayrollListProps, PayrollRow(), PayrollStatusBadge(), statusColors(), formatKzt(), nextPayrollStatus(), PAYROLL_STATUS_LABELS, formatTimestamp() (+4 more)

### Community 97 - "order-row.tsx"
Cohesion: 0.36
Nodes (5): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter()

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.17
Nodes (11): CopyIcon, CopyButton, CopyButtonProps, CopyButtonSize, CopyButtonVariant, ICON_SIZES, PressableCopyButton, SIZES (+3 more)

### Community 100 - "google-sign-in-button.tsx"
Cohesion: 0.13
Nodes (21): Listener, listeners, resetAppShellReady(), setAppShellReady(), applyNow(), drainOne(), flushScheduledQueryDataApplies(), getMsSinceLastCatalogApply() (+13 more)

### Community 101 - "highlighted-text.tsx"
Cohesion: 0.18
Nodes (12): ACCOUNTING_CATEGORY_SUGGESTIONS, CREATABLE_OPERATION_TYPES, OPERATION_ACCOUNT_LABELS, OPERATION_CATEGORY_LABELS, OPERATION_TYPE_LABELS, operationDirection(), OUTGOING_OPERATION_TYPES, PAYMENT_METHOD_LABELS (+4 more)

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+3 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.15
Nodes (17): FeatureGate(), TeamProGate(), TeamProGateProps, TeamRoleCard, TeamRoleCardProps, TeamSummaryCard(), buildInviteJoinUrl(), getInviteStatus() (+9 more)

### Community 105 - "financial-operation-repository.ts"
Cohesion: 0.23
Nodes (10): assertValidPayload(), createFinancialOperation(), CreatePayload, createTypedFinancialOperation(), FinancialOperationRepository, FinancialOperationsFilters, mapOperation(), readAmount() (+2 more)

### Community 106 - "team-invite-card.tsx"
Cohesion: 0.15
Nodes (9): DeviceClass, BreakpointKey, breakpoints, platform, screen, { width, height }, layoutRhythm, screenPadding (+1 more)

### Community 107 - "relocate-pending-store.ts"
Cohesion: 0.29
Nodes (6): Jumping to a specific state, Native build required, Products without App Store Connect, Running the subscription system in development, Safety, What the simulator does not fake

### Community 108 - "purchase-store.ts"
Cohesion: 0.11
Nodes (20): ButtonProps, PressableButton, ButtonShape, ButtonSize, ButtonVariant, buildNativeButtonModifiers(), mapBorderShape(), mapButtonStyle() (+12 more)

### Community 109 - "Autocore Mobile"
Cohesion: 0.22
Nodes (8): Autocore Mobile, Design system first, Getting started, Next steps, Project structure, Stack, Theme tokens, UI library

### Community 110 - "use-search-idle-data.ts"
Cohesion: 0.20
Nodes (8): OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), SourceLayout, useOrderTransition(), orderOpenGuard, scanNavigationGuard, tabNavigationGuard

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.14
Nodes (20): SearchIcon, IconButton, searchTimeline, SearchEnterConfig, useSearchEnter(), SearchBar(), SearchBarProps, SearchEmptyActionId (+12 more)

### Community 113 - "advances.ts"
Cohesion: 0.17
Nodes (16): clearDevMode(), DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS, devDisplayPrice(), devProducts(), DevScenario, DevScenarioId (+8 more)

### Community 114 - "team-employee-card.tsx"
Cohesion: 0.11
Nodes (22): ArrowUpRightIcon, formatCounter(), formatGroupedInteger(), McAnimatedCounter(), McAnimatedCounterProps, McCounterFormat, AnimatedPolyline, buildPoints() (+14 more)

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
Cohesion: 0.25
Nodes (7): PendingScanContext, scanContextStore, ScanContext, ScanInputKind, ScanOrderResult, ScanServiceListener, ScanSheetKind

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.03
Nodes (93): useShimmer(), DesignSystemScreen(), TabScreenPlaceholder(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize, ActionIconButtonVariant (+85 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.24
Nodes (7): MapPinIcon, InventoryCard, InventoryCardProps, LocationBadge, LocationBadgeProps, StockBadge, StockBadgeProps

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.28
Nodes (3): newOperationHref(), NewOperationPreset, CreatableOperationType

### Community 140 - "use-work-order-composer-options.ts"
Cohesion: 0.32
Nodes (3): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen

### Community 150 - "organization-switch-button.tsx"
Cohesion: 0.09
Nodes (33): HomeRoute(), AuthBootLoadingProps, AuthBrandMark(), AuthBrandMarkProps, AuthGate(), MemoAppTree, SubscriptionRequiredScreen, WorkspaceAccessScreen (+25 more)

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.11
Nodes (21): SettingsLinkRow, InvitePreviewCard(), TeamEmployeeCard, TeamEmployeeCardProps, styles, TeamInviteCardProps, TeamInviteRow, TeamBadge() (+13 more)

### Community 199 - "notification-bell-button.tsx"
Cohesion: 0.11
Nodes (21): stripUndefinedDeep(), mergeNotificationPreferences(), MobileApiError, updateNotificationPreferences(), buildPreferencesPayload(), preferencesRef(), saveNotificationPreferences(), subscribeNotificationPreferences() (+13 more)

### Community 201 - "create-icon.tsx"
Cohesion: 0.32
Nodes (5): AnimatedIconWrapper, createIcon(), IconState, IconSize, iconSizes

### Community 202 - "use-notification-preferences.ts"
Cohesion: 0.29
Nodes (6): CustomerCard, CustomerCardProps, Avatar, AvatarFallback(), AvatarProps, AvatarSize

### Community 203 - "auth-journey-screens.tsx"
Cohesion: 0.25
Nodes (6): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore

### Community 205 - "team-employee-card.tsx"
Cohesion: 0.46
Nodes (7): buildOperationsCsv(), escapeCsv(), operationToCsvRow(), shareOperationsCsv(), operationAccountLabel(), operationCategoryLabel(), operationTypeLabel()

### Community 206 - "team-invite-sheet.tsx"
Cohesion: 0.16
Nodes (11): ExternalLinkIcon, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS, profileLayout, INVITE_ROLE_HINTS, INVITE_ROLES (+3 more)

### Community 208 - "sidebar.tsx"
Cohesion: 0.03
Nodes (67): useCardLift(), IconProps, AlertTriangleIcon, XIcon, NotificationCard, InAppBannerProvider(), layoutTransition, styles (+59 more)

### Community 209 - "useScreenEnter"
Cohesion: 0.47
Nodes (5): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload()

### Community 210 - "useFloatingTabBarInset"
Cohesion: 0.36
Nodes (7): coerceInventoryString(), createInventoryItemRepository(), inventoryItemRepository, mapItem(), normalizeInventoryItem(), InventoryItemStatus, InventoryItemType

### Community 212 - "permissions.ts"
Cohesion: 0.36
Nodes (9): canRunSetupWizard(), can(), canEditInventory(), canEditWorkOrders(), canManageEmployees(), canManageSettings(), canViewEmployees(), canViewInventory() (+1 more)

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.14
Nodes (28): OrderFilterId, formatActivityTime(), buildWeekBars(), closedRevenueForDay(), isSameDay(), orderRevenue(), safePercent(), statusTone() (+20 more)

### Community 214 - "team-invite-status-filters.tsx"
Cohesion: 0.40
Nodes (4): INVITE_FILTER_OPTIONS, InviteStatusFilter, TeamInviteStatusFilters(), TeamInviteStatusFiltersProps

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.29
Nodes (13): toast(), PendingAdd, useAddToOrderFlow(), CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart() (+5 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.03
Nodes (73): ArrowLeftIcon, FilterIcon, IconName, iconRegistry, AuthDivider(), AuthBackdrop(), AuthShellProps, ProgressBar() (+65 more)

### Community 217 - "team-pro-gate.tsx"
Cohesion: 0.33
Nodes (6): Sidebar(), SidebarItem, SidebarProps, SidebarSection, isTablet(), sidebarWidth

### Community 218 - "invite-service.ts"
Cohesion: 0.20
Nodes (14): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES (+6 more)

### Community 219 - "ac-transfer-sheet.tsx"
Cohesion: 0.33
Nodes (3): AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef

### Community 221 - "photo-grid.tsx"
Cohesion: 0.40
Nodes (4): ImagesIcon, PhotoGrid, PhotoGridProps, useAdaptiveLayout()

### Community 222 - "recent-scans.ts"
Cohesion: 0.04
Nodes (91): OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, scanSheetAnimationConfigs, AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera (+83 more)

## Knowledge Gaps
- **1063 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1058 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `tab-transition-context.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `order-detail-screen.tsx`, `useTheme`, `Text`, `notification-service.ts`, `getJson`, `types.ts`, `notifications-settings-screen.tsx`, `useReducedMotion`, `currency-screen.tsx`, `types.ts`, `auth-gate.tsx`, `haptics`, `rhythm`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `organization-switch-button.tsx`, `autocomplete-provider.tsx`, `scan-service.ts`, `startup-tracer.ts`, `login-screen.tsx`, `document-import-screen.tsx`, `mapAuthError`, `input-field.tsx`, `use-notification-preferences.ts`, `search-idle.tsx`, `styles.ts`, `inline-autocomplete-row.tsx`, `subscription-screen.tsx`, `sidebar.tsx`, `team-invite-sheet.tsx`, `location-screen.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `ScanDebounce`, `delete-account.ts`, `team-pro-gate.tsx`, `search-engine-card.tsx`, `invite-service.ts`, `recent-scans.ts`, `useFloatingTabBarInset`, `copy-button.tsx`, `useFloatingTabBarInset`, `diagnostics-settings-screen.tsx`, `team-employee-card.tsx`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `Text` connect `sidebar.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `inventory-card.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `order-detail-screen.tsx`, `useTheme`, `Text`, `getJson`, `types.ts`, `notifications-settings-screen.tsx`, `useReducedMotion`, `currency-screen.tsx`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `rhythm`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `push-channel.ts`, `organization-switch-button.tsx`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `login-screen.tsx`, `document-import-screen.tsx`, `mapAuthError`, `input-field.tsx`, `use-notification-preferences.ts`, `search-idle.tsx`, `styles.ts`, `inline-autocomplete-row.tsx`, `team-invite-sheet.tsx`, `subscription-screen.tsx`, `location-screen.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `tab-transition-context.tsx`, `delete-account.ts`, `team-pro-gate.tsx`, `ac-transfer-sheet.tsx`, `invite-service.ts`, `search-engine-card.tsx`, `recent-scans.ts`, `useFloatingTabBarInset`, `useFloatingTabBarInset`, `purchase-store.ts`, `diagnostics-settings-screen.tsx`, `team-employee-card.tsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `haptics` connect `recent-scans.ts` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `accounting-screen.tsx`, `app-tab-bar.tsx`, `index.ts`, `order-detail-screen.tsx`, `useTheme`, `Text`, `getJson`, `types.ts`, `notifications-settings-screen.tsx`, `useReducedMotion`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `rhythm`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `login-screen.tsx`, `document-import-screen.tsx`, `mapAuthError`, `input-field.tsx`, `search-idle.tsx`, `styles.ts`, `inline-autocomplete-row.tsx`, `team-invite-sheet.tsx`, `sidebar.tsx`, `subscription-screen.tsx`, `location-screen.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `delete-account.ts`, `search-engine-card.tsx`, `ac-transfer-sheet.tsx`, `useFloatingTabBarInset`, `copy-button.tsx`, `useFloatingTabBarInset`, `purchase-store.ts`, `use-search-idle-data.ts`, `diagnostics-settings-screen.tsx`, `team-employee-card.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1063 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05568039950062422 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04908675799086758 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09178743961352658 - nodes in this community are weakly interconnected._