# Graph Report - autocore-mobile  (2026-07-17)

## Corpus Check
- 755 files · ~216,121 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3527 nodes · 11414 edges · 211 communities (151 shown, 60 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de8a104c`
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
- subscription-registry.ts
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
- design-language-context.ts
- scan-service.ts
- startup-tracer.ts
- document-file-actions.ts
- use-profile-snapshot.ts
- ScanService
- profile-screen.tsx
- include
- setup-wizard-screen.tsx
- apple-sign-in.ts
- login-screen.tsx
- notification-bell-button.tsx
- document-import-screen.tsx
- search-results.tsx
- rbac.ts
- mapAuthError
- input-field.tsx
- Issues found & resolutions
- mobilePost
- useSearchEnter
- search-idle.tsx
- styles.ts
- appearance-settings-screen.tsx
- subscription-screen.tsx
- profile.ts
- document-import.ts
- useFloatingTabBarInset
- use-mission-control-data.ts
- mock-search-catalog.ts
- order-documents-section.tsx
- ScanDebounce
- version-settings-screen.tsx
- delete-account.ts
- google-sign-in-button.tsx
- index.ts
- auth-oauth-button.tsx
- form
- Manual Matrix
- search-result-row.tsx
- mobile-client.ts
- location-screen.tsx
- team-employee-card.tsx
- package.json
- notification-provider.tsx
- scan-glass-panel.tsx
- resolve-active-company-name.ts
- scripts
- index.ts
- invite-accept-screen.tsx
- use-add-to-order-flow.ts
- search-engine-card.tsx
- should-hide-tab-bar.ts
- scan-move-sheet.tsx
- Autocore Mobile
- create-icon.tsx
- Firebase integration QA matrix
- sidebar.tsx
- useAccessibility
- recent-scans.ts
- metro.config.js
- invite-code.ts
- with-ios-universal-links.js
- ExternalLink.tsx
- useColorScheme.web.ts
- settings-animated-card.tsx
- prefer-iphone-macro-lens.ts
- with-ios-push-entitlements.js
- tab-bar-visibility-store.ts
- @autocore/avatars
- @autocore/domain-search
- @autocore/org
- date-fns
- expo
- expo-apple-authentication
- expo-auth-session
- expo-blur
- expo-clipboard
- expo-constants
- expo-crypto
- expo-device
- expo-file-system
- expo-haptics
- expo-image
- expo-image-picker
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
- react-native-gesture-handler
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
- work-order-repository.ts
- mc-animated-sparkline.tsx
- mock-orders.ts
- NotificationService
- setJson
- permissions.ts
- organization-membership-row.tsx
- payroll-transaction.ts
- motor-repository.ts
- order-card.tsx
- barcode-mapping-repository.ts
- motor.ts
- react-native-safe-area-context

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 344 edges
2. `Text` - 191 edges
3. `rhythm` - 123 edges
4. `haptics` - 109 edges
5. `useSession()` - 83 edges
6. `getFirebaseDb()` - 81 edges
7. `toneBackground()` - 81 edges
8. `useReducedMotion()` - 67 edges
9. `normalizeCompanyId()` - 64 edges
10. `isProductionCompanyId()` - 51 edges

## Surprising Connections (you probably didn't know these)
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  autocore-mobile/animations/presets.ts → autocore-mobile/hooks/use-accessibility.ts
- `DesignSystemScreen()` --calls--> `useDesignLanguage()`  [EXTRACTED]
  autocore-mobile/app/design-system.tsx → autocore-mobile/hooks/use-design-language.ts
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  autocore-mobile/authentication/auth-provider.tsx → autocore-mobile/services/auth/apple-sign-in.ts
- `useAuthReady()` --calls--> `useAuthStore`  [EXTRACTED]
  autocore-mobile/authentication/auth-provider.tsx → autocore-mobile/store/auth-store.ts
- `DrawablePath()` --calls--> `useTheme()`  [EXTRACTED]
  autocore-mobile/components/brand/app-loading-logo.tsx → autocore-mobile/hooks/use-theme.tsx

## Import Cycles
- 1-file cycle: `autocore-mobile/lib/vehicles/vehicle-catalog.ts -> autocore-mobile/lib/vehicles/vehicle-catalog.ts`

## Communities (211 total, 60 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.14
Nodes (18): AutocompleteOverlay, AutocompleteOverlayProps, styles, AutocompletePanel(), AutocompleteRow, AutocompleteRowProps, styles, AutocompleteOptionDisplay (+10 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.13
Nodes (22): KeyboardFormShell(), KeyboardFormShellProps, CreateOperationScreen(), readPreset(), buildOperationsCsv(), escapeCsv(), operationToCsvRow(), shareOperationsCsv() (+14 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.14
Nodes (14): OrderOpenOverlay(), OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), OverlayProps, SourceLayout, useOrderTransition(), { width: SCREEN_W, height: SCREEN_H } (+6 more)

### Community 3 - "text.tsx"
Cohesion: 0.03
Nodes (89): useCardLift(), useShimmer(), DesignSystemScreen(), IconProps, Loader2Icon, AnalyticsCard, AnalyticsCardProps, TabScreenPlaceholderProps (+81 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.06
Nodes (49): MailIcon, SectionHeader(), OrganizationMembershipRow, InvitePreviewCard(), TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS (+41 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (41): ScreenEnterConfig, useFadeIn(), usePageEnter(), useScaleEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps, enterValues (+33 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.16
Nodes (21): useOrderCompositionForm(), UseOrderCompositionFormOptions, resolveInventoryUnitPrice(), formatMotorDisplayName(), formatMotorLineLabel(), MotorNameParts, resolveQuickSpecificCategories(), SETUP_WIZARD_CATEGORY_PRESETS (+13 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.11
Nodes (40): AccountingAttentionAction, AccountingQuickActionId, AttentionTone, CashFlowPeriod, InvoiceStatus, TransactionStatus, TrendTone, resolveWeekChartBars() (+32 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.07
Nodes (30): ListGroup(), AcAccountingSkeleton(), TileSkeleton(), AcAdvancesOverview(), AcAdvancesOverviewProps, AdvanceRow(), AcOperationsListProps, OperationRow (+22 more)

### Community 9 - "index.ts"
Cohesion: 0.13
Nodes (15): ActivityIcon, BellIcon, DownloadIcon, HelpCircleIcon, SparklesIcon, UserRoundIcon, CATEGORY_ICONS, CategoryIcon (+7 more)

### Community 10 - "index.ts"
Cohesion: 0.17
Nodes (27): useAccountingData(), UseAccountingDataResult, CreateOrderScreen(), OrderDetailScreen(), clientRepository, useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime() (+19 more)

### Community 11 - "index.ts"
Cohesion: 0.06
Nodes (62): NotFoundScreen(), AuthEmailChipProps, ActivityCard, ActivityCardProps, BusinessCardShell(), BusinessCardShellProps, CustomerCard, CustomerCardProps (+54 more)

### Community 12 - "useSession"
Cohesion: 0.17
Nodes (20): AnimatedTabScreen, Screen(), OrderPickerSheet, parseFilter(), SearchScreen(), WarehouseFilter, WarehouseScreen(), useInventorySearch() (+12 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.11
Nodes (16): GripVerticalIcon, NavEditorRowProps, NavigationEditorList(), NavigationEditorListProps, NavigationPreview(), NavigationPreviewProps, DEFAULT_NAV_ENABLED, DEFAULT_NAV_ORDER (+8 more)

### Community 14 - "index.ts"
Cohesion: 0.09
Nodes (19): CheckIcon, ChevronDownIcon, CopyIcon, CopyButton, CopyButtonProps, CopyButtonSize, CopyButtonVariant, ICON_SIZES (+11 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.26
Nodes (10): OrdersScreen(), OrderFilterId, WorkOrder, computeMobileOrdersMeta(), estimateProgress(), filterMobileOrders(), formatTimeLabel(), mapDomainStatusToMobile() (+2 more)

### Community 16 - "useTheme"
Cohesion: 0.04
Nodes (56): ChevronRightIcon, iconRegistry, AuthBootLoadingProps, normalizeCode(), VerificationCodeInput(), VerificationCodeInputProps, TabScreenPlaceholder(), AppLoadingScreen() (+48 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.14
Nodes (28): OAuthProvider, useAuthActionsController(), isAppleSignInCancellation(), accountUsesPassword(), deleteAccountForCurrentUser(), DeleteAccountInput, isCancelled(), reauthenticateForDeletion() (+20 more)

### Community 18 - "Text"
Cohesion: 0.09
Nodes (20): SettingsSectionCard(), ProfileMetaCard(), ProfileMetaCardProps, ProfileScreenShell(), ProfileScreenShellProps, profileLayout, OPTIONS, ToggleRowProps (+12 more)

### Community 19 - "radius"
Cohesion: 0.05
Nodes (84): TrendingDownIcon, resolveTabRouteName(), useTabTransition(), resolveCurrentTab(), resolveTabFromHref(), TabNavigateTarget, useNavigateTab(), acTimeline (+76 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.11
Nodes (22): notifyFirestoreSnapshotError(), toDateFromFirestore(), documentGenerationJobRepository, mapJob(), FinancialOperationsFilters, mapOperation(), readAmount(), coerceInventoryString() (+14 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.15
Nodes (25): openNotificationDeepLink(), applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems() (+17 more)

### Community 22 - "getJson"
Cohesion: 0.13
Nodes (28): CachedSubscription, clearSubscriptionCaches(), deserializeSubscription(), readSubscriptionCache(), readSubscriptionCacheSync(), SerializedSubscription, clearSubscriptionRegistry(), clearRealtimeSubscriptions() (+20 more)

### Community 23 - "types.ts"
Cohesion: 0.15
Nodes (14): NotificationCard, ActivityDateGroup(), ActivityDateGroupProps, ActivityNotificationRow, ActivityNotificationRowProps, DateGroup, DateGroupKey, formatNotificationTime() (+6 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.13
Nodes (21): stripUndefinedDeep(), mergeNotificationPreferences(), backfillTeamNotifications(), fetchNotificationPreferences(), InboxResponse, PreferencesResponse, updateNotificationPreferences(), buildPreferencesPayload() (+13 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.06
Nodes (30): BARCODE_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, styles, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanConfirmFlash() (+22 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.15
Nodes (11): profileSpring, profileTimeline, scanSpring, scanTimeline, AnimatedPath, ScanFrameOverlay(), ScanFrameOverlayProps, scanLayout (+3 more)

### Community 27 - "useAuth"
Cohesion: 0.13
Nodes (26): CompanySwitcherSheet(), CompanySwitcherSheetProps, styles, TeamProGate(), TeamProGateProps, STATUS_LABELS, SubscriptionScreen(), WorkspaceSubscriptionCard() (+18 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.13
Nodes (29): CurrencyScreen(), styles, useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), useUserDisplayCurrency(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS (+21 more)

### Community 29 - "subscription-registry.ts"
Cohesion: 0.10
Nodes (29): noop(), serializeSubscription(), writeSubscriptionCache(), acquireCompanySubscription(), createEntry(), getSubscriptionSnapshot(), IDLE_SNAPSHOT, listeners (+21 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.10
Nodes (35): useSessionBootstrapReady(), reviveDatesDeep(), shouldReviveDateField(), sessionBootstrapQueryKeys(), CachedRealtimeSnapshot, clearRealtimeSnapshots(), flushPendingWrites(), isFresh() (+27 more)

### Community 31 - "types.ts"
Cohesion: 0.16
Nodes (12): IconName, ACCOUNTING_DEMO, DESKTOP_DEMO, PERMISSION_GROUPS, WORKSPACE_DEMO, DemoPermission, PermissionGroupId, ProductModuleConfig (+4 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.15
Nodes (22): AuthGate(), MemoAppTree, AuthLoadingScreen(), useAuthHasAccess(), AuthRedirectEffect(), AuthJourneyStep, canRunSetupWizard(), isEmailPasswordUser() (+14 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.14
Nodes (14): MemoTabBar, TAB_SCREEN_OPTIONS, AppTabBar, AppTabBarItem, AppTabBarProps, TAB_ICON_STROKE, TabRoute, TabVisual (+6 more)

### Community 34 - "haptics"
Cohesion: 0.12
Nodes (17): ComposerTabBarProps, ComposerTabOption, TabIcon, OrderCardSkeleton(), OrderCardSkeletonProps, OrdersLoadingState(), OrdersLoadingStateProps, indexCenter() (+9 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.12
Nodes (28): ScanMoveSheet, ScanMoveSheetProps, ScanMoveTarget, sheetPresentationKey(), useDevMockFallback(), useScanExperience(), entityLinkLabel(), MobileAssignAssetResult (+20 more)

### Community 36 - "index.ts"
Cohesion: 0.08
Nodes (38): ActivityFeedFiltersProps, CATEGORY_OPTIONS, READ_FILTERS, buildOrderDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType, ERROR_EVENTS (+30 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.08
Nodes (32): ScanCandidatesSheet, ScanCandidatesSheetProps, ActionButton(), ScanProductSheet, ScanProductSheetProps, StatCell(), StatDivider(), ScanProductThumb() (+24 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.23
Nodes (18): useCompanyProfile(), CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), normalizeCompanyId(), resolveCompanyIdsForSync(), hydrateMembershipNames(), listUserCompanyMemberships() (+10 more)

### Community 39 - "rhythm"
Cohesion: 0.13
Nodes (16): AutocompleteInput, SellMotorSheet, SellMotorSheetProps, SellMotorSheetRef, enqueueMotorSoldEffects(), fetchMotorWarrantyId(), MotorSoldEffectsPayload, MotorSoldEffectsResult (+8 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.13
Nodes (20): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabPanel(), ComposerTabPanelProps, resolveEntering(), resolveExiting(), CompositionAddCard() (+12 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.16
Nodes (15): ScanDocumentSheet, ScanDocumentSheetProps, classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem (+7 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.14
Nodes (12): XIcon, InAppBannerProvider(), layoutTransition, styles, Dialog(), DialogProps, IconButton, IconButtonProps (+4 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.09
Nodes (39): getOAuthButtonTheme(), OAuthButtonTheme, resolveScheme(), ThemeContext, ThemeContextValue, ThemeProvider(), ThemeProviderProps, withAlpha() (+31 more)

### Community 44 - "index.ts"
Cohesion: 0.08
Nodes (27): useScreenEnter(), AnimatedPath, AppLoadingLogo(), AppLoadingLogoProps, AppLoadingLogoStatic(), DrawablePath(), easeInOut, NOTIFICATION_ROW_DIVIDER_INSET (+19 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.08
Nodes (35): Can(), CanProps, RequirePermission(), RequirePermissionProps, ScreenScroll(), MissionControlBody(), MissionControlWeekBar, formatActivityTime() (+27 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.33
Nodes (7): toast(), ToastAction, ToastItem, ToastStore, useToastStore, ToastProvider(), ToastVariant

### Community 47 - "inventory.ts"
Cohesion: 0.16
Nodes (13): useMobileQuickReceive(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), INVENTORY_ITEM_STATUSES, INVENTORY_ITEM_TYPES, InventoryItemStatus, InventoryItemType (+5 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.08
Nodes (25): @autocore/avatars, @autocore/rbac, clsx, expo-camera, expo-font, expo-linking, expo-web-browser, dependencies (+17 more)

### Community 50 - "index.ts"
Cohesion: 0.13
Nodes (17): AccountingScreen(), AcAccountTiles, AcAccountingEmptyState(), AcAccountingEmptyStateProps, AcBalanceCard, AcOperationsList(), newOperationHref(), NewOperationPreset (+9 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.15
Nodes (12): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, clientRef() (+4 more)

### Community 52 - "types.ts"
Cohesion: 0.15
Nodes (10): CreateInventoryItemScreen(), parseNumber(), ScanLauncherButton(), ScanLauncherButtonProps, ScanLauncherRow(), useMobileCreateInventoryItem(), PendingScanContext, scanContextStore (+2 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.13
Nodes (23): PushRegistrationHead(), MobileApiError, registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken() (+15 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.17
Nodes (12): AppProviders(), AuthProvider(), RootNavigator(), RootStack, RootStatusBar(), queryClient, preloadSessionSnapshots(), SessionSnapshot (+4 more)

### Community 55 - "toneBackground"
Cohesion: 0.05
Nodes (65): usePressAnimation(), AuthBackdrop(), AuthShellProps, InviteFormNotice(), InviteFormNoticeProps, FloatingButton(), FloatingButtonProps, PageHeader() (+57 more)

### Community 56 - "design-language-context.ts"
Cohesion: 0.10
Nodes (26): animationSpeed, buttonHeight, A11ySlice, defaultEasing, glassStyle, iconWeight, layering, modalTransition (+18 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.12
Nodes (26): classifyScanPayload(), ENTITY_PREFIXES, hasValidEanChecksum(), parseEntityLink(), ScanPayloadClass, interpretRelocateScan(), RelocateScanTarget, charValue() (+18 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.24
Nodes (11): HomeRoute(), MissionControlScreen(), MissionControlSnapshot, getStartupMarks(), logStartupTable(), MarkEntry, marks, markStartup() (+3 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.23
Nodes (16): downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile(), ensureWarrantyPdfFile(), getAuthHeaders(), printWarrantyDocument(), shareWarrantyDocument(), mapDocumentError() (+8 more)

### Community 60 - "use-profile-snapshot.ts"
Cohesion: 0.09
Nodes (22): ListRow, StackScreen(), DeleteAccountDialog(), ProfileHeader(), PROFILE_ROUTES, profileHubRouteHref(), ProfileHubRow, ProfileScreen() (+14 more)

### Community 61 - "ScanService"
Cohesion: 0.14
Nodes (19): ScanEntityLinkKind, disambiguateScanPayload(), pickScanCandidate(), resolveScanPayload(), resolveScanPhoto(), ScanServiceDeps, acceptsCameraInput(), activeResultForOutcome() (+11 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.21
Nodes (7): resolveInviteHref(), guardedPush(), PushRouter, navigationHrefKey(), stackNavigationGuard, buildImportDeepLink(), resolveNotificationDeepLink()

### Community 63 - "include"
Cohesion: 0.09
Nodes (21): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/domain-search/src, ../packages/org/src, ../packages/rbac/src (+13 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.18
Nodes (16): MODULE_KEYS, SetupWizardScreen(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES, defaultCompanyAppConfig() (+8 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.17
Nodes (15): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), fetchJsonWithTimeout(), AppleSignInApiPayload, AppleSignInApiResponse (+7 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.12
Nodes (22): AuthDivider(), AuthEmailChip(), isValidEmail(), LoginScreen(), InviteAcceptScreen(), InviteAcceptScreenProps, clearPendingInvite(), readInviteCompanyName() (+14 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.16
Nodes (17): NotificationBellButton(), NotificationBellButtonProps, ActivityFeedFilters(), CATEGORY_HINTS, EXTENDED_CATEGORY_HINTS, NotificationsSettingsScreen(), useNotificationInbox(), useNotificationService() (+9 more)

### Community 68 - "document-import-screen.tsx"
Cohesion: 0.14
Nodes (16): CheckCircle2Icon, DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus (+8 more)

### Community 69 - "search-results.tsx"
Cohesion: 0.18
Nodes (14): buildInviteJoinUrl(), getPublicApiBaseUrl(), AuthEmailApiError, PasswordResetDelivery, postAuthEmailApi(), sendPasswordResetViaApi(), sendVerificationEmailViaApi(), verifyEmailCodeViaApi() (+6 more)

### Community 70 - "rbac.ts"
Cohesion: 0.10
Nodes (31): AuthActions, AuthActionsContext, ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace(), useAuthActions() (+23 more)

### Community 71 - "mapAuthError"
Cohesion: 0.09
Nodes (30): useAuth(), AuthShell(), AuthenticatedLandingScreen(), ForgotPasswordScreen(), isValidEmail(), SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, Button (+22 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.16
Nodes (21): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, InputField (+13 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "mobilePost"
Cohesion: 0.16
Nodes (12): AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, assertValidPayload(), createFinancialOperation(), CreatePayload, createTypedFinancialOperation(), CreateFinancialOperationInput (+4 more)

### Community 75 - "useSearchEnter"
Cohesion: 0.14
Nodes (15): compositionGrandTotal(), isSellOnlyComposition(), mapCompositionToWorkOrderLines(), mapOrderToCompositionDrafts(), INITIAL_LABOR_DRAFT, initialState, LaborDraft, LaborLineDraft (+7 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.08
Nodes (38): SearchFilters(), SearchFiltersProps, AnimatedSection(), CATEGORY_ICONS, SearchIdleProps, catalog, CatalogEntry, groupOrder (+30 more)

### Community 77 - "styles.ts"
Cohesion: 0.20
Nodes (14): getNavItemHref(), getNavVisual(), NAV_TO_EXPO_TAB, resolveTabBarEntries(), TabBarEntry, NavItemId, EXPO_TAB_HREFS, isNavItemModuleEnabled() (+6 more)

### Community 78 - "appearance-settings-screen.tsx"
Cohesion: 0.22
Nodes (9): AppearanceSettingsScreen(), THEME_OPTIONS, ACCENT_COLORS, AppearanceSettingsState, DEFAULT_APPEARANCE, useAppearanceSettingsStore, AccentColorId, AppearanceSettings (+1 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.16
Nodes (10): DeviceClass, BreakpointKey, breakpoints, platform, screen, sidebarWidth, { width, height }, layoutRhythm (+2 more)

### Community 80 - "profile.ts"
Cohesion: 0.17
Nodes (21): resolveWorkspaceAccessBlock(), ensureFirestoreAuthReady(), buildFallbackProfile(), CompanyDocShape, ensureUserDocument(), hydrateEffectiveProfile(), loadFastSessionBootstrap(), loadFastUserProfile() (+13 more)

### Community 81 - "document-import.ts"
Cohesion: 0.10
Nodes (32): DocumentImportScreen(), CreateInventoryItemInput, appendLocalFile(), createLocalFileFormData(), AvatarUploadResult, uploadUserAvatar(), DocumentImportJobStatus, DocumentImportUploadResult (+24 more)

### Community 82 - "useFloatingTabBarInset"
Cohesion: 0.13
Nodes (16): ScreenActionFooter(), ScreenActionFooterProps, OptionButton(), ScanNotFoundSheet, ScanNotFoundSheetProps, OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent() (+8 more)

### Community 83 - "use-mission-control-data.ts"
Cohesion: 0.25
Nodes (12): buildWeekRevenueBars(), computeMonthRevenueGrowth(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), resolveMissionControlRevenue() (+4 more)

### Community 84 - "mock-search-catalog.ts"
Cohesion: 0.14
Nodes (13): DeliveryChannels, isServerCategoryEnabled(), PRIORITY_BASE, resolveDeliveryChannels(), resolveLiveEditingChannels(), resolveSyncChannels(), CategoryChannelPrefs, DEFAULT_EXTENDED_CATEGORY_PREFS (+5 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.15
Nodes (16): orderShowsOilIntervalTag(), textMatches(), resolveApplicableDocumentSlugs(), resolveDocumentsForOrderCompleted(), resolveDocumentsForOrderCreated(), calculateWorkOrderPricing(), CreateWorkOrderInput, UpdateWorkOrderInput (+8 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.19
Nodes (15): AddToOrderHandlers, MotorActionHandlers, motorActionMessage(), motorActionTitle(), openSearchResult(), SearchRouter, showMotorActions(), showPartActions() (+7 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.33
Nodes (11): CoinsIcon, FileTextIcon, PackageIcon, ReceiptIcon, StoreIcon, TrendingUpIcon, UsersIcon, demoAccountingSnapshot (+3 more)

### Community 89 - "google-sign-in-button.tsx"
Cohesion: 0.34
Nodes (10): ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), canUseNativeGoogleSignIn(), configureNativeGoogleSignIn() (+2 more)

### Community 90 - "index.ts"
Cohesion: 0.12
Nodes (19): LocationContentsResponse, CompanyEmployeeRow, useCompanyEmployees(), touchLastActive(), usePresenceHeartbeat(), buildLocationEntityLink(), firebaseConfig, getFirebaseApp() (+11 more)

### Community 91 - "auth-oauth-button.tsx"
Cohesion: 0.19
Nodes (10): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButton() (+2 more)

### Community 92 - "form"
Cohesion: 0.26
Nodes (10): ordersSpring, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), OrdersFilters(), OrdersFiltersProps, OrdersPrimaryAction(), OrdersPrimaryActionProps (+2 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "search-result-row.tsx"
Cohesion: 0.40
Nodes (5): HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart

### Community 95 - "mobile-client.ts"
Cohesion: 0.16
Nodes (11): AutocompleteDataSnapshot, AutocompleteDataStore, EMPTY, getAutocompleteDataSnapshot(), ClientEntity, CreateClientInput, UpdateClientInput, CreateVehicleInput (+3 more)

### Community 96 - "location-screen.tsx"
Cohesion: 0.18
Nodes (9): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, kindLabel(), LocationScreen() (+1 more)

### Community 97 - "team-employee-card.tsx"
Cohesion: 0.12
Nodes (19): AuthProviderKind, badgeSize, monogramFontSize, UserAvatar(), UserAvatarProps, UserAvatarSize, ProfileHeroCard(), ProfileHeroCardProps (+11 more)

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "notification-provider.tsx"
Cohesion: 0.22
Nodes (19): useNotificationInboxRealtime(), fetchNotificationInbox(), markAllNotificationsRead(), markNotificationState(), fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord() (+11 more)

### Community 100 - "scan-glass-panel.tsx"
Cohesion: 0.06
Nodes (37): AlertTriangleIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, BarChart3Icon, BoxIcon, ChevronsUpDownIcon, ChevronUpIcon (+29 more)

### Community 101 - "resolve-active-company-name.ts"
Cohesion: 0.41
Nodes (13): filterAutocompleteOptions(), uniqueAutocompleteOptions(), readRecentValues(), searchAutocomplete(), searchCategories(), searchCustomers(), searchEngineCodes(), searchManufacturers() (+5 more)

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+3 more)

### Community 103 - "index.ts"
Cohesion: 0.18
Nodes (10): PrinterIcon, Share2Icon, AcMotorSaleDocumentsSheet, AcMotorSaleDocumentsSheetProps, AcMotorSaleDocumentsSheetRef, DocAction, isMotorSaleOperation(), motorSaleDetail() (+2 more)

### Community 104 - "invite-accept-screen.tsx"
Cohesion: 0.16
Nodes (11): HorizontalFilterBar(), AcTabBar(), AcTabBarProps, AcTabPanel(), AcTabPanelProps, ACCOUNTING_TABS, AccountingTab, INVITE_FILTER_OPTIONS (+3 more)

### Community 105 - "use-add-to-order-flow.ts"
Cohesion: 0.31
Nodes (12): PendingAdd, useAddToOrderFlow(), CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart(), navigateOrderEdit() (+4 more)

### Community 106 - "search-engine-card.tsx"
Cohesion: 0.21
Nodes (11): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, SLUG_TO_TYPE, useWorkOrderDocumentsRealtime(), printWorkOrderDocument(), shareWorkOrderDocument(), workOrderDocumentRepository (+3 more)

### Community 107 - "should-hide-tab-bar.ts"
Cohesion: 0.33
Nodes (9): getDeepestActiveRoute(), isModalOverlayPath(), isModalOverlayRoute(), isNestedTabStackActive(), shouldHideTabBar(), shouldHideTabBarFromNavState(), TAB_BAR_VISIBLE_NESTED_ROUTES, TAB_ROOTS (+1 more)

### Community 108 - "scan-move-sheet.tsx"
Cohesion: 0.22
Nodes (9): CarIcon, FileStackIcon, ShoppingCartIcon, SearchIconProps, DEFAULT_MODULE_ENABLED, MODULE_ORDER, ModuleDefinition, ModulesConfigState (+1 more)

### Community 109 - "Autocore Mobile"
Cohesion: 0.22
Nodes (8): Autocore Mobile, Design system first, Getting started, Next steps, Project structure, Stack, Theme tokens, UI library

### Community 110 - "create-icon.tsx"
Cohesion: 0.32
Nodes (5): AnimatedIconWrapper, createIcon(), IconState, IconSize, iconSizes

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "sidebar.tsx"
Cohesion: 0.24
Nodes (9): AutocompleteInputProps, useAutocomplete(), UseAutocompleteArgs, UseAutocompleteReturn, BASE, getNativeInputProps(), NativeProps, AutocompleteSourceId (+1 more)

### Community 113 - "useAccessibility"
Cohesion: 0.43
Nodes (6): useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled(), DesignLanguageContext

### Community 114 - "recent-scans.ts"
Cohesion: 0.23
Nodes (8): OrderStatusBadge(), OrderStatusBadgeProps, toneToColor(), orderStatusLabel, OrderStatusTone, OrdersState, useOrdersStore, OrderStatus

### Community 115 - "metro.config.js"
Cohesion: 0.40
Nodes (4): config, { getDefaultConfig }, path, { withNativeWind }

### Community 116 - "invite-code.ts"
Cohesion: 0.83
Nodes (3): generateInviteCode(), generateInviteToken(), pickFromAlphabet()

### Community 117 - "with-ios-universal-links.js"
Cohesion: 0.67
Nodes (3): isUniversalLinksEnabled(), { withEntitlementsPlist }, withIosUniversalLinks()

### Community 132 - "@autocore/avatars"
Cohesion: 0.24
Nodes (9): OrdersHeader(), OrdersHeaderProps, formatOrdersHeaderSubtitle(), OrderActivity, OrderActivityTone, OrderPriority, OrdersListMeta, OrderTimelineEvent (+1 more)

### Community 196 - "use-work-order-composer-options.ts"
Cohesion: 0.29
Nodes (10): ComposerVehicleForm, useWorkOrderComposerOptions(), vehiclesInContext(), brandByKey, brands, CatalogBrand, listVehicleMakes(), listVehicleModels() (+2 more)

### Community 197 - "advances.ts"
Cohesion: 0.40
Nodes (9): ADVANCE_KEYWORDS, AdvanceSnapshot, appendAdvanceMarker(), buildAdvanceSnapshot(), filterAdvanceOperations(), isAdvanceOperation(), isAdvancePaid(), isAdvanceReceived() (+1 more)

### Community 198 - "work-order-repository.ts"
Cohesion: 0.27
Nodes (8): allocateWorkOrderNumber(), createWorkOrderRepository(), mapWorkOrder(), normalizePricing(), workOrderCounterRef(), workOrderRef(), WorkOrderRepository, workOrdersRef()

### Community 199 - "mc-animated-sparkline.tsx"
Cohesion: 0.42
Nodes (7): AnimatedPolyline, buildPoints(), estimatePathLength(), McAnimatedSparkline(), McAnimatedSparklineProps, buildSparklinePoints(), sanitizeChartSeries()

### Community 200 - "mock-orders.ts"
Cohesion: 0.31
Nodes (7): computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters, isOpenOrderStatus(), OrderFilterOption

### Community 201 - "NotificationService"
Cohesion: 0.33
Nodes (7): NotificationsScreen(), useNotificationPreferences(), notifyApiError(), notifyNetworkStatus(), NotificationProvider(), NotificationProviderProps, NotificationService

### Community 202 - "setJson"
Cohesion: 0.42
Nodes (8): fieldKey(), readFieldValues(), rememberFieldValue(), rememberRecentValue(), storageKey(), setJson(), AutocompleteProvider(), saveExtendedPrefs()

### Community 203 - "permissions.ts"
Cohesion: 0.42
Nodes (8): can(), canEditInventory(), canEditWorkOrders(), canManageEmployees(), canManageSettings(), canViewEmployees(), canViewInventory(), canViewWorkOrders()

### Community 204 - "organization-membership-row.tsx"
Cohesion: 0.29
Nodes (6): CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, sizeMap, OrganizationMembershipRowProps, styles

### Community 205 - "payroll-transaction.ts"
Cohesion: 0.29
Nodes (6): PAYROLL_STATUS_LABELS, PAYROLL_RATE_TYPES, PAYROLL_TRANSACTION_STATUSES, PayrollRateType, PayrollTransaction, PayrollTransactionStatus

### Community 206 - "motor-repository.ts"
Cohesion: 0.36
Nodes (5): createMotorRepository(), mapMotor(), motorDocRef(), readLocalId(), readNumber()

### Community 207 - "order-card.tsx"
Cohesion: 0.38
Nodes (4): OrderCard, OrderCardProps, formatOrderVehicleLine(), formatWorkOrderLabel()

### Community 208 - "barcode-mapping-repository.ts"
Cohesion: 0.33
Nodes (3): BarcodeMapping, barcodeMappingRepository, createBarcodeMappingRepository()

### Community 209 - "motor.ts"
Cohesion: 0.33
Nodes (5): MOTOR_STATUSES, MotorAvailability, MotorEntity, MotorFilters, MotorStatus

## Knowledge Gaps
- **860 isolated node(s):** `ScreenEnterConfig`, `withGoogleModularHeaders`, `withGoogleIosUrlScheme`, `withOptionalAppleSignIn`, `withDisableSwiftUICoreAutolink` (+855 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `search-registry.ts`, `create-operation-screen.tsx`, `orders-screen.tsx`, `text.tsx`, `team-screen.tsx`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `index.ts`, `useSession`, `app-tab-bar.tsx`, `index.ts`, `Text`, `radius`, `scan-screen.tsx`, `useReducedMotion`, `useAuth`, `currency-screen.tsx`, `mc-featured-insight.tsx`, `haptics`, `use-scan-experience.ts`, `scan-product-sheet.tsx`, `rhythm`, `order-composition-step.tsx`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `use-theme.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `types.ts`, `organization-switch-button.tsx`, `toneBackground`, `use-profile-snapshot.ts`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `notification-bell-button.tsx`, `document-import-screen.tsx`, `rbac.ts`, `mapAuthError`, `input-field.tsx`, `organization-membership-row.tsx`, `search-idle.tsx`, `appearance-settings-screen.tsx`, `order-card.tsx`, `document-import.ts`, `useFloatingTabBarInset`, `version-settings-screen.tsx`, `auth-oauth-button.tsx`, `form`, `search-result-row.tsx`, `location-screen.tsx`, `team-employee-card.tsx`, `scan-glass-panel.tsx`, `index.ts`, `invite-accept-screen.tsx`, `useAccessibility`, `recent-scans.ts`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `Text` connect `index.ts` to `search-registry.ts`, `create-operation-screen.tsx`, `orders-screen.tsx`, `text.tsx`, `team-screen.tsx`, `accounting-screen.tsx`, `index.ts`, `useSession`, `app-tab-bar.tsx`, `index.ts`, `order-detail-screen.tsx`, `useTheme`, `Text`, `radius`, `types.ts`, `scan-screen.tsx`, `useAuth`, `currency-screen.tsx`, `mc-featured-insight.tsx`, `haptics`, `use-scan-experience.ts`, `scan-product-sheet.tsx`, `rhythm`, `order-composition-step.tsx`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `my-earnings-screen.tsx`, `empty-state.tsx`, `index.ts`, `types.ts`, `toneBackground`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `notification-bell-button.tsx`, `document-import-screen.tsx`, `rbac.ts`, `mapAuthError`, `input-field.tsx`, `mobilePost`, `organization-membership-row.tsx`, `search-idle.tsx`, `appearance-settings-screen.tsx`, `order-card.tsx`, `useFloatingTabBarInset`, `version-settings-screen.tsx`, `auth-oauth-button.tsx`, `form`, `search-result-row.tsx`, `location-screen.tsx`, `team-employee-card.tsx`, `scan-glass-panel.tsx`, `index.ts`, `search-engine-card.tsx`, `recent-scans.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `useSession()` connect `useAuth` to `create-operation-screen.tsx`, `team-screen.tsx`, `index.ts`, `index.ts`, `useSession`, `app-tab-bar.tsx`, `order-detail-screen.tsx`, `Text`, `radius`, `types.ts`, `notifications-settings-screen.tsx`, `scan-screen.tsx`, `currency-screen.tsx`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `use-scan-experience.ts`, `getFirebaseDb`, `my-earnings-screen.tsx`, `index.ts`, `types.ts`, `setup-wizard-screen.tsx`, `mapAuthError`, `NotificationService`, `permissions.ts`, `search-idle.tsx`, `useFloatingTabBarInset`, `location-screen.tsx`, `team-employee-card.tsx`, `scan-glass-panel.tsx`, `use-add-to-order-flow.ts`, `search-engine-card.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `ScreenEnterConfig`, `withGoogleModularHeaders`, `withGoogleIosUrlScheme` to the rest of the system?**
  _860 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._