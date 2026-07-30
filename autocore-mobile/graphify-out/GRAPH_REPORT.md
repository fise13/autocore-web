# Graph Report - autocore-mobile  (2026-07-30)

## Corpus Check
- 761 files · ~219,670 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3582 nodes · 11539 edges · 205 communities (144 shown, 61 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9b025293`
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
- NotificationService
- organization-membership-row.tsx
- motor-repository.ts
- order-card.tsx
- react-native-safe-area-context

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 345 edges
2. `Text` - 192 edges
3. `rhythm` - 124 edges
4. `haptics` - 109 edges
5. `useSession()` - 83 edges
6. `getFirebaseDb()` - 81 edges
7. `toneBackground()` - 76 edges
8. `useReducedMotion()` - 67 edges
9. `normalizeCompanyId()` - 67 edges
10. `isProductionCompanyId()` - 52 edges

## Surprising Connections (you probably didn't know these)
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  animations/presets.ts → hooks/use-accessibility.ts
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  authentication/auth-provider.tsx → services/auth/apple-sign-in.ts
- `DrawablePath()` --calls--> `useTheme()`  [EXTRACTED]
  components/brand/app-loading-logo.tsx → hooks/use-theme.tsx
- `AppLoadingLogoStatic()` --calls--> `useTheme()`  [EXTRACTED]
  components/brand/app-loading-logo.tsx → hooks/use-theme.tsx
- `RootStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  components/navigation/root-navigator.tsx → hooks/use-theme.tsx

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`
- 4-file cycle: `components/ui/card.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/card.tsx`
- 4-file cycle: `components/ui/empty-state.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/empty-state.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/input/input-field.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/action-icon-button.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/action-icon-button.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/text.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/divider.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/divider.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/radio.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/floating-button.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/floating-button.tsx`
- 4-file cycle: `components/ui/form-panel.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/form-panel.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/usage-meter.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/index.ts -> components/ui/input/search-input.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/index.ts -> components/ui/section-header.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/copy-button.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/copy-button.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/list-row.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/context-menu.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/context-menu.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/loading.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/date-picker.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/date-picker.tsx`
- 4-file cycle: `components/ui/alert.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/alert.tsx`
- 4-file cycle: `components/ui/app-loading-screen.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/app-loading-screen.tsx`

## Communities (205 total, 61 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.07
Nodes (57): AutocompleteOverlay, AutocompleteOverlayProps, styles, AutocompletePanel(), AutocompleteRow, AutocompleteRowProps, styles, AutocompleteInputProps (+49 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.05
Nodes (60): AutocompleteInput, KeyboardFormShell(), KeyboardFormShellProps, AccountingScreen(), AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, CreateOperationScreen() (+52 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.09
Nodes (24): OrderOpenOverlay(), OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), OverlayProps, SourceLayout, useOrderTransition(), { width: SCREEN_W, height: SCREEN_H } (+16 more)

### Community 3 - "text.tsx"
Cohesion: 0.04
Nodes (92): useCardLift(), AlertTriangleIcon, TabScreenPlaceholderProps, Alert(), AlertProps, AlertVariant, Badge(), BadgeProps (+84 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.06
Nodes (53): MailIcon, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS, TeamEmployeeCard, TeamEmployeeCardProps, styles (+45 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (40): ScreenEnterConfig, useFadeIn(), usePageEnter(), useScaleEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps, enterValues (+32 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.07
Nodes (46): ArrowRightIcon, CreateOrderScreen(), StepIndicator(), STEPS, useOrderCompositionForm(), UseOrderCompositionFormOptions, resolveInventoryUnitPrice(), compositionGrandTotal() (+38 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.13
Nodes (38): CashFlowPeriod, resolveWeekChartBars(), calculateCashBalance(), incomingTypes, outgoingTypes, CATEGORY_ICONS, computeAccountingSnapshot(), ComputeAccountingSnapshotInput (+30 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.21
Nodes (10): SectionHeader(), AcPayrollList(), AcPayrollListProps, PayrollRow(), PayrollStatusBadge(), statusColors(), AcDivider(), nextPayrollStatus() (+2 more)

### Community 9 - "index.ts"
Cohesion: 0.06
Nodes (30): FlashList, OptimizedListProps, useListStaggerDelay(), ListGroup(), ListGroupProps, defaultLogo, PageHeader(), PageHeaderProps (+22 more)

### Community 10 - "index.ts"
Cohesion: 0.18
Nodes (22): useAccountingData(), UseAccountingDataResult, OrderDocumentsSection(), useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useMotorsRealtime(), useOperationsRealtime() (+14 more)

### Community 11 - "index.ts"
Cohesion: 0.06
Nodes (51): DesignSystemScreen(), NotFoundScreen(), ImagesIcon, MapPinIcon, StoreIcon, ActivityCard, ActivityCardProps, AnalyticsCard (+43 more)

### Community 12 - "useSession"
Cohesion: 0.12
Nodes (36): useAddToOrderFlow(), parseFilter(), SearchScreen(), WarehouseFilter, WarehouseItemRow, WarehouseScreen(), useInventoryCatalog(), useInventorySearch() (+28 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.11
Nodes (16): GripVerticalIcon, NavEditorRowProps, NavigationEditorList(), NavigationEditorListProps, NavigationPreview(), NavigationPreviewProps, DEFAULT_NAV_ENABLED, DEFAULT_NAV_ORDER (+8 more)

### Community 14 - "index.ts"
Cohesion: 0.15
Nodes (10): CheckIcon, ChevronDownIcon, Anchor, Dropdown(), DropdownOption, DropdownProps, styles, LANGUAGES (+2 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.43
Nodes (6): estimateProgress(), formatTimeLabel(), mapDomainStatusToMobile(), mapWorkOrderToMobileCard(), isOpenStatus(), STATUS_LABELS

### Community 16 - "useTheme"
Cohesion: 0.04
Nodes (48): ChevronRightIcon, AuthDivider(), AuthEmailChip(), AuthEmailChipProps, InviteFormNotice(), InviteFormNoticeProps, TabScreenPlaceholder(), FormPanel() (+40 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.29
Nodes (11): OAuthProvider, accountUsesPassword(), deleteAccountForCurrentUser(), DeleteAccountInput, isCancelled(), reauthenticateForDeletion(), deleteCurrentAuthUser(), getAuthProviderIds() (+3 more)

### Community 18 - "Text"
Cohesion: 0.14
Nodes (11): ProfileMetaCard(), ProfileMetaCardProps, ProfileScreenShell(), ProfileScreenShellProps, profileLayout, NotificationsScreen(), ToggleRowProps, AdvancedScreen() (+3 more)

### Community 19 - "radius"
Cohesion: 0.04
Nodes (100): TrendingDownIcon, resolveTabRouteName(), resolveCurrentTab(), resolveTabFromHref(), TabNavigateTarget, useNavigateTab(), acTimeline, AcAccountTilesProps (+92 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.11
Nodes (21): SLUG_TO_TYPE, notifyFirestoreSnapshotError(), reviveDatesDeep(), shouldReviveDateField(), toDateFromFirestore(), mapClient(), documentGenerationJobRepository, mapJob() (+13 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.19
Nodes (17): applyNow(), drainOne(), flushScheduledQueryDataApplies(), getMsSinceLastCatalogApply(), getPendingQueryDataApplyCount(), hasSeenCatalogApply(), isLargeCatalog(), keyOf() (+9 more)

### Community 22 - "getJson"
Cohesion: 0.14
Nodes (18): AppProviders(), RootNavigator(), RootStack, RootStatusBar(), queryClient, appStorage, clearNamespace(), getAllKeys() (+10 more)

### Community 23 - "types.ts"
Cohesion: 0.15
Nodes (14): NotificationCard, ActivityDateGroup(), ActivityDateGroupProps, ActivityNotificationRow, ActivityNotificationRowProps, DateGroup, DateGroupKey, formatNotificationTime() (+6 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.13
Nodes (23): useNotificationPreferences(), stripUndefinedDeep(), mergeNotificationPreferences(), setJson(), updateNotificationPreferences(), buildPreferencesPayload(), preferencesRef(), saveNotificationPreferences() (+15 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.07
Nodes (33): OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, scanSheetAnimationConfigs, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanConfirmFlash(), ScanConfirmFlashProps (+25 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.10
Nodes (17): ClockIcon, HorizontalFilterBarProps, HorizontalFilterOption, TabLayout, profileSpring, profileTimeline, scanSpring, scanTimeline (+9 more)

### Community 27 - "useAuth"
Cohesion: 0.13
Nodes (20): SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, TeamProGate(), TeamProGateProps, BADGE_VARIANT, PRO_FEATURES, STATUS_PRESENTATION, StatusPresentation (+12 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.13
Nodes (29): CurrencyScreen(), styles, useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), useUserDisplayCurrency(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS (+21 more)

### Community 29 - "subscription-registry.ts"
Cohesion: 0.11
Nodes (30): CachedSubscription, deserializeSubscription(), readSubscriptionCache(), readSubscriptionCacheSync(), SerializedSubscription, serializeSubscription(), writeSubscriptionCache(), acquireCompanySubscription() (+22 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.12
Nodes (26): RealtimeError, UseRealtimeQueryOptions, UseRealtimeQueryResult, useSessionBootstrapReady(), clearScheduledQueryDataApplies(), clearRealtimeSnapshots(), acquireRealtimeSubscription(), applyCachedSnapshot() (+18 more)

### Community 31 - "types.ts"
Cohesion: 0.18
Nodes (11): IconName, ACCOUNTING_DEMO, DESKTOP_DEMO, PERMISSION_GROUPS, WORKSPACE_DEMO, DemoPermission, PermissionGroupId, ProductModuleConfig (+3 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.12
Nodes (29): AuthGate(), MemoAppTree, useAuthHasAccess(), useAuthReady(), AuthRedirectEffect(), WorkspaceAccessScreen(), AuthJourneyStep, canRunSetupWizard() (+21 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.15
Nodes (14): MemoTabBar, TAB_SCREEN_OPTIONS, AppTabBar, AppTabBarItem, AppTabBarProps, TAB_ICON_STROKE, TabRoute, TabVisual (+6 more)

### Community 34 - "haptics"
Cohesion: 0.18
Nodes (10): buildWeekBars(), formatMoney(), MyEarningsScreen(), MyEarningsScreenProps, WEEKDAY_SHORT_RU, weekDayShortLabel(), useEmployeesRealtime(), mapEmployee() (+2 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.16
Nodes (22): sheetPresentationKey(), useDevMockFallback(), useScanExperience(), classifyScanPayload(), hasValidEanChecksum(), parseEntityLink(), interpretRelocateScan(), RelocateScanTarget (+14 more)

### Community 36 - "index.ts"
Cohesion: 0.08
Nodes (38): resolveInviteHref(), buildImportDeepLink(), buildOrderDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType (+30 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.09
Nodes (27): ScanCandidatesSheet, ScanCandidatesSheetProps, ActionButton(), ScanProductSheet, ScanProductSheetProps, StatCell(), StatDivider(), ScanProductThumb() (+19 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.09
Nodes (43): AuthenticatedLandingScreen(), useActiveCompanyName(), CompanyEmployeeRow, useCompanyEmployees(), useCompanyProfile(), touchLastActive(), usePresenceHeartbeat(), CompanyNameSource (+35 more)

### Community 39 - "rhythm"
Cohesion: 0.21
Nodes (19): getApiBaseUrl(), getBearerToken(), humanizeApiErrorBody(), mobileFetch(), mobileFetchBlob(), mobileGet(), mobilePatch(), mobilePostFlexible() (+11 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.11
Nodes (24): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabPanel(), ComposerTabPanelProps, resolveEntering(), resolveExiting(), CompositionAddCard() (+16 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.12
Nodes (22): ScanDocumentSheet, ScanDocumentSheetProps, classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem (+14 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.09
Nodes (21): ListRow, ListRowProps, styles, Screen(), ScreenProps, ScreenScroll(), ScreenScrollProps, StackScreen() (+13 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.09
Nodes (30): getOAuthButtonTheme(), OAuthButtonTheme, resolveScheme(), ThemeContext, ThemeContextValue, ThemeProvider(), ThemeProviderProps, withAlpha() (+22 more)

### Community 44 - "index.ts"
Cohesion: 0.16
Nodes (12): NOTIFICATION_ROW_DIVIDER_INSET, mcDuration, mcMotion, mcSpring, McPressableProps, McEnterConfig, NotificationInboxSkeleton(), NotificationRowSkeleton() (+4 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.15
Nodes (20): Can(), CanProps, RequirePermission(), RequirePermissionProps, resolveMissionControlRevenue(), formatActivityTime(), buildWeekBars(), closedRevenueForDay() (+12 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.33
Nodes (7): toast(), ToastAction, ToastItem, ToastStore, useToastStore, ToastProvider(), ToastVariant

### Community 47 - "inventory.ts"
Cohesion: 0.36
Nodes (7): coerceInventoryString(), createInventoryItemRepository(), inventoryItemRepository, mapItem(), normalizeInventoryItem(), InventoryItemStatus, InventoryItemType

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.08
Nodes (25): @autocore/domain-search, clsx, expo-apple-authentication, expo-blur, expo-haptics, expo-image, dependencies, @autocore/domain-search (+17 more)

### Community 50 - "index.ts"
Cohesion: 0.17
Nodes (6): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, TabRouteName, profileHubRouteHref(), ProfileScreen()

### Community 51 - "client-repository.ts"
Cohesion: 0.13
Nodes (16): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, useWorkOrderById() (+8 more)

### Community 52 - "types.ts"
Cohesion: 0.22
Nodes (8): ArrowLeftIcon, FlashlightIcon, IconButton, CreateInventoryItemScreen(), parseNumber(), ScanHeader(), ScanHeaderProps, useMobileCreateInventoryItem()

### Community 53 - "push-channel.ts"
Cohesion: 0.12
Nodes (23): PushRegistrationHead(), MobileApiError, registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken() (+15 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.16
Nodes (19): preloadSessionSnapshots(), sessionBootstrapQueryKeys(), CachedRealtimeSnapshot, flushOneWrite(), isFresh(), lastDataJsonByKey, memoryCache, PendingWrite (+11 more)

### Community 55 - "toneBackground"
Cohesion: 0.14
Nodes (21): searchSpring, searchTimeline, useSearchEnter(), SearchBar(), SearchBarProps, actions, SearchEmptyActionId, SearchEmptyState() (+13 more)

### Community 56 - "design-language-context.ts"
Cohesion: 0.09
Nodes (29): animationSpeed, buttonHeight, A11ySlice, DesignLanguageContext, designLanguageFromScheme(), defaultEasing, glassStyle, iconWeight (+21 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.19
Nodes (14): BARCODE_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, styles, itemMatchesPayload(), resolveBarcodeFromLocalCatalog(), toMobileScanItem() (+6 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.32
Nodes (9): HomeRoute(), getStartupMarks(), logStartupTable(), MarkEntry, marks, markStartup(), StartupMark, hideNativeSplashAndLogStartup() (+1 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.14
Nodes (23): DocumentAction, OrderDocumentsSectionProps, downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile(), ensureWarrantyPdfFile(), getAuthHeaders(), printWarrantyDocument() (+15 more)

### Community 60 - "use-profile-snapshot.ts"
Cohesion: 0.18
Nodes (11): PROFILE_ROUTES, ProfileDangerAction, ProfileHubData, ProfileHubRouteId, ProfilePreferenceRow, ProfileQuickAction, ProfileRouteId, ProfileUser (+3 more)

### Community 61 - "ScanService"
Cohesion: 0.11
Nodes (30): mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), disambiguateScanPayload(), pickScanCandidate() (+22 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.21
Nodes (14): OrgDangerZone(), OrgDangerZoneProps, activateCompanyPro(), BillingInterval, startCompanyTrial(), mobilePost(), backfillTeamNotifications(), declineInvite() (+6 more)

### Community 63 - "include"
Cohesion: 0.08
Nodes (23): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/design-tokens/src, ../packages/domain-search/src, ../packages/org/src (+15 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.16
Nodes (18): MODULE_KEYS, SetupWizardScreen(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES, defaultCompanyAppConfig() (+10 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.16
Nodes (16): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), fetchJsonWithTimeout(), AppleSignInApiPayload, AppleSignInApiResponse (+8 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.19
Nodes (15): isValidEmail(), LoginScreen(), readInviteCompanyName(), readInviteEmail(), readInviteToken(), storePendingInvite(), fetchInvitePreview(), getPasswordStrengthState() (+7 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.11
Nodes (25): XIcon, InAppBannerProvider(), layoutTransition, styles, NotificationBellButton(), NotificationBellButtonProps, ActivityFeedFilters(), ActivityFeedFiltersProps (+17 more)

### Community 68 - "document-import-screen.tsx"
Cohesion: 0.13
Nodes (15): CheckCircle2Icon, DocumentFrameOverlay(), styles, ImportParseStatus, ImportSuccessView(), ImportSuccessViewProps, ImportUploadingView(), ImportUploadingViewProps (+7 more)

### Community 69 - "search-results.tsx"
Cohesion: 0.15
Nodes (10): AuthBootLoadingProps, AuthLoadingScreen(), AnimatedPath, AppLoadingLogo(), AppLoadingLogoProps, AppLoadingLogoStatic(), DrawablePath(), easeInOut (+2 more)

### Community 70 - "rbac.ts"
Cohesion: 0.23
Nodes (10): Listener, listeners, resetAppShellReady(), setAppShellReady(), clearSubscriptionCaches(), clearSubscriptionRegistry(), clearRecentQueriesCache(), clearSessionSnapshot() (+2 more)

### Community 71 - "mapAuthError"
Cohesion: 0.20
Nodes (12): ForgotPasswordScreen(), isValidEmail(), Input, JoinCompanyScreen(), parseInviteInput(), useDeleteAccount(), acceptInviteByCode(), joinCompanyWithInviteCode() (+4 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.16
Nodes (21): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, InputField (+13 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "mobilePost"
Cohesion: 0.36
Nodes (10): hasShelfValue(), isEngine(), SearchEngineCard(), SearchEngineCardProps, formatVin(), inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode() (+2 more)

### Community 75 - "useSearchEnter"
Cohesion: 0.30
Nodes (6): CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), getStartupSummary(), estimateCacheSizeBytes(), formatCacheSize()

### Community 76 - "search-idle.tsx"
Cohesion: 0.10
Nodes (22): SearchFilters(), SearchFiltersProps, catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery() (+14 more)

### Community 77 - "styles.ts"
Cohesion: 0.20
Nodes (14): getNavItemHref(), getNavVisual(), NAV_TO_EXPO_TAB, resolveTabBarEntries(), TabBarEntry, NavItemId, EXPO_TAB_HREFS, isNavItemModuleEnabled() (+6 more)

### Community 78 - "appearance-settings-screen.tsx"
Cohesion: 0.18
Nodes (12): AppearanceScreen(), OPTIONS, AppearanceSettingsScreen(), THEME_OPTIONS, ACCENT_COLORS, AppearanceSettingsState, DEFAULT_APPEARANCE, useAppearanceSettingsStore (+4 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.16
Nodes (10): DeviceClass, BreakpointKey, breakpoints, platform, screen, sidebarWidth, { width, height }, layoutRhythm (+2 more)

### Community 80 - "profile.ts"
Cohesion: 0.06
Nodes (68): AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace() (+60 more)

### Community 81 - "document-import.ts"
Cohesion: 0.11
Nodes (19): CreateInventoryItemInput, useMobileQuickReceive(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), appendLocalFile(), createLocalFileFormData(), AvatarUploadResult (+11 more)

### Community 82 - "useFloatingTabBarInset"
Cohesion: 0.42
Nodes (7): ScreenActionFooter(), ScreenActionFooterProps, useFloatingTabBarInset(), getFloatingTabBarOffset(), getModalActionScrollInset(), getScreenActionScrollInset(), useRegisterAutocompleteChromeInset()

### Community 83 - "use-mission-control-data.ts"
Cohesion: 0.24
Nodes (12): buildWeekRevenueBars(), computeMonthRevenueGrowth(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), sumWeekIncome() (+4 more)

### Community 84 - "mock-search-catalog.ts"
Cohesion: 0.13
Nodes (19): getExtendedPrefs(), getPrefs(), InitOptions, itemIsServer(), loadExtendedPrefs(), teardownFns, DeliveryChannels, isServerCategoryEnabled() (+11 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.52
Nodes (5): orderShowsOilIntervalTag(), textMatches(), resolveApplicableDocumentSlugs(), resolveDocumentsForOrderCompleted(), resolveDocumentsForOrderCreated()

### Community 86 - "ScanDebounce"
Cohesion: 0.09
Nodes (12): AnimatedRect, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanIdleIndicator(), ScanIdleIndicatorProps, PendingScanContext, scanContextStore (+4 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.50
Nodes (8): AddToOrderHandlers, MotorActionHandlers, motorActionMessage(), motorActionTitle(), openSearchResult(), SearchRouter, showMotorActions(), showPartActions()

### Community 88 - "delete-account.ts"
Cohesion: 0.13
Nodes (19): BellIcon, CoinsIcon, SparklesIcon, TrendingUpIcon, UsersIcon, demoAccountingSnapshot, AccountingAttentionAction, AccountingSnapshot (+11 more)

### Community 89 - "google-sign-in-button.tsx"
Cohesion: 0.34
Nodes (10): ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), canUseNativeGoogleSignIn(), configureNativeGoogleSignIn() (+2 more)

### Community 90 - "index.ts"
Cohesion: 0.25
Nodes (6): CompanyJourneyScreen(), InviteAcceptScreen(), InviteAcceptScreenProps, InvitePreviewCard(), clearPendingInvite(), acceptInvite()

### Community 91 - "auth-oauth-button.tsx"
Cohesion: 0.14
Nodes (14): AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButtonProps, styles, AuthProviderKind, badgeSize (+6 more)

### Community 92 - "form"
Cohesion: 0.21
Nodes (12): ordersSpring, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), OrdersFilters(), OrdersFiltersProps, OrdersPrimaryAction(), OrdersPrimaryActionProps (+4 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "search-result-row.tsx"
Cohesion: 0.17
Nodes (14): HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart, resolveIconColor(), SearchResultRow(), SearchResultRowProps (+6 more)

### Community 95 - "mobile-client.ts"
Cohesion: 0.17
Nodes (13): AutocompleteDataSnapshot, AutocompleteDataStore, EMPTY, useAutocompleteDataStore, AutocompleteDataHead(), extractOperationCategories(), useCachedRealtime(), vehicleRepository (+5 more)

### Community 96 - "location-screen.tsx"
Cohesion: 0.14
Nodes (12): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, kindLabel(), LocationContentsResponse (+4 more)

### Community 97 - "team-employee-card.tsx"
Cohesion: 0.07
Nodes (34): useAuth(), useAuthActions(), Button, SettingsLinkRow, ProfileNameJourneyScreen(), CompanySwitcherSheet(), CompanySwitcherSheetProps, styles (+26 more)

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "notification-provider.tsx"
Cohesion: 0.13
Nodes (33): markAllNotificationsRead(), markNotificationState(), fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord(), markAllInboxNotificationsRead(), subscribeInboxFromFirestore() (+25 more)

### Community 100 - "scan-glass-panel.tsx"
Cohesion: 0.10
Nodes (39): ActivityIcon, ArrowUpRightIcon, BarChart3Icon, BoxIcon, CarIcon, ChevronsUpDownIcon, ChevronUpIcon, ClipboardListIcon (+31 more)

### Community 101 - "resolve-active-company-name.ts"
Cohesion: 0.28
Nodes (6): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter(), SearchEnterConfig

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+3 more)

### Community 103 - "index.ts"
Cohesion: 0.06
Nodes (30): PrinterIcon, Share2Icon, EmptyState(), AcAccountTiles, AcAccountingEmptyState(), AcAccountingEmptyStateProps, AcAccountingSkeleton(), TileSkeleton() (+22 more)

### Community 104 - "invite-accept-screen.tsx"
Cohesion: 0.33
Nodes (5): HorizontalFilterBar(), INVITE_FILTER_OPTIONS, InviteStatusFilter, TeamInviteStatusFilters(), TeamInviteStatusFiltersProps

### Community 105 - "use-add-to-order-flow.ts"
Cohesion: 0.15
Nodes (19): PendingAdd, CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart(), navigateOrderEdit(), OptionRow() (+11 more)

### Community 106 - "search-engine-card.tsx"
Cohesion: 0.40
Nodes (4): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AuthOAuthButton()

### Community 107 - "should-hide-tab-bar.ts"
Cohesion: 0.33
Nodes (9): getDeepestActiveRoute(), isModalOverlayPath(), isModalOverlayRoute(), isNestedTabStackActive(), shouldHideTabBar(), shouldHideTabBarFromNavState(), TAB_BAR_VISIBLE_NESTED_ROUTES, TAB_ROOTS (+1 more)

### Community 108 - "scan-move-sheet.tsx"
Cohesion: 0.19
Nodes (11): ModulesEditorList(), ModulesEditorListProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModulesScreen(), ModulesConfigState, useModulesConfigStore (+3 more)

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
Cohesion: 0.40
Nodes (4): MobileAssignAssetResult, MobileRelocateResult, MobileWarehouseLocation, useMobileWarehouseLocations()

### Community 113 - "useAccessibility"
Cohesion: 0.60
Nodes (5): useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled()

### Community 114 - "recent-scans.ts"
Cohesion: 0.13
Nodes (19): PhoneIcon, useOrderDetailContentEnter(), useOrderDetailHeroEnter(), OrderStatusBadge(), OrderStatusBadgeProps, toneToColor(), formatOrderVehicleLine(), formatWorkOrderLabel() (+11 more)

### Community 115 - "metro.config.js"
Cohesion: 0.33
Nodes (5): config, { getDefaultConfig }, path, sharedPackages, { withNativeWind }

### Community 116 - "invite-code.ts"
Cohesion: 0.83
Nodes (3): generateInviteCode(), generateInviteToken(), pickFromAlphabet()

### Community 117 - "with-ios-universal-links.js"
Cohesion: 0.67
Nodes (3): isUniversalLinksEnabled(), { withEntitlementsPlist }, withIosUniversalLinks()

### Community 122 - "prefer-iphone-macro-lens.ts"
Cohesion: 0.24
Nodes (8): ImportCamera, ImportCameraHandle, ImportCameraProps, styles, CameraWithLenses, usePreferredMacroLens(), preferIphoneMacroLens(), VIRTUAL_LENS_HINTS

### Community 132 - "@autocore/avatars"
Cohesion: 0.09
Nodes (25): OrderCard, OrdersHeader(), OrdersHeaderProps, computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters (+17 more)

### Community 133 - "@autocore/domain-search"
Cohesion: 0.60
Nodes (4): formatPlatformPhone(), getPlatformContacts(), PlatformContacts, readEnv()

### Community 199 - "mc-animated-sparkline.tsx"
Cohesion: 0.42
Nodes (7): AnimatedPolyline, buildPoints(), estimatePathLength(), McAnimatedSparkline(), McAnimatedSparklineProps, buildSparklinePoints(), sanitizeChartSeries()

### Community 201 - "NotificationService"
Cohesion: 0.36
Nodes (6): useNotificationInboxRealtime(), notifyApiError(), notifyNetworkStatus(), NotificationProvider(), NotificationProviderProps, NotificationService

### Community 204 - "organization-membership-row.tsx"
Cohesion: 0.08
Nodes (24): useShimmer(), AuthBackdrop(), AuthShell(), AuthShellProps, CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, sizeMap (+16 more)

### Community 206 - "motor-repository.ts"
Cohesion: 0.11
Nodes (21): clientRepository, enqueueMotorSoldEffects(), clientRepository, createClientRepository(), createMotorRepository(), mapMotor(), motorDocRef(), motorRepository (+13 more)

### Community 207 - "order-card.tsx"
Cohesion: 0.08
Nodes (24): usePressAnimation(), IconProps, CopyIcon, Loader2Icon, QuickActionCard, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize (+16 more)

## Knowledge Gaps
- **874 isolated node(s):** `ScreenEnterConfig`, `withGoogleModularHeaders`, `withGoogleIosUrlScheme`, `withOptionalAppleSignIn`, `withDisableSwiftUICoreAutolink` (+869 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **61 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `search-registry.ts`, `create-operation-screen.tsx`, `orders-screen.tsx`, `text.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `app-tab-bar.tsx`, `index.ts`, `radius`, `getJson`, `scan-screen.tsx`, `useReducedMotion`, `useAuth`, `currency-screen.tsx`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `scan-product-sheet.tsx`, `getFirebaseDb`, `order-composition-step.tsx`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `use-theme.tsx`, `index.ts`, `empty-state.tsx`, `types.ts`, `toneBackground`, `design-language-context.ts`, `scan-service.ts`, `use-profile-snapshot.ts`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `notification-bell-button.tsx`, `document-import-screen.tsx`, `search-results.tsx`, `input-field.tsx`, `mobilePost`, `organization-membership-row.tsx`, `appearance-settings-screen.tsx`, `order-card.tsx`, `useFloatingTabBarInset`, `delete-account.ts`, `index.ts`, `auth-oauth-button.tsx`, `form`, `search-result-row.tsx`, `location-screen.tsx`, `team-employee-card.tsx`, `scan-glass-panel.tsx`, `index.ts`, `invite-accept-screen.tsx`, `use-add-to-order-flow.ts`, `search-engine-card.tsx`, `scan-move-sheet.tsx`, `recent-scans.ts`, `prefer-iphone-macro-lens.ts`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Text` connect `text.tsx` to `search-registry.ts`, `create-operation-screen.tsx`, `orders-screen.tsx`, `@autocore/avatars`, `team-screen.tsx`, `create-order-screen.tsx`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `useSession`, `app-tab-bar.tsx`, `index.ts`, `useTheme`, `Text`, `radius`, `types.ts`, `scan-screen.tsx`, `useReducedMotion`, `useAuth`, `currency-screen.tsx`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `scan-product-sheet.tsx`, `order-composition-step.tsx`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `empty-state.tsx`, `types.ts`, `toneBackground`, `scan-service.ts`, `document-file-actions.ts`, `profile-screen.tsx`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `notification-bell-button.tsx`, `document-import-screen.tsx`, `search-results.tsx`, `mapAuthError`, `input-field.tsx`, `mobilePost`, `useSearchEnter`, `organization-membership-row.tsx`, `appearance-settings-screen.tsx`, `order-card.tsx`, `index.ts`, `auth-oauth-button.tsx`, `form`, `search-result-row.tsx`, `location-screen.tsx`, `team-employee-card.tsx`, `scan-glass-panel.tsx`, `index.ts`, `use-add-to-order-flow.ts`, `scan-move-sheet.tsx`, `recent-scans.ts`, `prefer-iphone-macro-lens.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `useSession()` connect `useSession` to `create-operation-screen.tsx`, `text.tsx`, `@autocore/avatars`, `team-screen.tsx`, `create-order-screen.tsx`, `index.ts`, `app-tab-bar.tsx`, `Text`, `radius`, `types.ts`, `notifications-settings-screen.tsx`, `scan-screen.tsx`, `useAuth`, `currency-screen.tsx`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `use-scan-experience.ts`, `getFirebaseDb`, `my-earnings-screen.tsx`, `types.ts`, `document-file-actions.ts`, `profile-screen.tsx`, `setup-wizard-screen.tsx`, `NotificationService`, `delete-account.ts`, `mobile-client.ts`, `location-screen.tsx`, `team-employee-card.tsx`, `index.ts`, `use-add-to-order-flow.ts`, `recent-scans.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `ScreenEnterConfig`, `withGoogleModularHeaders`, `withGoogleIosUrlScheme` to the rest of the system?**
  _874 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07115677321156773 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05092592592592592 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09462365591397849 - nodes in this community are weakly interconnected._