# Graph Report - autocore-mobile  (2026-07-31)

## Corpus Check
- 785 files · ~230,282 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3688 nodes · 12009 edges · 210 communities (150 shown, 60 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a2ad522e`
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
- ac-payroll-list.tsx
- rbac.ts
- mapAuthError
- input-field.tsx
- Issues found & resolutions
- composer-utils.ts
- animated-tab-screen.tsx
- search-idle.tsx
- styles.ts
- list-row.tsx
- subscription-screen.tsx
- profile.ts
- document-import.ts
- useFloatingTabBarInset
- location-screen.tsx
- mock-search-catalog.ts
- order-documents-section.tsx
- ScanDebounce
- version-settings-screen.tsx
- delete-account.ts
- use-work-order-composer-options.ts
- index.ts
- auth-oauth-button.tsx
- form
- Manual Matrix
- search-result-row.tsx
- mobile-client.ts
- useFloatingTabBarInset
- team-employee-card.tsx
- package.json
- notification-provider.tsx
- scan-glass-panel.tsx
- styles.ts
- scripts
- mobilePost
- invite-accept-screen.tsx
- permissions.ts
- ac-transfer-sheet.tsx
- relocate-pending-store.ts
- clear-local-caches.ts
- Autocore Mobile
- notification-bell-button.tsx
- Firebase integration QA matrix
- diagnostics-settings-screen.tsx
- advances.ts
- scan-code-picker-sheet.tsx
- metro.config.js
- invite-code.ts
- with-ios-universal-links.js
- ExternalLink.tsx
- useColorScheme.web.ts
- settings-animated-card.tsx
- scan-resolve-cache.ts
- with-ios-push-entitlements.js
- tab-bar-visibility-store.ts
- @autocore/avatars
- useFadeIn
- @autocore/org
- date-fns
- expo
- DocumentImportScreen
- expo-auth-session
- expo-blur
- expo-clipboard
- expo-constants
- expo-crypto
- expo-device
- expo-file-system
- expo-haptics
- expo-image
- team-invite-status-filters.tsx
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
- SecuritySettingsScreen
- export-operations-csv.ts
- replace-token.ts
- apple-sign-in-button.tsx
- platform-contacts.ts
- auth-boot-loading.tsx
- expo-image-picker
- @tanstack/react-query-persist-client
- advances.ts
- vehicle-repository.ts
- @autocore/avatars
- react-native-safe-area-context

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 358 edges
2. `Text` - 200 edges
3. `rhythm` - 116 edges
4. `haptics` - 115 edges
5. `useReducedMotion()` - 91 edges
6. `useSession()` - 83 edges
7. `getFirebaseDb()` - 81 edges
8. `toneBackground()` - 80 edges
9. `normalizeCompanyId()` - 67 edges
10. `spacing` - 57 edges

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
- 4-file cycle: `components/ui/index.ts -> components/ui/settings-section-card.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/form-panel.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/form-panel.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/list-row.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/index.ts -> components/ui/navbar.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/horizontal-filter-bar.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/horizontal-filter-bar.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/toast.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/divider.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/divider.tsx`
- 4-file cycle: `components/ui/action-icon-button.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/action-icon-button.tsx`
- 4-file cycle: `components/ui/floating-button.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/floating-button.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/input/input-field.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/autocomplete/inline-autocomplete-row.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/autocomplete/inline-autocomplete-row.tsx`
- 4-file cycle: `components/autocomplete/inline-autocomplete.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/autocomplete/inline-autocomplete.tsx`
- 4-file cycle: `components/ui/alert.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/alert.tsx`
- 4-file cycle: `components/ui/app-loading-screen.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/app-loading-screen.tsx`
- 4-file cycle: `components/ui/avatar.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/avatar.tsx`
- 4-file cycle: `components/ui/badge.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/badge.tsx`
- 4-file cycle: `components/ui/bottom-bar.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/bottom-bar.tsx`
- 4-file cycle: `components/ui/bottom-sheet.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/bottom-sheet.tsx`
- 4-file cycle: `components/ui/button.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/button.tsx`

## Communities (210 total, 60 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.05
Nodes (70): AutocompleteOverlay, AutocompleteOverlayProps, styles, HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps (+62 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.21
Nodes (10): AccountingScreen(), newOperationHref(), NewOperationPreset, advanceDirectionLabel(), CreatableOperationType, filterCashboxOperations(), filterExpenseOperations(), filterPayrollExpenseOperations() (+2 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.12
Nodes (27): CoSection(), CoToggleRow(), CATEGORY_SUGGESTIONS, CreateOperationScreen(), parseAmountInput(), readPreset(), buildOperationsCsv(), escapeCsv() (+19 more)

### Community 3 - "text.tsx"
Cohesion: 0.04
Nodes (65): useShimmer(), AlertTriangleIcon, CheckIcon, CopyIcon, TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize (+57 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.04
Nodes (58): IconProps, SubscriptionRequiredScreenProps, NotificationCard, QuickActionCard, Avatar, AvatarFallback(), AvatarProps, AvatarSize (+50 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (35): ScreenEnterConfig, useScaleEnter(), enterValues, presets, smoothEase, staggerDelay(), cardLift, cardPress (+27 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.09
Nodes (29): compositionGrandTotal(), isSellOnlyComposition(), mapCompositionToWorkOrderLines(), mapOrderToCompositionDrafts(), laborLineTotal(), normalizeLaborPricingMode(), INITIAL_LABOR_DRAFT, initialState (+21 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.15
Nodes (34): AccountingAttentionAction, AttentionTone, CashFlowPeriod, InvoiceStatus, TransactionStatus, TrendTone, CATEGORY_ICONS, computeAccountingSnapshot() (+26 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.18
Nodes (14): PrinterIcon, Share2Icon, DocumentAction, OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), resolveApplicableDocumentSlugs(), resolveDocumentsForOrderCompleted() (+6 more)

### Community 9 - "index.ts"
Cohesion: 0.14
Nodes (20): AuthEmailPill(), typeBadgeColors(), McWeekBar(), searchSpring, searchTimeline, SearchEnterConfig, useSearchEnter(), SearchBar() (+12 more)

### Community 10 - "index.ts"
Cohesion: 0.14
Nodes (28): useAccountingData(), UseAccountingDataResult, OrderDocumentsSection(), CreateOrderScreen(), CompanySettingsScreen(), clientRepository, useClientsRealtime(), useCompanyAppConfig() (+20 more)

### Community 11 - "index.ts"
Cohesion: 0.06
Nodes (51): DesignSystemScreen(), NotFoundScreen(), AnimatedIconWrapper, createIcon(), IconState, ImagesIcon, MapPinIcon, ActivityCard (+43 more)

### Community 12 - "useSession"
Cohesion: 0.16
Nodes (21): hasShelfValue(), isEngine(), SearchEngineCard(), SearchEngineCardProps, formatVin(), inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode() (+13 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.09
Nodes (30): GripVerticalIcon, LayoutGridIcon, NavEditorRowProps, NavigationEditorList(), NavigationEditorListProps, NavigationPreview(), NavigationPreviewProps, DEFAULT_NAV_ENABLED (+22 more)

### Community 14 - "index.ts"
Cohesion: 0.07
Nodes (37): scanSpring, scanTimeline, ScanCandidatesSheet, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanDocumentSheet, ScanFrameOverlay() (+29 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.16
Nodes (14): AutocompleteDataSnapshot, AutocompleteDataStore, EMPTY, useAutocompleteDataStore, AutocompleteDataHead(), extractOperationCategories(), useCachedRealtime(), warehouseRepository (+6 more)

### Community 16 - "useTheme"
Cohesion: 0.08
Nodes (24): ChevronRightIcon, CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, sizeMap, ListRow, ListRowProps, styles (+16 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.09
Nodes (16): Loader2Icon, AUTH_BUTTON_HEIGHT, AuthEmailChipProps, AuthEmailPillProps, AuthOAuthButtonProps, styles, CoTypeSegment, CoTypeSelector() (+8 more)

### Community 18 - "Text"
Cohesion: 0.16
Nodes (16): OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, whTimeline, OPTIONS, WarehouseFilter, WarehouseFilterBar(), WarehouseFilterBarProps (+8 more)

### Community 19 - "radius"
Cohesion: 0.13
Nodes (15): CreateInventoryItemInput, MobileAssignAssetResult, MobileRelocateResult, MobileWarehouseLocation, useMobileWarehouseLocations(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust() (+7 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.21
Nodes (20): useCompanyProfile(), CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), normalizeCompanyId(), resolveCompanyIdsForSync(), pickCompanyLabel(), resolveActiveCompanyName() (+12 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.13
Nodes (21): Listener, listeners, resetAppShellReady(), setAppShellReady(), applyNow(), drainOne(), flushScheduledQueryDataApplies(), getMsSinceLastCatalogApply() (+13 more)

### Community 22 - "getJson"
Cohesion: 0.06
Nodes (47): AnimatedTextInput, formatCounterWorklet(), formatGroupedInteger(), McAnimatedCounter(), McAnimatedCounterProps, McCounterFormat, mcDuration, mcMotion (+39 more)

### Community 23 - "types.ts"
Cohesion: 0.16
Nodes (15): usePressAnimation(), HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart, resolveIconColor(), SearchResultRow() (+7 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.09
Nodes (30): resolveInviteHref(), buildImportDeepLink(), buildOrderDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType (+22 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.07
Nodes (29): useCardLift(), BottomBar(), BottomBarItem, BottomBarProps, DashboardCard(), DashboardCardProps, HorizontalFilterBar(), HorizontalFilterBarProps (+21 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.12
Nodes (17): MailIcon, Input, DeleteAccountDialog(), DeleteAccountDialogProps, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS (+9 more)

### Community 27 - "useAuth"
Cohesion: 0.13
Nodes (21): NotificationsScreen(), useNotificationPreferences(), stripUndefinedDeep(), mergeNotificationPreferences(), buildPreferencesPayload(), preferencesRef(), saveNotificationPreferences(), subscribeNotificationPreferences() (+13 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.19
Nodes (18): useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), appDisplayCurrencyAffix(), formatAppMoney(), formatAppMoneyExample(), APP_MONEY_BASE_CURRENCY, assertPositiveRate() (+10 more)

### Community 29 - "subscription-registry.ts"
Cohesion: 0.10
Nodes (34): noop(), useCompanySubscription(), CachedSubscription, deserializeSubscription(), readSubscriptionCache(), readSubscriptionCacheSync(), SerializedSubscription, serializeSubscription() (+26 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.13
Nodes (25): useRealtimeReconnect(), useSessionBootstrapReady(), clearScheduledQueryDataApplies(), sessionInteractiveQueryKeys(), clearRealtimeSnapshots(), acquireRealtimeSubscription(), applyCachedSnapshot(), areAcquiredSessionListenersReady() (+17 more)

### Community 31 - "types.ts"
Cohesion: 0.10
Nodes (21): IconName, SettingsToggleRow(), ACCOUNTING_DEMO, DESKTOP_DEMO, PERMISSION_GROUPS, WORKSPACE_DEMO, AppearanceSettingsScreen(), THEME_OPTIONS (+13 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.17
Nodes (16): AuthEmailChip(), isValidEmail(), LoginScreen(), readInviteCompanyName(), readInviteEmail(), readInviteToken(), storePendingInvite(), isAppleSignInCancellation() (+8 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.22
Nodes (17): downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile(), ensureWarrantyPdfFile(), getAuthHeaders(), printWarrantyDocument(), printWorkOrderDocument(), shareWarrantyDocument() (+9 more)

### Community 34 - "haptics"
Cohesion: 0.13
Nodes (16): Can(), CanProps, RequirePermission(), RequirePermissionProps, MissionControlScreen(), MissionControlSnapshot, buildWeekBars(), formatMoney() (+8 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.16
Nodes (22): sheetPresentationKey(), useDevMockFallback(), useScanExperience(), entityLinkLabel(), useMobileQuickReceive(), useMobileAssignAssetLocation(), useMobileRelocate(), ScanResolveInput (+14 more)

### Community 36 - "index.ts"
Cohesion: 0.18
Nodes (18): buildWeekRevenueBars(), computeMonthRevenueGrowth(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate(), resolveMissionControlRevenue() (+10 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.12
Nodes (30): scanSheetAnimationConfigs, ScanCandidatesSheetProps, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanDocumentSheetProps, ScanMoveSheetProps, ScanNotFoundSheetProps, ScanProductSheetProps (+22 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.16
Nodes (17): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES (+9 more)

### Community 39 - "rhythm"
Cohesion: 0.12
Nodes (20): ClockIcon, SubscriptionRequiredScreen(), CompanySwitcherSheet(), CompanySwitcherSheetProps, styles, TeamProGate(), TeamProGateProps, BADGE_VARIANT (+12 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.13
Nodes (20): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabPanel(), ComposerTabPanelProps, resolveEntering(), resolveExiting(), CompositionAddCard() (+12 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.13
Nodes (21): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+13 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.27
Nodes (10): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), applyAppleProfileFromCredential(), buildAppleApiPayload(), completeAppleFirebaseSignIn() (+2 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.13
Nodes (24): getString(), MobileApiError, registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken() (+16 more)

### Community 44 - "index.ts"
Cohesion: 0.05
Nodes (41): AuthDivider(), AuthHeroCar(), AuthHeroShell(), AuthHeroShellProps, HeroBackdrop(), InviteFormNotice(), InviteFormNoticeProps, normalizeCode() (+33 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.22
Nodes (11): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload(), RecentScan, formatRelativeTime(), loadRecentScans() (+3 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.19
Nodes (21): getApiBaseUrl(), getBearerToken(), humanizeApiErrorBody(), mobileFetch(), mobileFetchBlob(), mobileGet(), mobilePatch(), mobilePostFlexible() (+13 more)

### Community 47 - "inventory.ts"
Cohesion: 0.05
Nodes (43): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+35 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.08
Nodes (25): @autocore/domain-search, expo-apple-authentication, expo-blur, expo-haptics, expo-image, dependencies, @autocore/domain-search, expo-apple-authentication (+17 more)

### Community 50 - "index.ts"
Cohesion: 0.18
Nodes (14): XIcon, resolveTabRouteName(), resolveCurrentTab(), resolveTabFromHref(), TabNavigateTarget, useNavigateTab(), InAppBannerProvider(), layoutTransition (+6 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.40
Nodes (3): CreateInventoryItemScreen(), parseNumber(), useMobileCreateInventoryItem()

### Community 52 - "types.ts"
Cohesion: 0.17
Nodes (22): SearchScreen(), WarehouseScreen(), useInventoryCatalog(), useInventorySearch(), useCompanyModuleEnabled(), QUICK_CATEGORIES, useSearchIdleData(), useSession() (+14 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.22
Nodes (10): DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModuleDefinition, ModulesScreen(), ModulesConfigState, useModulesConfigStore, ProductModuleId (+2 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.11
Nodes (23): ArrowRightIcon, SectionCard(), StepIndicator(), STEPS, useOrderCompositionForm(), UseOrderCompositionFormOptions, resolveInventoryUnitPrice(), formatMotorDisplayName() (+15 more)

### Community 55 - "toneBackground"
Cohesion: 0.11
Nodes (23): ActivityFeedFiltersProps, READ_FILTERS, DeliveryChannels, isServerCategoryEnabled(), PRIORITY_BASE, resolveDeliveryChannels(), resolveLiveEditingChannels(), resolveSyncChannels() (+15 more)

### Community 56 - "design-language-context.ts"
Cohesion: 0.17
Nodes (15): AuthOAuthButton(), getOAuthButtonTheme(), OAuthButtonTheme, resolveScheme(), ThemeContext, ThemeContextValue, ThemePreference, ThemeProvider() (+7 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.14
Nodes (17): AUTO_TYPES, PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, styles, VIN_TYPES, queryClient (+9 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.10
Nodes (19): AutocompleteInput, AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, SellMotorSheet, SellMotorSheetProps, SellMotorSheetRef, assertValidPayload() (+11 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.12
Nodes (20): CompanyEmployeeRow, useCompanyEmployees(), fetchJsonWithTimeout(), getPublicApiBaseUrl(), AppleSignInApiPayload, AppleSignInApiResponse, exchangeAppleSignInViaApi(), AuthEmailApiError (+12 more)

### Community 60 - "use-profile-snapshot.ts"
Cohesion: 0.10
Nodes (21): ProfileHeader(), ProfileHeroCard(), ProfileHeroCardProps, PROFILE_ROUTES, profileHubRouteHref(), ProfileHubRow, ProfileScreen(), ProfileDangerAction (+13 more)

### Community 61 - "ScanService"
Cohesion: 0.12
Nodes (27): mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), disambiguateScanPayload(), pickScanCandidate() (+19 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.16
Nodes (22): AuthGate(), MemoAppTree, useAuthHasAccess(), useAuthReady(), AuthRedirectEffect(), WorkspaceAccessScreen(), AUTH_JOURNEY_PROGRESS_ORDER, AUTH_JOURNEY_STEP_LABELS (+14 more)

### Community 63 - "include"
Cohesion: 0.08
Nodes (23): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/design-tokens/src, ../packages/domain-search/src, ../packages/org/src (+15 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.18
Nodes (14): HydrationPayload, SessionHydrationPayload, SessionSnapshot, WorkspaceAccessCopy, SessionBootstrapPayload, AuthStore, initialState, AuthSnapshot (+6 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.34
Nodes (10): ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), canUseNativeGoogleSignIn(), configureNativeGoogleSignIn() (+2 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.13
Nodes (17): ArrowLeftIcon, useAuth(), useAuthActions(), AuthBackdrop(), AuthShell(), AuthShellProps, ProgressBar(), ForgotPasswordScreen() (+9 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.11
Nodes (23): animationSpeed, buttonHeight, A11ySlice, defaultEasing, glassStyle, iconWeight, layering, modalTransition (+15 more)

### Community 68 - "document-import-screen.tsx"
Cohesion: 0.17
Nodes (19): preloadSessionSnapshots(), sessionBootstrapQueryKeys(), CachedRealtimeSnapshot, flushOneWrite(), isFresh(), lastDataJsonByKey, memoryCache, PendingWrite (+11 more)

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.18
Nodes (12): AcPayrollListProps, PayrollRow(), PayrollStatusBadge(), statusColors(), AcDivider(), nextPayrollStatus(), PAYROLL_STATUS_LABELS, PAYROLL_RATE_TYPES (+4 more)

### Community 70 - "rbac.ts"
Cohesion: 0.10
Nodes (21): MemoTabBar, TAB_SCREEN_OPTIONS, AppTabBar, AppTabBarItem, AppTabBarProps, TAB_ICON_STROKE, TabRoute, TabVisual (+13 more)

### Community 71 - "mapAuthError"
Cohesion: 0.20
Nodes (15): actions, SearchEmptyActionId, SearchEmptyState(), SearchEmptyStateProps, pluralResults(), SearchResults(), SearchResultsProps, AddToOrderHandlers (+7 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.16
Nodes (21): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, InputField (+13 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "composer-utils.ts"
Cohesion: 0.16
Nodes (14): AppleIcon(), BrandIconProps, GoogleIcon(), AuthProviderKind, badgeSize, monogramFontSize, UserAvatar(), UserAvatarProps (+6 more)

### Community 75 - "animated-tab-screen.tsx"
Cohesion: 0.16
Nodes (3): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen

### Community 76 - "search-idle.tsx"
Cohesion: 0.09
Nodes (26): OrderStatusBadgeProps, orderStatusLabel, OrderStatusTone, OrderStatus, SearchFilters(), SearchFiltersProps, catalog, CatalogEntry (+18 more)

### Community 77 - "styles.ts"
Cohesion: 0.06
Nodes (47): PhoneIcon, useOrderDetailHeroEnter(), OrderCard, OrdersHeader(), OrdersHeaderProps, computeOrdersListMeta(), filterCounts(), filterOrders() (+39 more)

### Community 78 - "list-row.tsx"
Cohesion: 0.15
Nodes (14): DangerRow(), OrgDangerZone(), OrgDangerZoneProps, OrganizationSwitchButton(), OrganizationSwitchButtonProps, SettingsGroup(), SettingsGroupDivider(), SettingsGroupProps (+6 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.07
Nodes (30): AnimatedLine, FRONT_WHEEL, REAR_WHEEL, SPEED_LINES, WheelProps, AnimatedPath, AppLoadingLogo(), AppLoadingLogoProps (+22 more)

### Community 80 - "profile.ts"
Cohesion: 0.11
Nodes (37): AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace() (+29 more)

### Community 81 - "document-import.ts"
Cohesion: 0.07
Nodes (39): TeamEmployeeCard, TeamEmployeeCardProps, styles, TeamInviteCardProps, TeamInviteRow, INVITE_FILTER_OPTIONS, InviteStatusFilter, TeamInviteStatusFilters() (+31 more)

### Community 82 - "useFloatingTabBarInset"
Cohesion: 0.14
Nodes (18): CompanyJourneyScreen(), CompanyMode, InviteAcceptScreen(), InviteAcceptScreenProps, InvitePreviewCard(), JoinCompanyScreen(), parseInviteInput(), clearPendingInvite() (+10 more)

### Community 83 - "location-screen.tsx"
Cohesion: 0.14
Nodes (12): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, kindLabel(), LocationContentsResponse (+4 more)

### Community 84 - "mock-search-catalog.ts"
Cohesion: 0.17
Nodes (23): applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems(), paginateItems() (+15 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.11
Nodes (17): OrderOpenOverlay(), OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), OverlayProps, SourceLayout, useOrderTransition(), { width: SCREEN_W, height: SCREEN_H } (+9 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.10
Nodes (10): ScanLauncherButton(), ScanLauncherButtonProps, ScanLauncherRow(), ScanEntityKind, PendingScanContext, scanContextStore, ScanCommitResult, ScanDebounce (+2 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.20
Nodes (12): enqueueMotorSoldEffects(), clientRef(), clientRepository, clientsRef(), createClientRepository(), motorRepository, sellMotor(), SellMotorInput (+4 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.05
Nodes (67): TrendingDownIcon, ListGroup(), acTimeline, AcAccountTiles, AcAccountTilesProps, AccountTile(), TileDef, AcAccountingSkeleton() (+59 more)

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.14
Nodes (15): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, allocateWorkOrderNumber() (+7 more)

### Community 90 - "index.ts"
Cohesion: 0.10
Nodes (21): CheckCircle2Icon, FlashlightIcon, DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles (+13 more)

### Community 91 - "auth-oauth-button.tsx"
Cohesion: 0.22
Nodes (17): ensureFirestoreAuthReady(), buildFallbackProfile(), CompanyDocShape, ensureUserDocument(), hydrateEffectiveProfile(), loadFastSessionBootstrap(), loadFastUserProfile(), loadMemberships() (+9 more)

### Community 92 - "form"
Cohesion: 0.20
Nodes (8): DeviceClass, BreakpointKey, breakpoints, platform, screen, sidebarWidth, { width, height }, layoutRhythm

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "search-result-row.tsx"
Cohesion: 0.30
Nodes (12): PendingAdd, useAddToOrderFlow(), CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart(), navigateOrderEdit() (+4 more)

### Community 95 - "mobile-client.ts"
Cohesion: 0.32
Nodes (6): useScreenEnter(), useOrderDetailContentEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter()

### Community 96 - "useFloatingTabBarInset"
Cohesion: 0.44
Nodes (6): ScreenActionFooter(), ScreenActionFooterProps, useFloatingTabBarInset(), getFloatingTabBarOffset(), getScreenActionScrollInset(), useRegisterAutocompleteChromeInset()

### Community 97 - "team-employee-card.tsx"
Cohesion: 0.21
Nodes (17): MissionControlBody(), formatActivityTime(), buildWeekBars(), closedRevenueForDay(), isSameDay(), orderRevenue(), safePercent(), statusTone() (+9 more)

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "notification-provider.tsx"
Cohesion: 0.17
Nodes (23): useNotificationInboxRealtime(), NotificationProvider(), NotificationProviderProps, markAllNotificationsRead(), markNotificationState(), fetchInboxFromFirestore(), filterByState(), mapCompanyInbox() (+15 more)

### Community 100 - "scan-glass-panel.tsx"
Cohesion: 0.08
Nodes (52): ActivityIcon, ArrowUpRightIcon, BarChart3Icon, BellIcon, BoxIcon, CarIcon, ChevronDownIcon, ChevronsUpDownIcon (+44 more)

### Community 101 - "styles.ts"
Cohesion: 0.12
Nodes (20): withAlpha(), borderStyle(), designLanguageFromScheme(), cornerStyle, defaultShadow(), surfaceStyle(), touchTarget, blend() (+12 more)

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+3 more)

### Community 103 - "mobilePost"
Cohesion: 0.26
Nodes (11): CurrencyScreen(), styles, useUserDisplayCurrency(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS, AppDisplayCurrency, appDisplayCurrencyOption, normalizeAppDisplayCurrency() (+3 more)

### Community 104 - "invite-accept-screen.tsx"
Cohesion: 0.42
Nodes (7): AnimatedPolyline, buildPoints(), estimatePathLength(), McAnimatedSparkline(), McAnimatedSparklineProps, buildSparklinePoints(), sanitizeChartSeries()

### Community 105 - "permissions.ts"
Cohesion: 0.42
Nodes (8): can(), canEditInventory(), canEditWorkOrders(), canManageEmployees(), canManageSettings(), canViewEmployees(), canViewInventory(), canViewWorkOrders()

### Community 106 - "ac-transfer-sheet.tsx"
Cohesion: 0.60
Nodes (4): formatPlatformPhone(), getPlatformContacts(), PlatformContacts, readEnv()

### Community 107 - "relocate-pending-store.ts"
Cohesion: 0.12
Nodes (12): ButtonProps, ButtonShape, ButtonSize, ButtonVariant, EmptyState(), EmptyStateAction, EmptyStateProps, Snackbar() (+4 more)

### Community 108 - "clear-local-caches.ts"
Cohesion: 0.14
Nodes (22): AppProviders(), RootNavigator(), RootStack, RootStatusBar(), clearSubscriptionCaches(), clearSubscriptionRegistry(), clearRecentQueriesCache(), clearSessionSnapshot() (+14 more)

### Community 109 - "Autocore Mobile"
Cohesion: 0.22
Nodes (8): Autocore Mobile, Design system first, Getting started, Next steps, Project structure, Stack, Theme tokens, UI library

### Community 110 - "notification-bell-button.tsx"
Cohesion: 0.11
Nodes (20): ActivityDateGroup(), ActivityFeedFilters(), DateGroup, DateGroupKey, formatNotificationTime(), GROUP_LABELS, groupNotificationsByDate(), NotificationInboxScreen() (+12 more)

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.39
Nodes (6): useCompanyInvites(), createCompanyInvite(), CreateInviteApiResponse, mapInviteDoc(), subscribeCompanyInvites(), InviteDocument

### Community 113 - "advances.ts"
Cohesion: 0.17
Nodes (10): getFirebaseDb(), deleteUserAccountData(), BarcodeMapping, barcodeMappingRepository, createBarcodeMappingRepository(), createMotorRepository(), mapMotor(), motorDocRef() (+2 more)

### Community 114 - "scan-code-picker-sheet.tsx"
Cohesion: 0.19
Nodes (12): OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent(), ScanUnknownSheetProps, classifyScanPayload(), ENTITY_PREFIXES, hasValidEanChecksum(), isHttpUrl() (+4 more)

### Community 115 - "metro.config.js"
Cohesion: 0.33
Nodes (5): config, { getDefaultConfig }, path, sharedPackages, { withNativeWind }

### Community 116 - "invite-code.ts"
Cohesion: 0.83
Nodes (3): generateInviteCode(), generateInviteToken(), pickFromAlphabet()

### Community 117 - "with-ios-universal-links.js"
Cohesion: 0.67
Nodes (3): isUniversalLinksEnabled(), { withEntitlementsPlist }, withIosUniversalLinks()

### Community 122 - "scan-resolve-cache.ts"
Cohesion: 0.29
Nodes (11): OAuthProvider, accountUsesPassword(), deleteAccountForCurrentUser(), DeleteAccountInput, isCancelled(), reauthenticateForDeletion(), deleteCurrentAuthUser(), getAuthProviderIds() (+3 more)

### Community 132 - "@autocore/avatars"
Cohesion: 0.18
Nodes (15): ordersSpring, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), ComposerTabBar(), ComposerTabBarProps, ComposerTabOption, TabIcon (+7 more)

### Community 133 - "useFadeIn"
Cohesion: 0.53
Nodes (5): useFadeIn(), usePageEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps

### Community 140 - "DocumentImportScreen"
Cohesion: 0.18
Nodes (11): DocumentImportScreen(), appendLocalFile(), createLocalFileFormData(), AvatarUploadResult, uploadUserAvatar(), DocumentImportJobStatus, DocumentImportUploadResult, getDocumentImportStatus() (+3 more)

### Community 150 - "team-invite-status-filters.tsx"
Cohesion: 0.33
Nodes (5): FinanceSettingsScreen(), useGuardedRouter(), guardedPush(), PushRouter, navigationHrefKey()

### Community 198 - "SecuritySettingsScreen"
Cohesion: 0.43
Nodes (6): useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled(), DesignLanguageContext

### Community 199 - "export-operations-csv.ts"
Cohesion: 0.10
Nodes (21): Button, ProfileMetaCard(), ProfileMetaCardProps, ProfileScreenShell(), ProfileScreenShellProps, AppearanceScreen(), OPTIONS, ToggleRowProps (+13 more)

### Community 200 - "replace-token.ts"
Cohesion: 0.27
Nodes (7): AuthenticatedLandingScreen(), WorkspaceCompaniesSection(), SETTINGS_ROUTES, settingsRouteHref(), WorkspaceScreen(), SettingsRouteId, useActiveCompanyName()

### Community 201 - "apple-sign-in-button.tsx"
Cohesion: 0.50
Nodes (3): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled()

### Community 202 - "platform-contacts.ts"
Cohesion: 0.10
Nodes (25): notifyFirestoreSnapshotError(), reviveDatesDeep(), shouldReviveDateField(), toDateFromFirestore(), mapClient(), documentGenerationJobRepository, mapJob(), FinancialOperationsFilters (+17 more)

### Community 203 - "auth-boot-loading.tsx"
Cohesion: 0.17
Nodes (13): HomeRoute(), AuthBootLoadingProps, AuthLoadingScreen(), AppLoadingScreen(), AppLoadingScreenProps, getStartupMarks(), logStartupTable(), MarkEntry (+5 more)

### Community 205 - "@tanstack/react-query-persist-client"
Cohesion: 0.25
Nodes (9): indexCenter(), OrderWorkflowProgress(), OrderWorkflowProgressProps, getWorkflowStages(), resolveStageIndex(), STAGE_LABELS, STAGE_ORDER, WorkflowStage (+1 more)

### Community 206 - "advances.ts"
Cohesion: 0.35
Nodes (10): ADVANCE_KEYWORDS, AdvanceDirection, AdvanceSnapshot, appendAdvanceMarker(), buildAdvanceSnapshot(), filterAdvanceOperations(), isAdvanceOperation(), isAdvancePaid() (+2 more)

### Community 207 - "vehicle-repository.ts"
Cohesion: 0.31
Nodes (6): mapVehicle(), vehicleRef(), vehiclesRef(), CreateVehicleInput, UpdateVehicleInput, VehicleEntity

## Knowledge Gaps
- **904 isolated node(s):** `SURFACE_SPRING`, `TRAVEL_SPRING`, `ENTER_FADE`, `EXIT_FADE`, `sheetIn` (+899 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `index.ts` to `search-registry.ts`, `orders-screen.tsx`, `text.tsx`, `team-screen.tsx`, `@autocore/avatars`, `index.ts`, `index.ts`, `index.ts`, `DocumentImportScreen`, `useSession`, `index.ts`, `app-tab-bar.tsx`, `useTheme`, `auth-provider.tsx`, `Text`, `getJson`, `types.ts`, `scan-screen.tsx`, `useReducedMotion`, `types.ts`, `auth-gate.tsx`, `haptics`, `scan-product-sheet.tsx`, `getFirebaseDb`, `rhythm`, `order-composition-step.tsx`, `inventory.ts`, `index.ts`, `client-repository.ts`, `organization-switch-button.tsx`, `design-language-context.ts`, `scan-service.ts`, `startup-tracer.ts`, `use-profile-snapshot.ts`, `profile-screen.tsx`, `login-screen.tsx`, `ac-payroll-list.tsx`, `rbac.ts`, `export-operations-csv.ts`, `replace-token.ts`, `input-field.tsx`, `composer-utils.ts`, `auth-boot-loading.tsx`, `search-idle.tsx`, `@tanstack/react-query-persist-client`, `styles.ts`, `subscription-screen.tsx`, `list-row.tsx`, `document-import.ts`, `useFloatingTabBarInset`, `location-screen.tsx`, `order-documents-section.tsx`, `ScanDebounce`, `delete-account.ts`, `index.ts`, `useFloatingTabBarInset`, `scan-glass-panel.tsx`, `SecuritySettingsScreen`, `mapAuthError`, `mobilePost`, `relocate-pending-store.ts`, `clear-local-caches.ts`, `notification-bell-button.tsx`, `scan-code-picker-sheet.tsx`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `Text` connect `team-screen.tsx` to `search-registry.ts`, `orders-screen.tsx`, `text.tsx`, `@autocore/avatars`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `useSession`, `app-tab-bar.tsx`, `index.ts`, `useTheme`, `auth-provider.tsx`, `Text`, `getJson`, `types.ts`, `scan-screen.tsx`, `useReducedMotion`, `types.ts`, `auth-gate.tsx`, `haptics`, `scan-product-sheet.tsx`, `getFirebaseDb`, `rhythm`, `order-composition-step.tsx`, `index.ts`, `inventory.ts`, `index.ts`, `organization-switch-button.tsx`, `scan-service.ts`, `startup-tracer.ts`, `use-profile-snapshot.ts`, `profile-screen.tsx`, `login-screen.tsx`, `ac-payroll-list.tsx`, `rbac.ts`, `export-operations-csv.ts`, `input-field.tsx`, `mapAuthError`, `composer-utils.ts`, `auth-boot-loading.tsx`, `search-idle.tsx`, `@tanstack/react-query-persist-client`, `styles.ts`, `list-row.tsx`, `subscription-screen.tsx`, `document-import.ts`, `useFloatingTabBarInset`, `location-screen.tsx`, `order-documents-section.tsx`, `ScanDebounce`, `delete-account.ts`, `index.ts`, `scan-glass-panel.tsx`, `mobilePost`, `relocate-pending-store.ts`, `notification-bell-button.tsx`, `scan-code-picker-sheet.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `useSession()` connect `types.ts` to `create-operation-screen.tsx`, `orders-screen.tsx`, `text.tsx`, `team-screen.tsx`, `accounting-screen.tsx`, `index.ts`, `app-tab-bar.tsx`, `index.ts`, `order-detail-screen.tsx`, `Text`, `firestore-timestamp.ts`, `useAuth`, `currency-screen.tsx`, `haptics`, `use-scan-experience.ts`, `getFirebaseDb`, `rhythm`, `scan-document-sheet.tsx`, `index.ts`, `client-repository.ts`, `organization-switch-button.tsx`, `profile-screen.tsx`, `rbac.ts`, `export-operations-csv.ts`, `replace-token.ts`, `composer-utils.ts`, `search-idle.tsx`, `styles.ts`, `list-row.tsx`, `document-import.ts`, `location-screen.tsx`, `delete-account.ts`, `search-result-row.tsx`, `team-employee-card.tsx`, `notification-provider.tsx`, `scan-glass-panel.tsx`, `permissions.ts`, `notification-bell-button.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `SURFACE_SPRING`, `TRAVEL_SPRING`, `ENTER_FADE` to the rest of the system?**
  _904 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053750597228858096 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12096774193548387 - nodes in this community are weakly interconnected._
- **Should `text.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.040378006872852236 - nodes in this community are weakly interconnected._