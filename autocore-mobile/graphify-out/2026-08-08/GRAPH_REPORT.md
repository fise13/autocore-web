# Graph Report - autocore-mobile  (2026-08-08)

## Corpus Check
- 936 files · ~369,056 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4669 nodes · 15092 edges · 235 communities (170 shown, 65 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 73 edges (avg confidence: 0.65)
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
- create-icon.tsx
- use-notification-preferences.ts
- auth-journey-screens.tsx
- expo-image-picker
- useFadeIn
- @autocore/avatars
- useScreenEnter
- CollectionSwitchRow
- app-loading-screen.tsx
- local-inventory-resolve.ts
- in-app-banner-provider.tsx
- tab-transition-context.tsx
- invite-service.ts
- orders-mail-list.ios.tsx
- @autocore/rbac
- priority-router.ts
- recent-scans.ts
- useScreenEnter
- order-transition-context.tsx
- use-accessibility.ts
- expo-blur
- intake-evidence-checklist.tsx
- useFadeIn
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
1. `useTheme()` - 480 edges
2. `Text` - 245 edges
3. `haptics` - 151 edges
4. `useReducedMotion()` - 108 edges
5. `useSession()` - 106 edges
6. `tokens` - 97 edges
7. `rhythm` - 96 edges
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
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  authentication/auth-provider.tsx → services/auth/apple-sign-in.ts
- `DrawablePath()` --calls--> `useTheme()`  [EXTRACTED]
  components/brand/app-loading-logo.tsx → hooks/use-theme.tsx

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`

## Communities (235 total, 65 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.11
Nodes (19): PhoneIcon, useOrderTransition(), OrderCard, OrderCardProps, SF, OrderRow, OrderRowBody(), OrderRowProps (+11 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.10
Nodes (20): CameraIcon, FlashList, OptimizedListProps, useListStaggerDelay(), ScreenGate(), IntakeCreateSerialSheet, IntakeCreateSerialSheetRef, IntakeJobRow() (+12 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.11
Nodes (35): planForSku(), clearEntitlementCaches(), asPurchaseFailure(), failure(), isCancellation(), isFlowBusy(), resetPurchaseStore(), setFlow() (+27 more)

### Community 3 - "text.tsx"
Cohesion: 0.04
Nodes (53): ChevronRightIcon, AuthDivider(), METRICS, PlanTag(), PremiumBadge(), PremiumBadgeProps, PremiumBadgeSize, FormPanel() (+45 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.11
Nodes (27): PlanOffer, useSubscription(), UseSubscriptionResult, purchasablePlans(), devDisplayPrice(), devProducts(), emit(), EMPTY_PRODUCTS (+19 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (34): ScreenEnterConfig, useScaleEnter(), enterValues, smoothEase, cardLift, cardPress, dialogBackdropEnter, dialogBackdropExit (+26 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.10
Nodes (24): mapCompositionToWorkOrderLines(), laborLineTotal(), normalizeLaborPricingMode(), INITIAL_LABOR_DRAFT, initialState, LaborDraft, LaborLineDraft, MotorLineDraft (+16 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.17
Nodes (16): OrdersGroupHeader(), OrdersMailList(), OrdersMailListProps, Bucket, BUCKET_LABEL, BUCKET_ORDER, bucketFor(), buildOrderRows() (+8 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.12
Nodes (23): AppProviders(), HomeRoute(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, getStartupMarks(), logStartupTable(), MarkEntry, marks (+15 more)

### Community 9 - "index.ts"
Cohesion: 0.10
Nodes (22): PROFILE_ROUTES, ProfileDangerAction, ProfileHubData, ProfileHubRouteId, ProfilePreferenceRow, ProfileQuickAction, ProfileRouteId, ProfileUser (+14 more)

### Community 10 - "index.ts"
Cohesion: 0.06
Nodes (57): clientRepository, useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useEmployeesRealtime(), useInventoryCatalog(), useMotorsRealtime(), useOperationsRealtime() (+49 more)

### Community 11 - "index.ts"
Cohesion: 0.11
Nodes (24): ScanSearchIcon, SearchIcon, searchSpring, searchTimeline, useSearchEnter(), SearchBar(), SearchBarProps, SearchEmptyActionId (+16 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.20
Nodes (19): EMPTY_JOB_DETAIL, JobDetailState, jobsCacheKey(), JobsState, useEngineIntakeJobDetail(), useEngineIntakeJobs(), engineIntakeJobDocument(), mapAssignment() (+11 more)

### Community 14 - "index.ts"
Cohesion: 0.15
Nodes (20): useEntitlementFor(), UseEntitlementResult, acquireEntitlement(), clearEntitlementRegistry(), clearSettleTimer(), EntitlementSnapshot, getEntitlementSnapshot(), IDLE_SNAPSHOT (+12 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.09
Nodes (24): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+16 more)

### Community 16 - "useTheme"
Cohesion: 0.07
Nodes (54): formatRelativeNow(), averageOfPoints(), buildWeeklyClosedCounts(), closedCountInRange(), insightChartIsUseful(), startOfDay(), WEEK_LABELS, buildWeekRevenueBars() (+46 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.08
Nodes (58): HomeDashboard, useHomeDashboard(), ACTIVE_INTAKE, buildAiInsight(), buildAttentionRows(), buildHomeNow(), buildHomeToday(), buildHomeTrend() (+50 more)

### Community 18 - "Text"
Cohesion: 0.21
Nodes (16): toast(), ToastAction, ToastItem, ToastStore, ToastVariant, PendingAdd, useAddToOrderFlow(), CompositionRouter (+8 more)

### Community 19 - "radius"
Cohesion: 0.10
Nodes (34): scanSheetAnimationConfigs, ScanCandidatesSheet, ScanCandidatesSheetProps, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanDocumentSheetProps, ScanMoveSheetProps, ScanNotFoundSheetProps (+26 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.04
Nodes (57): useShimmer(), DesignSystemScreen(), AlertTriangleIcon, GripVerticalIcon, AuthProviderKind, badgeSize, monogramFontSize, UserAvatar() (+49 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.13
Nodes (16): OAuthButtonTheme, OAuthProvider, resolveScheme(), ThemeProvider(), base(), ACCENT_PALETTE, applyAccentToColors(), defaultShadow() (+8 more)

### Community 22 - "getJson"
Cohesion: 0.06
Nodes (64): CREATE_HREF, HOME_HREF, JOIN_HREF, OrganizationCard, OrgCardProps, styles, SwitchOrganizationScreen(), useCompanyProfile() (+56 more)

### Community 23 - "types.ts"
Cohesion: 0.12
Nodes (24): useCompanyInvites(), AutocompleteDataStore, EMPTY, useAutocompleteDataStore, HydrationPayload, SessionHydrationPayload, AutocompleteDataHead(), extractOperationCategories() (+16 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.07
Nodes (47): NotFoundScreen(), ActivityIcon, MapPinIcon, ActivityCard, ActivityCardProps, BusinessCardShell(), BusinessCardShellProps, CustomerCard (+39 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.09
Nodes (50): useAccountingData(), UseAccountingDataResult, AccountingAttentionAction, AccountingQuickActionId, AccountingSnapshot, AttentionTone, CashFlowPeriod, InvoiceStatus (+42 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.10
Nodes (31): AccountingScreen(), AcAccountTiles, AcAccountingEmptyState(), AcBalanceCard, AcOperationsList(), AcTabBar(), AcTabBarProps, AcTabPanel() (+23 more)

### Community 27 - "useAuth"
Cohesion: 0.06
Nodes (54): ActionRoute(), ActionSheetHost(), tryPresent(), NavItemId, WorkScreen(), EXPO_TAB_HREFS, isNavItemModuleEnabled(), isNavItemVisible() (+46 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.11
Nodes (27): CATEGORY_HINTS, NotificationsSettingsScreen(), useNotificationInboxRealtime(), useNotificationInbox(), useNotificationPreferences(), stripUndefinedDeep(), mergeNotificationPreferences(), NotificationProvider() (+19 more)

### Community 29 - "paywall.tsx"
Cohesion: 0.10
Nodes (18): OrderWorkflowProgress(), OrderWorkflowProgressProps, getWorkflowStages(), resolveStageIndex(), STAGE_LABELS, WorkflowStage, WorkflowStageId, OrdersScreen() (+10 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.08
Nodes (41): useSessionBootstrapReady(), Listener, listeners, resetAppShellReady(), setAppShellReady(), applyNow(), clearScheduledQueryDataApplies(), drainOne() (+33 more)

### Community 31 - "types.ts"
Cohesion: 0.11
Nodes (22): IconProps, CheckCircle2Icon, ClockIcon, CloudIcon, AnalyticsCard, AnalyticsCardProps, BannerContent, contentFor() (+14 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.08
Nodes (52): ArrowUpRightIcon, BarChart3Icon, BellIcon, BoxIcon, CarIcon, ChevronsUpDownIcon, ChevronUpIcon, ClipboardListIcon (+44 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.24
Nodes (15): downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile(), ensureWarrantyPdfFile(), getAuthHeaders(), printWarrantyDocument(), shareWarrantyDocument(), mapDocumentError() (+7 more)

### Community 34 - "haptics"
Cohesion: 0.05
Nodes (39): FlashlightIcon, ScreenActionFooter(), ScreenActionFooterProps, DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps (+31 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.14
Nodes (11): ProfileScreenShell(), ProfileScreenShellProps, ModulesEditorList(), ModulesEditorListProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModulesScreen() (+3 more)

### Community 36 - "index.ts"
Cohesion: 0.15
Nodes (21): CurrencyScreen(), useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), APP_DISPLAY_CURRENCIES, AppDisplayCurrency, appDisplayCurrencyAffix(), formatAppMoney() (+13 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.14
Nodes (16): CreateInventoryItemInput, useMobileQuickReceive(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), mobileApi, INVENTORY_ITEM_STATUSES, INVENTORY_ITEM_TYPES (+8 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.13
Nodes (25): CachedSubscription, date(), deserialize(), iso(), readEntitlementCache(), readEntitlementCacheSync(), serialize(), SerializedSubscription (+17 more)

### Community 39 - "rhythm"
Cohesion: 0.16
Nodes (18): SearchFilters(), SearchFiltersProps, searchFilters, parseFilter(), SearchScreen(), SearchEngine, SearchFilterId, SearchFilterOption (+10 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.10
Nodes (26): ordersSpring, ordersTimeline, COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBar(), ComposerTabBarProps, ComposerTabOption (+18 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.14
Nodes (20): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+12 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.16
Nodes (14): FormListRow(), FormListSplitRow(), GroupedList(), GroupedSection(), CreateOrderScreen(), SheetNavButton(), SummaryRow(), compositionGrandTotal() (+6 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.15
Nodes (21): registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken(), fetchExpoPushTokenViaExperienceId(), ForegroundPushHandler (+13 more)

### Community 44 - "index.ts"
Cohesion: 0.20
Nodes (14): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), printWorkOrderDocument(), shareWorkOrderDocument(), resolveApplicableDocumentSlugs() (+6 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.11
Nodes (18): useAuth(), useAuthActions(), AuthenticatedLandingScreen(), SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, WorkspaceAccessScreen(), OrgDangerZone(), profileHubRouteHref() (+10 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.13
Nodes (31): CheckIcon, featureDelay(), paywallDuration, paywallEase, paywallEnter, paywallSpring, paywallTimeline, PaywallEnterConfig (+23 more)

### Community 47 - "inventory.ts"
Cohesion: 0.25
Nodes (16): WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, SubscriptionStatusCard(), SubscriptionStatusCardProps, TrialCountdown(), TrialCountdownProps, daysUntil(), formatDaysRemaining() (+8 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.07
Nodes (27): @autocore/billing, @autocore/rbac, expo-camera, expo-device, firebase, nativewind, dependencies, @autocore/billing (+19 more)

### Community 50 - "index.ts"
Cohesion: 0.09
Nodes (32): allStoreSkus(), skuForPlan(), CODE_MAP, isPurchaseFailure(), MESSAGES, readErrorCode(), toPurchaseFailure(), connect() (+24 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.07
Nodes (49): CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), QUICK_CATEGORIES, useSearchIdleData(), getStartupSummary(), CachedRealtimeSnapshot, flushOneWrite() (+41 more)

### Community 52 - "types.ts"
Cohesion: 0.16
Nodes (9): HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs, InlineAutocompleteRow, InlineAutocompleteRowProps (+1 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.19
Nodes (11): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButton() (+3 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.52
Nodes (6): fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord(), markAllInboxNotificationsRead(), subscribeInboxFromFirestore()

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.09
Nodes (29): EllipsisIcon, OrderClaimSection(), OrderClaimSectionProps, LineRow(), OrderLine, OrderLinesList(), OrderLinesListProps, Section() (+21 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.13
Nodes (34): MobileApiError, markAllNotificationsRead(), markNotificationState(), updateInboxNotificationState(), applyInboxPayload(), archiveServerNotification(), dismissServerNotification(), mapSyncError() (+26 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.07
Nodes (45): Dropdown(), AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, CoCard(), CoCardProps, CoSection(), CoSectionProps (+37 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.14
Nodes (17): ArrowRightIcon, Loader2Icon, AuthEmailPill(), AuthEmailPillProps, useAuthPressSpring(), isValidEmail(), LoginScreen(), readInviteCompanyName() (+9 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.20
Nodes (15): InviteAcceptScreen(), InviteAcceptScreenProps, InvitePreviewCard(), storePendingInvite(), mobilePost(), backfillTeamNotifications(), acceptInvite(), declineInvite() (+7 more)

### Community 61 - "ScanService"
Cohesion: 0.12
Nodes (27): mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), PendingScanContext, disambiguateScanPayload() (+19 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.10
Nodes (32): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, workspaceImport(), useAuthReady() (+24 more)

### Community 63 - "include"
Cohesion: 0.07
Nodes (27): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+19 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.15
Nodes (22): finalizeEngineIntakePhoto(), prepareEngineIntakePhoto(), sendEngineIntakeCommand(), buildSnapshot(), commandFailureBlocksJob(), drain(), errorMessage(), getSnapshot() (+14 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.11
Nodes (24): animationSpeed, buttonHeight, A11ySlice, cornerStyle, defaultEasing, glassStyle, iconWeight, iosControls (+16 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.14
Nodes (17): Can(), CanProps, RequirePermission(), RequirePermissionProps, buildWeekBars(), formatMoney(), MyEarningsScreen(), MyEarningsScreenProps (+9 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.09
Nodes (21): AuthBootLoadingProps, APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON (+13 more)

### Community 68 - "mobilePost"
Cohesion: 0.11
Nodes (20): AuthShell(), ForgotPasswordScreen(), isValidEmail(), ProfileNameJourneyScreen(), VerifyEmailJourneyScreen(), CompanyJourneyScreen(), CompanyMode, JoinCompanyScreen() (+12 more)

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.13
Nodes (14): ExternalLinkIcon, MailIcon, TeamInvitePresentOptions, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS, profileLayout (+6 more)

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.17
Nodes (15): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), fetchJsonWithTimeout(), AppleSignInApiPayload, AppleSignInApiResponse (+7 more)

### Community 71 - "mapAuthError"
Cohesion: 0.06
Nodes (68): AutocompleteOverlay, AutocompleteOverlayProps, DockPanelProps, AutocompleteInputProps, ComposerVehicleForm, useWorkOrderComposerOptions(), vehiclesInContext(), useAutocomplete() (+60 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.16
Nodes (19): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, InputField (+11 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "composer-utils.ts"
Cohesion: 0.11
Nodes (17): body, callout, caption1, caption2, fontWeight, footnote, headline, identifier (+9 more)

### Community 75 - "animated-tab-screen.tsx"
Cohesion: 0.11
Nodes (28): dateMs(), comparePlans(), highestPlan(), PlanAvailability, planById(), PlanDescriptor, PLANS, TIER_RANK (+20 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.21
Nodes (6): StaticTabScreen, ScanLauncherButton(), ScanLauncherButtonProps, ScanLauncherRow(), ScanScreen(), ScanEntityKind

### Community 77 - "styles.ts"
Cohesion: 0.05
Nodes (51): ImagesIcon, AnimatedLine, AuthHeroCar(), FRONT_WHEEL, HERO_DISPLAY_HEIGHT, HERO_DISPLAY_WIDTH, REAR_WHEEL, SPEED_LINES (+43 more)

### Community 78 - "inline-autocomplete-row.tsx"
Cohesion: 0.30
Nodes (12): usePressAnimation(), hasShelfValue(), isEngine(), SearchEngineCard(), SearchEngineCardProps, formatVin(), inventoryCardSubtitle(), normalizeCompareKey() (+4 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.25
Nodes (14): useOrderCompositionForm(), UseOrderCompositionFormOptions, resolveInventoryUnitPrice(), resolveQuickSpecificCategories(), SETUP_WIZARD_CATEGORY_PRESETS, assigneeRoleLabel(), EMPLOYEE_ROLE_LABELS, formatMoney() (+6 more)

### Community 80 - "profile.ts"
Cohesion: 0.07
Nodes (56): AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace() (+48 more)

### Community 81 - "document-import.ts"
Cohesion: 0.06
Nodes (30): ArrowLeftIcon, LockIcon, FeatureGateProps, FeatureLockedCard(), FeatureLockedCardProps, IconButton, IconButtonProps, sizes (+22 more)

### Community 82 - "modules.ts"
Cohesion: 0.15
Nodes (13): catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery(), quickCategories, recentlyViewedEngines (+5 more)

### Community 83 - "location-screen.tsx"
Cohesion: 0.27
Nodes (8): TabLayout(), AutocoreDock, isTabRouteName(), NO_TRANSITION, TAB_ORDER, TabTransitionContext, TabTransitionContextValue, TabTransitionProvider()

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.04
Nodes (77): TrendingDownIcon, acTimeline, AcAccountTilesProps, AccountTile(), TileDef, AcAdvancesOverview(), AcAdvancesOverviewProps, AdvanceRow() (+69 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.29
Nodes (8): createMotorRepository(), dedupeMotors(), mapMotor(), motorDocRef(), readLocalId(), readNumber(), MOTOR_STATUSES, MotorFilters

### Community 86 - "ScanDebounce"
Cohesion: 0.17
Nodes (14): ObjectsLayout(), AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), OrderTransitionContext, OrderTransitionContextValue (+6 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.09
Nodes (22): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Dynamic Island (iOS Live Activities), Floating dock, Home (Mission Control) (+14 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.08
Nodes (25): PlusIcon, AcHeader(), AcHeaderProps, todayLabel(), CategoryPill(), CoCategoryField(), CoCategoryFieldProps, PillProps (+17 more)

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.10
Nodes (29): resolveInviteHref(), notifyApiError(), notifyNetworkStatus(), buildImportDeepLink(), buildOrderDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink(), AI_EVENTS (+21 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.16
Nodes (17): ActivityDateGroup(), ActivityFeedFilters(), NotificationInboxSkeleton(), groupNotificationsByDate(), NotificationInboxScreen(), useNotificationService(), isSameStackInboxReturn(), notificationInboxHref() (+9 more)

### Community 92 - "kv.ts"
Cohesion: 0.23
Nodes (10): WarehouseFilter, WarehouseItemRow, WarehouseScreen(), useRealtimeReconnect(), resolveInventoryShelf(), inventoryMatchesQuery(), inventoryStatus(), inventoryVehicleLabel() (+2 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.17
Nodes (20): IntakeCamera, IntakeCameraHandle, IntakeCameraProps, IntakeCaptureChrome(), createClaimCommand(), EngineIntakeJobsScreen(), EngineIntakeSessionScreen(), makeWorkerCommand() (+12 more)

### Community 95 - "invite-accept-screen.tsx"
Cohesion: 0.20
Nodes (10): AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES (+2 more)

### Community 96 - "location-contents.ts"
Cohesion: 0.31
Nodes (7): computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters, isOpenOrderStatus(), OrderFilterOption

### Community 97 - "order-row.tsx"
Cohesion: 0.42
Nodes (8): can(), canEditInventory(), canEditWorkOrders(), canManageEmployees(), canManageSettings(), canViewEmployees(), canViewInventory(), canViewWorkOrders()

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.08
Nodes (27): PrinterIcon, Share2Icon, AutocompleteInput, AcMotorSaleDocumentsSheet, AcMotorSaleDocumentsSheetProps, AcMotorSaleDocumentsSheetRef, DocAction, SellMotorSheet (+19 more)

### Community 100 - "google-sign-in-button.tsx"
Cohesion: 0.43
Nodes (6): useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled(), DesignLanguageContext

### Community 101 - "appearance-settings-screen.tsx"
Cohesion: 0.15
Nodes (12): CollectionSwitchRow, SettingsToggleRowProps, AppearanceSettingsScreen(), THEME_OPTIONS, ACCENT_COLORS, AppearanceSettingsState, DEFAULT_APPEARANCE, useAppearanceSettingsStore (+4 more)

### Community 102 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+5 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.19
Nodes (22): DocumentImportJobStatus, DocumentImportUploadResult, getDocumentImportStatus(), pollDocumentImportUntilSettled(), assertJsonApiResponse(), getApiBaseUrl(), getBearerToken(), humanizeApiErrorBody() (+14 more)

### Community 105 - "financial-operation-repository.ts"
Cohesion: 0.52
Nodes (6): CACHE, CacheEntry, cacheKey(), clearScanResolveCache(), readScanResolveCache(), writeScanResolveCache()

### Community 106 - "team-invite-card.tsx"
Cohesion: 0.06
Nodes (34): normalizeCode(), VerificationCodeInput(), VerificationCodeInputProps, FloatingButton(), FloatingButtonProps, HorizontalFilterBar(), HorizontalFilterBarProps, HorizontalFilterOption (+26 more)

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
Cohesion: 0.18
Nodes (9): settingsRouteHref(), AdvancedScreen(), resolveProvider(), SecuritySettingsScreen(), useGuardedRouter(), guardedPush(), PushRouter, navigationHrefKey() (+1 more)

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.47
Nodes (5): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload()

### Community 113 - "advances.ts"
Cohesion: 0.17
Nodes (24): DevSubscriptionPanel(), readDevOffline(), DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS, DevScenario, DevScenarioId, DevState (+16 more)

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
Cohesion: 0.53
Nodes (4): appendLocalFile(), createLocalFileFormData(), AvatarUploadResult, uploadUserAvatar()

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.03
Nodes (84): useCardLift(), CopyIcon, TabScreenPlaceholder(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize, ActionIconButtonVariant (+76 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.16
Nodes (12): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, vehicleRepository (+4 more)

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.05
Nodes (74): ChartPoint, LineChart, LineChartProps, AnimatedPressable, styles, Button, ButtonProps, ButtonShape (+66 more)

### Community 141 - "expo-auth-session"
Cohesion: 0.29
Nodes (14): EMPTY, useAccountingPreferences(), useUserDisplayCurrency(), normalizeAppDisplayCurrency(), AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings(), patchAccountingSettings() (+6 more)

### Community 146 - "expo-device"
Cohesion: 0.17
Nodes (15): HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart, resolveIconColor(), SearchResultRow(), SearchResultRowProps (+7 more)

### Community 148 - "expo-haptics"
Cohesion: 0.17
Nodes (21): ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), isAppleSignInCancellation(), accountUsesPassword() (+13 more)

### Community 156 - "expo-splash-screen"
Cohesion: 0.15
Nodes (15): staggerDelay(), borderStyle(), designLanguageFromScheme(), toneStyles(), pickMotion(), ringBorder(), createCardStyle(), createIconBadgeStyle() (+7 more)

### Community 157 - "expo-status-bar"
Cohesion: 0.19
Nodes (15): AddToOrderHandlers, MotorActionHandlers, motorActionMessage(), motorActionTitle(), openSearchResult(), SearchRouter, showCatalogActions(), showMotorActions() (+7 more)

### Community 165 - "react-dom"
Cohesion: 0.20
Nodes (9): ListRow, ListRowProps, styles, ProfileDangerZone(), ProfileDangerZoneProps, ProfileNavCard(), ProfileNavCardProps, ProfileSettingsGroup() (+1 more)

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.08
Nodes (39): FeatureGate(), TeamProGate(), TeamProGateProps, TeamDirectoryRow, TeamEmployeeCard, TeamEmployeeCardProps, INVITE_FILTER_OPTIONS, InviteStatusFilter (+31 more)

### Community 201 - "create-icon.tsx"
Cohesion: 0.44
Nodes (8): itemMatchesPayload(), resolveBarcodeFromLocalCatalog(), toMobileScanItem(), compactBarcode(), compactCode(), extractGs1Primary(), normalizeScanPayload(), scanPayloadKey()

### Community 202 - "use-notification-preferences.ts"
Cohesion: 0.06
Nodes (40): NotificationCard, ActivityFeedFiltersProps, READ_FILTERS, ActivityNotificationRow, ActivityNotificationRowProps, SwipeActionProps, DateGroup, DateGroupKey (+32 more)

### Community 203 - "auth-journey-screens.tsx"
Cohesion: 0.07
Nodes (25): XIcon, AnimatedTabScreen, AnimatedTabScreenProps, AutocoreDockInner(), resolveTabRouteName(), TabRouteName, useTabTransition(), resolveCurrentTab() (+17 more)

### Community 206 - "useFadeIn"
Cohesion: 0.15
Nodes (9): DeviceClass, BreakpointKey, breakpoints, platform, screen, sidebarWidth, { width, height }, screenPadding (+1 more)

### Community 207 - "@autocore/avatars"
Cohesion: 0.21
Nodes (14): accentFor(), OperationsLiveActivityHost(), OperationsLiveActivity, OperationsLiveActivityLayout(), OperationsLiveActivityProps, systemIcon(), DesiredLiveActivity, liveActivityContentKey() (+6 more)

### Community 209 - "useScreenEnter"
Cohesion: 0.26
Nodes (13): ScanDocumentUploadResult, uploadScanDocument(), formatRelativeTime(), loadRecentScans(), mapStored(), mergeRecents(), migrateLegacyIfNeeded(), normalizeStored() (+5 more)

### Community 212 - "CollectionSwitchRow"
Cohesion: 0.16
Nodes (17): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES (+9 more)

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.12
Nodes (29): FilterIcon, IosLiftMenuItem, OrdersLiftContext, OrdersLiftContextValue, OrdersLiftProvider(), OrdersLiftSession, useOrdersLift(), MailOrderRow() (+21 more)

### Community 214 - "local-inventory-resolve.ts"
Cohesion: 0.16
Nodes (17): parseFeature(), PaywallRoute(), LifeBuoyIcon, PaywallScreen(), useFeatureGate(), UseFeatureGateResult, PresentPaywall, usePaywall() (+9 more)

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.22
Nodes (13): presentOrganizationSwitcher(), HomeHeader(), profileRouteHref(), CompanySettingsScreen(), MODULE_LABELS, WorkspaceScreen(), useActiveCompanyName(), useEntitlement() (+5 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.06
Nodes (37): AuthEmailChip(), AuthEmailChipProps, HeroBackdrop(), AuthBackdrop(), AuthShellProps, ProgressBar(), InviteFormNotice(), InviteFormNoticeProps (+29 more)

### Community 218 - "invite-service.ts"
Cohesion: 0.36
Nodes (5): MODES, RnSegmentedScanMode(), ScanModeControl(), ScanModeControlProps, ScanCaptureMode

### Community 219 - "orders-mail-list.ios.tsx"
Cohesion: 0.11
Nodes (18): scanSpring, scanTimeline, ScanConfirmFlash(), ScanConfirmFlashProps, ScanFrameOverlay(), ScanFrameOverlayProps, ScanOrderContextBanner(), ScanOrderContextBannerProps (+10 more)

### Community 222 - "recent-scans.ts"
Cohesion: 0.10
Nodes (23): OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanDocumentSheet, ScanIdleIndicator() (+15 more)

### Community 223 - "useScreenEnter"
Cohesion: 0.29
Nodes (6): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter(), SearchEnterConfig

### Community 225 - "use-accessibility.ts"
Cohesion: 0.32
Nodes (5): AnimatedIconWrapper, createIcon(), IconState, IconSize, iconSizes

### Community 230 - "intake-evidence-checklist.tsx"
Cohesion: 0.13
Nodes (13): CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, fontMap, radiusMap, sizeMap, SettingsLinkRow, SettingsLinkRowProps (+5 more)

### Community 231 - "useFadeIn"
Cohesion: 0.53
Nodes (5): useFadeIn(), usePageEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps

### Community 232 - "gradients.ts"
Cohesion: 0.11
Nodes (28): OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent(), ScanUnknownSheetProps, sheetPresentationKey(), useDevMockFallback(), useScanExperience(), classifyScanPayload() (+20 more)

## Knowledge Gaps
- **1170 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1165 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `text.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `profile-danger-zone.tsx`, `snapshot-builders.ts`, `index.ts`, `index.ts`, `order-detail-screen.tsx`, `expo-device`, `radius`, `firestore-timestamp.ts`, `getJson`, `notifications-settings-screen.tsx`, `useAuth`, `paywall.tsx`, `types.ts`, `auth-gate.tsx`, `haptics`, `react-dom`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `types.ts`, `push-channel.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `mobilePost`, `ac-payroll-list.tsx`, `input-field.tsx`, `use-notification-preferences.ts`, `auth-journey-screens.tsx`, `search-idle.tsx`, `styles.ts`, `inline-autocomplete-row.tsx`, `document-import.ts`, `location-screen.tsx`, `ac-payroll-list.tsx`, `CollectionSwitchRow`, `ScanDebounce`, `app-loading-screen.tsx`, `tab-transition-context.tsx`, `delete-account.ts`, `search-engine-card.tsx`, `in-app-banner-provider.tsx`, `orders-mail-list.ios.tsx`, `local-inventory-resolve.ts`, `deep-link-resolver.ts`, `recent-scans.ts`, `copy-button.tsx`, `google-sign-in-button.tsx`, `appearance-settings-screen.tsx`, `intake-evidence-checklist.tsx`, `gradients.ts`, `team-invite-card.tsx`, `advances.ts`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `Text` connect `profile-danger-zone.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `text.tsx`, `snapshot-builders.ts`, `index.ts`, `order-detail-screen.tsx`, `expo-device`, `radius`, `firestore-timestamp.ts`, `getJson`, `notifications-settings-screen.tsx`, `useReducedMotion`, `currency-screen.tsx`, `paywall.tsx`, `types.ts`, `auth-gate.tsx`, `haptics`, `index.ts`, `react-dom`, `rhythm`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `types.ts`, `push-channel.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `login-screen.tsx`, `mobilePost`, `ac-payroll-list.tsx`, `input-field.tsx`, `use-notification-preferences.ts`, `auth-journey-screens.tsx`, `search-idle.tsx`, `styles.ts`, `inline-autocomplete-row.tsx`, `document-import.ts`, `ac-payroll-list.tsx`, `CollectionSwitchRow`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `delete-account.ts`, `search-engine-card.tsx`, `invite-service.ts`, `orders-mail-list.ios.tsx`, `kv.ts`, `deep-link-resolver.ts`, `recent-scans.ts`, `invite-accept-screen.tsx`, `copy-button.tsx`, `appearance-settings-screen.tsx`, `intake-evidence-checklist.tsx`, `gradients.ts`, `team-invite-card.tsx`, `advances.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `useSession()` connect `in-app-banner-provider.tsx` to `create-operation-screen.tsx`, `text.tsx`, `team-screen.tsx`, `profile-danger-zone.tsx`, `index.ts`, `useTheme`, `auth-provider.tsx`, `Text`, `firestore-timestamp.ts`, `getJson`, `types.ts`, `scan-screen.tsx`, `useReducedMotion`, `useAuth`, `currency-screen.tsx`, `auth-gate.tsx`, `haptics`, `index.ts`, `rhythm`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `index.ts`, `my-earnings-screen.tsx`, `client-repository.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `profile-screen.tsx`, `login-screen.tsx`, `search-idle.tsx`, `@autocore/avatars`, `profile.ts`, `document-import.ts`, `CollectionSwitchRow`, `app-loading-screen.tsx`, `local-inventory-resolve.ts`, `search-engine-card.tsx`, `kv.ts`, `deep-link-resolver.ts`, `recent-scans.ts`, `order-row.tsx`, `gradients.ts`, `use-search-idle-data.ts`, `advances.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1170 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11182795698924732 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10897435897435898 - nodes in this community are weakly interconnected._