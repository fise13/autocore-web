# Graph Report - autocore-mobile  (2026-08-13)

## Corpus Check
- 1164 files · ~996,592 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5413 nodes · 18693 edges · 244 communities (177 shown, 67 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.66)
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
- expo-router
- @react-native-community/netinfo
- react-native-gesture-handler
- @react-native-google-signin/google-signin
- NATIVE_TAB_BAR_HEIGHT

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
- `ThemeProvider()` --indirect_call--> `base()`  [INFERRED]
  autocore-mobile/hooks/use-theme.tsx → autocore-mobile/lib/subscriptions/dev-mode.ts
- `useScaleEnter()` --calls--> `useReducedMotion()`  [EXTRACTED]
  autocore-mobile/animations/presets.ts → autocore-mobile/hooks/use-accessibility.ts
- `TabLayout()` --calls--> `useTheme()`  [EXTRACTED]
  autocore-mobile/app/(tabs)/_layout.tsx → autocore-mobile/hooks/use-theme.tsx
- `AuthDivider()` --calls--> `useTheme()`  [EXTRACTED]
  autocore-mobile/authentication/auth-divider.tsx → autocore-mobile/hooks/use-theme.tsx
- `useAuthActionsController()` --indirect_call--> `user()`  [INFERRED]
  autocore-mobile/authentication/auth-provider.tsx → autocore-mobile/lib/shell/workspace-registry.test.ts

## Import Cycles
- 1-file cycle: `autocore-mobile/lib/vehicles/vehicle-catalog.ts -> autocore-mobile/lib/vehicles/vehicle-catalog.ts`

## Communities (244 total, 67 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.07
Nodes (65): CompanyEmployeeRow, useCompanyEmployees(), useCompanyProfile(), CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), normalizeCompanyId(), pickCompanyLabel() (+57 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.11
Nodes (21): AnimatedPressable, canUseLiquidGlass(), CenterAction(), DockItem(), LiquidGlassTabBar, LiquidGlassTabBarInner(), styles, isTabRouteName() (+13 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.08
Nodes (50): planById(), devDisplayPrice(), devProducts(), clearEntitlementCaches(), peekEntitlement(), isCancellation(), emit(), EMPTY_PRODUCTS (+42 more)

### Community 3 - "text.tsx"
Cohesion: 0.12
Nodes (25): CANONICAL, HomeLayoutInput, isPresent(), pickLead(), resolveHomeLayout(), shellAllows(), activity, ALL_SECTIONS (+17 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.16
Nodes (13): LockIcon, FeatureGate(), FeatureGateProps, FeatureLockedCard(), FeatureLockedCardProps, TeamProGate(), TeamProGateProps, useFeatureGate() (+5 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (32): ScreenEnterConfig, useScaleEnter(), enterValues, cardLift, cardPress, dialogBackdropEnter, dialogBackdropExit, dialogEnter (+24 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.06
Nodes (55): KeyboardFormShell(), KeyboardFormShellProps, FormListRow(), FormListSplitRow(), GroupedList(), GroupedSection(), SheetNavButton(), SummaryRow() (+47 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.10
Nodes (37): useRealtimeReconnect(), useSessionBootstrapReady(), CachedRealtimeSnapshot, flushOneWrite(), isFresh(), lastDataJsonByKey, memoryCache, PendingWrite (+29 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.02
Nodes (140): ThroughputBarsProps, TrendSparklineProps, ActiveJobHero, ActiveJobHeroProps, useScheme(), ActivityRow, ActivityRowProps, useScheme() (+132 more)

### Community 9 - "index.ts"
Cohesion: 0.08
Nodes (38): resolveInviteHref(), buildImportDeepLink(), buildOrderDeepLink(), resolveNotificationDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType, ERROR_EVENTS (+30 more)

### Community 10 - "index.ts"
Cohesion: 0.12
Nodes (34): CreateOrderScreen(), SearchScreen(), clientRepository, useClientsRealtime(), useCompanyAppConfig(), useDocumentGenerationJobsRealtime(), useInventoryCatalog(), useInventorySearch() (+26 more)

### Community 11 - "index.ts"
Cohesion: 0.09
Nodes (34): AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, CoToggleRow(), BUILTIN_CATEGORY_SUGGESTIONS, CreateOperationScreen(), parseAmountInput(), readPreset() (+26 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.11
Nodes (19): presentOrganizationSwitcher(), ProfileScreenShell(), ProfileScreenShellProps, profileRouteHref(), SETTINGS_ROUTES, settingsRouteHref(), AdvancedScreen(), CompanySettingsScreen() (+11 more)

### Community 14 - "index.ts"
Cohesion: 0.10
Nodes (30): comparePlans(), highestPlan(), PlanAvailability, PlanDescriptor, planForSku(), PLANS, TIER_RANK, tierRank() (+22 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.06
Nodes (38): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+30 more)

### Community 16 - "useTheme"
Cohesion: 0.09
Nodes (34): averageOfPoints(), buildWeeklyClosedCounts(), closedCountInRange(), insightChartIsUseful(), startOfDay(), WEEK_LABELS, OverviewBody(), ActivityCategory (+26 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.17
Nodes (22): ChartPoint, LineChart, LineChartProps, resolveHomeAccent(), HomeActivity(), HomeAiInsightCard(), HomeAttention(), HomeEmpty() (+14 more)

### Community 18 - "Text"
Cohesion: 0.31
Nodes (14): ThroughputBars, TrendSparkline, BrowseTile, FilterChipRow, HealthRing, HighlightCard, KPIStrip, MetricHero (+6 more)

### Community 19 - "radius"
Cohesion: 0.15
Nodes (22): formatRelativeNow(), buildWeekRevenueBars(), computeMonthRevenueGrowth(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate() (+14 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.05
Nodes (75): ExternalLinkIcon, MailIcon, Share2Icon, OrganizationMembershipRow, InvitePreviewCard(), TeamInvitePresentOptions, TeamInviteSheet, TeamInviteSheetProps (+67 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.11
Nodes (16): resolveScheme(), ThemeProvider(), BreakpointKey, breakpoints, platform, screen, { width, height }, defaultShadow() (+8 more)

### Community 22 - "getJson"
Cohesion: 0.29
Nodes (7): NavItemId, EXPO_TAB_HREFS, isNavItemModuleEnabled(), isNavItemVisible(), NavModuleFlags, isMobileNavItemAllowed(), NAV_TO_TAB

### Community 23 - "types.ts"
Cohesion: 0.18
Nodes (21): applyOptimisticClaim(), buildOptimisticIntakeJob(), buildOptimisticIntakeSession(), mergeIntakeJobs(), OptimisticIntakeIdentity, EMPTY_OVERLAY, emptyOverlay(), getIntakeOverlay() (+13 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.06
Nodes (48): NotFoundScreen(), AnimatedIconWrapper, createIcon(), IconState, ActivityIcon, ImagesIcon, UserRoundIcon, ActivityCard (+40 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.06
Nodes (60): ArrowUpRightIcon, BarChart3Icon, BellIcon, BoxIcon, CarIcon, CheckCircle2Icon, ChevronDownIcon, ChevronsUpDownIcon (+52 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.10
Nodes (37): finalizeEngineIntakePhoto(), prepareEngineIntakePhoto(), sendEngineIntakeCommand(), buildSnapshot(), clearFailedIntakeOutbox(), commandFailureBlocksJob(), countPendingCommands(), countPhotoFailed() (+29 more)

### Community 27 - "useAuth"
Cohesion: 0.11
Nodes (35): node(), ActionItem, AiCapability, AiCapabilityId, HomeSectionId, HomeSectionSpec, SearchScopeId, ShellModel (+27 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.12
Nodes (23): CATEGORY_HINTS, NotificationsSettingsScreen(), useNotificationInbox(), useNotificationPreferences(), stripUndefinedDeep(), mergeNotificationPreferences(), buildPreferencesPayload(), preferencesRef() (+15 more)

### Community 29 - "paywall.tsx"
Cohesion: 0.07
Nodes (39): PhoneIcon, OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), SourceLayout, useOrderTransition(), OrderCard, OrderCardProps (+31 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.13
Nodes (11): HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs, InlineAutocompleteRow, InlineAutocompleteRowProps (+3 more)

### Community 31 - "types.ts"
Cohesion: 0.17
Nodes (13): AutocompleteOverlay, AutocompleteOverlayProps, DockPanelProps, getAutocompleteDataSnapshot(), applySuggestion(), replaceLastToken(), AutocompleteReplaceMode, AutocompleteSession (+5 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.14
Nodes (19): useAccountingData(), UseAccountingDataResult, BalanceSnapshot, calculateCashBalance(), accumulateOperationBalance(), assertValidPayload(), createFinancialOperation(), CreatePayload (+11 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.17
Nodes (16): searchSpring, searchTimeline, SearchEnterConfig, useSearchEnter(), hasShelfValue(), isEngine(), SearchEngineCard(), SearchEngineCardProps (+8 more)

### Community 34 - "haptics"
Cohesion: 0.11
Nodes (18): DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus, ImportSuccessView() (+10 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.16
Nodes (20): WarehouseScreen(), useWorkCounts(), isAwaitingPlacement(), useSessionQueryData(), calendarDaysBetween(), isMotorStale(), isWarehouseLowStock(), warehouseLowStockThreshold() (+12 more)

### Community 36 - "index.ts"
Cohesion: 0.15
Nodes (22): CurrencyScreen(), useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), APP_DISPLAY_CURRENCIES, AppDisplayCurrency, appDisplayCurrencyAffix(), formatAppMoney() (+14 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.12
Nodes (30): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, useWorkOrderDocumentsRealtime(), orderShowsOilIntervalTag(), textMatches(), downloadPdfFromApi(), downloadRemotePdf() (+22 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.09
Nodes (40): CachedEntitlement, CachedSubscription, date(), deserialize(), iso(), readEntitlementCache(), readEntitlementCacheSync(), serialize() (+32 more)

### Community 39 - "rhythm"
Cohesion: 0.13
Nodes (14): CollectionSwitchRow, ModulesEditorList(), ModulesEditorListProps, SettingsToggleRowProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModulesScreen() (+6 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.07
Nodes (42): catalogRowPosition, EngineThumbnail, EngineRow, EnginesScreen(), flattenVariants(), UnitSubtitle(), clean(), daysOnLot() (+34 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.13
Nodes (21): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+13 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.07
Nodes (48): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, workspaceImport(), useAuthHasAccess() (+40 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.12
Nodes (27): reconcileIntakeSyncLocalNotification(), PushRegistrationHead(), MobileApiError, registerNotificationDevice(), attachForegroundListener(), cancelLocalNotification(), ensureAndroidChannel(), ensureNotificationHandler() (+19 more)

### Community 44 - "index.ts"
Cohesion: 0.08
Nodes (66): BOARD_KEYS, DOCS, WorkOsCatalogHarness(), WorkOsStoryboard00(), WorkOsStoryboard01(), WorkOsStoryboard02(), WorkOsStoryboard03(), WorkOsStoryboard04() (+58 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.14
Nodes (36): AccountingAttentionAction, AccountingQuickActionId, AttentionTone, CashFlowPeriod, InvoiceStatus, TransactionStatus, TrendTone, computeAccountingSnapshot() (+28 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.11
Nodes (38): parseFeature(), PaywallRoute(), CheckIcon, featureDelay(), paywallDuration, paywallEase, paywallEnter, paywallSpring (+30 more)

### Community 47 - "inventory.ts"
Cohesion: 0.06
Nodes (25): WORK_OS_DESIGN_DOC_0, WORK_OS_DESIGN_DOC_1, WORK_OS_DESIGN_DOC_2, WORK_OS_DESIGN_DOC_3, WORK_OS_DESIGN_DOC_4, WORK_OS_DESIGN_DOC_5, WORK_OS_DESIGN_DOC_6, WORK_OS_DESIGN_DOC_7 (+17 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.07
Nodes (27): @autocore/org, clsx, expo-constants, expo-font, expo-notifications, expo-sharing, expo-splash-screen, @gorhom/bottom-sheet (+19 more)

### Community 50 - "index.ts"
Cohesion: 0.09
Nodes (33): allStoreSkus(), skuForPlan(), asPurchaseFailure(), CODE_MAP, failure(), isPurchaseFailure(), MESSAGES, readErrorCode() (+25 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.07
Nodes (41): HomeRoute(), CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), Listener, listeners, resetAppShellReady(), setAppShellReady() (+33 more)

### Community 52 - "types.ts"
Cohesion: 0.34
Nodes (17): filterAutocompleteOptions(), uniqueAutocompleteOptions(), computeMatchRanges(), inferEngineFuelBadge(), mergeEngineCustomOptions(), searchAutocomplete(), searchCategories(), searchCustomers() (+9 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.16
Nodes (15): OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, whTimeline, OPTIONS, WarehouseFilter, WarehouseFilterBar(), WarehouseFilterBarProps (+7 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.10
Nodes (35): buildWorkModel(), buildWorkToday(), EMPTY_WORK_COUNTS, fallback(), groupThousands(), plural(), ResolvedDetail, resolveEngines() (+27 more)

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.09
Nodes (30): EllipsisIcon, OrderClaimSection(), OrderClaimSectionProps, LineRow(), OrderLine, OrderLinesList(), OrderLinesListProps, Section() (+22 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.10
Nodes (34): openNotificationDeepLink(), applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems() (+26 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.22
Nodes (19): operationAccountDetail(), CoMixedSplit(), CoMixedSplitProps, formatDraft(), accountForPaymentMethod(), buildMixedPaymentFields(), defaultMixedSplit(), INCOMING (+11 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.19
Nodes (17): toast(), ToastAction, ToastItem, ToastStore, ToastVariant, PendingAdd, useAddToOrderFlow(), CompositionRouter (+9 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.16
Nodes (15): usePressAnimation(), HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart, resolveIconColor(), SearchResultRow() (+7 more)

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
Cohesion: 0.13
Nodes (28): IntakeCamera, IntakeCameraHandle, IntakeCameraProps, IntakeCreateIdentityDraft, IntakeCreateSerialSheet, IntakeCreateSerialSheetRef, ACTIVE_STATES, BayFilter (+20 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.10
Nodes (26): smoothEase, staggerDelay(), animationSpeed, borderStyle(), buttonHeight, A11ySlice, designLanguageFromScheme(), defaultEasing (+18 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.15
Nodes (18): styles, TabLayout(), APP_ICON, ensureLiveActivityAppIconUri(), OperationsLiveActivityHost(), OperationsLiveActivity, OperationsLiveActivityProps, assertLiveActivityAppGroup() (+10 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.26
Nodes (11): ComposerVehicleForm, useWorkOrderComposerOptions(), vehiclesInContext(), AutocompleteOption, brandByKey, brands, CatalogBrand, listVehicleMakes() (+3 more)

### Community 68 - "mobilePost"
Cohesion: 0.08
Nodes (36): useAuth(), useAuthActions(), AuthShell(), ForgotPasswordScreen(), isValidEmail(), SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, FormStack() (+28 more)

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.09
Nodes (23): normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanIdleIndicator(), ScanIdleIndicatorProps, ScanLauncherButton(), ScanLauncherButtonProps, ScanLauncherRow() (+15 more)

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.09
Nodes (35): OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent(), ScanUnknownSheetProps, sheetPresentationKey(), useDevMockFallback(), useScanExperience(), classifyScanPayload() (+27 more)

### Community 71 - "mapAuthError"
Cohesion: 0.17
Nodes (16): AutocompleteInputProps, useAutocomplete(), UseAutocompleteArgs, UseAutocompleteReturn, BASE, getNativeInputProps(), NativeProps, resolveAutocompleteType() (+8 more)

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
Cohesion: 0.11
Nodes (23): AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES (+15 more)

### Community 77 - "styles.ts"
Cohesion: 0.09
Nodes (23): NotificationCard, ActivityDateGroup(), ActivityFeedFilters(), ActivityFeedFiltersProps, READ_FILTERS, ActivityNotificationRow, ActivityNotificationRowProps, SwipeActionProps (+15 more)

### Community 78 - "labels.ts"
Cohesion: 0.16
Nodes (13): ScanSearchIcon, SearchIcon, SearchBar(), SearchBarProps, SearchEmptyActionId, SearchEmptyState(), SearchEmptyStateProps, SearchGroupHeader() (+5 more)

### Community 79 - "classify-payload.ts"
Cohesion: 0.13
Nodes (15): catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery(), quickCategories, recentlyViewedEngines (+7 more)

### Community 80 - "profile.ts"
Cohesion: 0.05
Nodes (74): OAuthProvider, AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore() (+66 more)

### Community 81 - "cache-settings-screen.tsx"
Cohesion: 0.17
Nodes (12): AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButton(), AuthOAuthButtonProps, styles, AuthProviderKind (+4 more)

### Community 82 - "modules.ts"
Cohesion: 0.18
Nodes (28): HomeDashboard, useHomeDashboard(), ACTIVE_INTAKE, buildAiInsight(), buildAttentionRows(), buildHomeNow(), buildHomeToday(), buildHomeTrend() (+20 more)

### Community 83 - "location-screen.tsx"
Cohesion: 0.09
Nodes (21): AuthBootLoadingProps, APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON (+13 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.04
Nodes (94): TrendingDownIcon, resolveCurrentTab(), resolveTabFromHref(), TabNavigateTarget, useNavigateTab(), ListGroup(), acTimeline, AcAccountTilesProps (+86 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.08
Nodes (25): OrderWorkflowProgress(), OrderWorkflowProgressProps, computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, isOpenOrderStatus(), getWorkflowStages() (+17 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.25
Nodes (10): ObjectsLayout(), AccountingLayout(), OrdersLayout(), RootNavigator(), RootStack, RootStatusBar(), formSheetScreenOptions(), NavigationPolicy (+2 more)

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.09
Nodes (22): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Dynamic Island (iOS Live Activities), Floating dock, Home (Mission Control) (+14 more)

### Community 88 - "work-order.ts"
Cohesion: 0.10
Nodes (18): CreateInventoryItemScreen(), parseNumber(), CreateInventoryItemInput, useMobileCreateInventoryItem(), useMobileQuickReceive(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust() (+10 more)

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.17
Nodes (24): mobileGet(), mobilePatch(), backfillTeamNotifications(), fetchNotificationInbox(), fetchNotificationPreferences(), InboxResponse, markAllNotificationsRead(), markNotificationState() (+16 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.35
Nodes (9): isSameStackInboxReturn(), notificationInboxHref(), NotificationInboxReturnTo, OpenInboxRouter, openNotificationInbox(), resolveInboxReturnToFromSegments(), resolveInboxReturnToFromTab(), RETURN_TO_KEYS (+1 more)

### Community 92 - "kv.ts"
Cohesion: 0.22
Nodes (7): AnimatedLine, FRONT_WHEEL, HERO_DISPLAY_HEIGHT, HERO_DISPLAY_WIDTH, REAR_WHEEL, SPEED_LINES, WheelProps

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.27
Nodes (15): EMPTY, useAccountingPreferences(), useUserDisplayCurrency(), listenDocument(), normalizeAppDisplayCurrency(), AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings() (+7 more)

### Community 95 - "invite-accept-screen.tsx"
Cohesion: 0.21
Nodes (12): FlashList, OptimizedListProps, useListStaggerDelay(), canCancelJob(), canEditIdentity(), IntakeJobRow(), IntakeJobRowBody(), IntakeJobRowProps (+4 more)

### Community 96 - "location-contents.ts"
Cohesion: 0.13
Nodes (21): getIntakeOutboxSnapshot, subscribeIntakeOutbox, SwitchOrganizationScreen(), HomeHeader(), AccountScreen(), resolveProvider(), useActiveCompanyName(), useEntitlement() (+13 more)

### Community 97 - "create-operation-screen.tsx"
Cohesion: 0.19
Nodes (15): AddToOrderHandlers, MotorActionHandlers, motorActionMessage(), motorActionTitle(), openSearchResult(), SearchRouter, showCatalogActions(), showMotorActions() (+7 more)

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.43
Nodes (6): useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled(), DesignLanguageContext

### Community 100 - "apple-sign-in.ts"
Cohesion: 0.12
Nodes (20): ArrowRightIcon, Loader2Icon, AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AuthEmailPill(), AuthEmailPillProps, useAuthPressSpring() (+12 more)

### Community 101 - "sell-motor-sheet.tsx"
Cohesion: 0.17
Nodes (4): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, TabRouteName

### Community 102 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+5 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.12
Nodes (35): getOutboxPending(), OfflineSessionBanner(), subscribeOutbox(), drainMutationOutboxNow(), enqueueMutation(), getMutationOutboxSnapshot(), listeners, markMutationAttempt() (+27 more)

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
Cohesion: 0.04
Nodes (58): DesignSystemScreen(), IconProps, ChevronRightIcon, CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, fontMap, radiusMap (+50 more)

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.03
Nodes (80): normalizeCode(), VerificationCodeInput(), VerificationCodeInputProps, AnimatedPath, AppLoadingLogo(), AppLoadingLogoProps, AppLoadingLogoStatic(), DrawablePath() (+72 more)

### Community 113 - "advances.ts"
Cohesion: 0.17
Nodes (24): DevSubscriptionPanel(), readDevOffline(), SyncState, base(), DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS, DevScenario (+16 more)

### Community 114 - "team-employee-card.tsx"
Cohesion: 0.04
Nodes (64): useShimmer(), PlusIcon, UserAvatar(), ActionSheetHost(), styles, GlassSheen, styles, Badge() (+56 more)

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
Cohesion: 0.31
Nodes (6): INTAKE_BAY, IntakeRouter, openEngineIntakeBay(), openEngineIntakeSession(), navigationHrefKey(), stackNavigationGuard

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.03
Nodes (81): AlertTriangleIcon, CopyIcon, AuthenticatedLandingScreen(), TabScreenPlaceholder(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize (+73 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.14
Nodes (14): cornerStyle, layoutRhythm, toneStyles(), touchTarget, ringBorder(), createCardStyle(), createIconBadgeStyle(), createInputTextStyle() (+6 more)

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.09
Nodes (25): BannerContent, contentFor(), PurchaseStatusBanner(), PurchaseStatusBannerProps, IncludedRow(), IncludedRowProps, ManageSubscriptionScreen(), UpgradeCallout() (+17 more)

### Community 140 - "use-work-order-composer-options.ts"
Cohesion: 0.28
Nodes (12): inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode(), SearchResultItem, resolveInventoryShelf(), inventoryStatus(), inventoryVehicleLabel(), mapInventoryItemToSearchEngine() (+4 more)

### Community 141 - "use-subscription.ts"
Cohesion: 0.13
Nodes (20): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabPanel(), ComposerTabPanelProps, resolveEntering(), resolveExiting(), CompositionAddCard() (+12 more)

### Community 142 - "expo-blur"
Cohesion: 0.09
Nodes (31): AccountingScreen(), AcAccountTiles, AcAccountingEmptyState(), AcBalanceCard, AcMotorSaleDocumentsSheet, AcMotorSaleDocumentsSheetRef, AcOperationsList(), AcTabBar() (+23 more)

### Community 146 - "activity-notification-row.tsx"
Cohesion: 0.26
Nodes (7): SearchFilters(), SearchFiltersProps, searchFilters, parseFilter(), SearchFilterId, SearchFilterOption, SearchResultGroup

### Community 148 - "expo-haptics"
Cohesion: 0.33
Nodes (3): WORK_OS_DAY_FIXTURES, WORK_OS_INTAKE_FIXTURES, WorkOsIntakeFixtureJob

### Community 150 - "orders-filters.tsx"
Cohesion: 0.50
Nodes (6): downloadToCache(), shareEnginePhoto(), buildEnginePhotoFilename(), PHOTO_MIME_BY_EXTENSION, PHOTO_UTI_BY_EXTENSION, photoExtension()

### Community 152 - "expo-notifications"
Cohesion: 0.26
Nodes (12): classifySyncError(), codeFromStatus(), describeSyncError(), ErrorLike, isRetryableSyncError(), looksOffline(), mayDeleteLocalFile(), RETRYABLE (+4 more)

### Community 155 - "expo-sharing"
Cohesion: 0.24
Nodes (10): SyncErrorCode, SyncJobStatus, needsPerson(), plural(), resolveSyncSummary(), retryPhrase(), SyncCounts, SyncStatus (+2 more)

### Community 156 - "inventory.ts"
Cohesion: 0.04
Nodes (81): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, EMPTY_JOB_DETAIL (+73 more)

### Community 157 - "expo-status-bar"
Cohesion: 0.33
Nodes (7): useNotificationInboxRealtime(), notifyApiError(), notifyNetworkStatus(), NotificationProvider(), NotificationProviderProps, subscribeInboxRealtime(), NotificationService

### Community 159 - "@autocore/billing"
Cohesion: 0.50
Nodes (3): StickyActionBar, StickyActionBarProps, workOsElevation

### Community 161 - "@gorhom/bottom-sheet"
Cohesion: 0.33
Nodes (5): PAYROLL_STATUS_LABELS, PAYROLL_RATE_TYPES, PAYROLL_TRANSACTION_STATUSES, PayrollRateType, PayrollTransactionStatus

### Community 167 - "@react-native-async-storage/async-storage"
Cohesion: 0.28
Nodes (7): ListRow, ProfileDangerZone(), ProfileDangerZoneProps, ProfileNavCard(), ProfileNavCardProps, ProfileSettingsGroup(), ProfileSettingsGroupProps

### Community 169 - "@react-native-community/netinfo"
Cohesion: 0.30
Nodes (10): isJobRunnable(), nextRetryAt(), nextWakeUpAt(), reconcileOnLaunch(), resolveFailureTransition(), RETRY_DELAYS_MS, retryDelayMs(), SchedulableJob (+2 more)

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.23
Nodes (17): WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, SubscriptionStatusCard(), SubscriptionStatusCardProps, TrialCountdown(), TrialCountdownProps, daysUntil(), formatDaysRemaining() (+9 more)

### Community 178 - "tailwind-merge"
Cohesion: 0.11
Nodes (33): AppProviders(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, clearScheduledQueryDataApplies(), clearRealtimeSnapshots(), clearRealtimeSubscriptions(), clearRecentQueriesCache(), getRecentQueriesCache() (+25 more)

### Community 199 - "priority-router.ts"
Cohesion: 0.04
Nodes (51): AuthDivider(), ScreenActionFooter(), ScreenActionFooterProps, Loading(), LoadingProps, Navbar(), NavbarProps, NavItem (+43 more)

### Community 202 - "auth-store.ts"
Cohesion: 0.22
Nodes (12): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES (+4 more)

### Community 205 - "goBackOrReplace"
Cohesion: 0.43
Nodes (4): ActionRoute(), ActionSheetState, useActionSheetStore, presentActionSheet()

### Community 206 - "useEngineIntakeOutbox"
Cohesion: 0.29
Nodes (6): STEP_SUBTITLES, STEPS, WizardStepHeader(), WizardStepHeaderProps, WizardStepTrail(), WizardStepTrailProps

### Community 209 - "useScreenEnter"
Cohesion: 0.16
Nodes (19): ScanDocumentUploadResult, uploadScanDocument(), appendLocalFile(), createLocalFileFormData(), formatRelativeTime(), loadRecentScans(), mapStored(), mergeRecents() (+11 more)

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.11
Nodes (31): FilterIcon, IosLiftMenuItem, OrdersLoadingState(), OrdersLiftContext, OrdersLiftContextValue, OrdersLiftProvider(), OrdersLiftSession, useOrdersLift() (+23 more)

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.06
Nodes (36): PROFILE_ROUTES, profileHubRouteHref(), ProfileScreen(), ProfileDangerAction, ProfileHubData, ProfileHubRouteId, ProfilePreferenceRow, ProfileQuickAction (+28 more)

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.03
Nodes (90): ArrowLeftIcon, CameraIcon, FlashlightIcon, MapPinIcon, XIcon, getOAuthButtonTheme(), OAuthButtonTheme, AuthBackdrop() (+82 more)

### Community 219 - "orders-mail-list.ios.tsx"
Cohesion: 0.04
Nodes (97): AuthEmailChip(), AuthEmailChipProps, AuthHeroCar(), AuthHeroShell(), AuthHeroShellProps, HeroBackdrop(), AuthEnterOptions, useAuthEnter() (+89 more)

### Community 224 - "relocate-pending-store.ts"
Cohesion: 0.14
Nodes (12): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, kindLabel(), LocationContentsResponse (+4 more)

### Community 225 - "useScreenEnter"
Cohesion: 0.38
Nodes (5): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter()

### Community 227 - "useRbacPolicy"
Cohesion: 0.15
Nodes (15): Can(), CanProps, RequirePermission(), RequirePermissionProps, OverviewScreen(), buildWeekBars(), formatMoney(), MyEarningsScreen() (+7 more)

### Community 228 - "intake-evidence-checklist.tsx"
Cohesion: 0.43
Nodes (5): IntakeEvidenceChecklist(), Props, evidenceGuidance(), FACET_LABELS, missingEvidenceLabels()

### Community 229 - "flash-list.tsx"
Cohesion: 0.33
Nodes (4): profileSpring, profileTimeline, profileLayout, screenMotion

### Community 230 - "goBackOrReplace"
Cohesion: 0.53
Nodes (4): WorkScreen(), useShellModel(), useWorkspaceContextStore, WorkspaceContextState

### Community 231 - "company-settings-screen.tsx"
Cohesion: 0.53
Nodes (5): useFadeIn(), usePageEnter(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps

### Community 233 - "matchesSearchQuery"
Cohesion: 0.67
Nodes (5): compactAlphanumeric(), digitsOnly(), matchesSearchQuery(), normalizeSearchQuery(), tokenMatch()

## Knowledge Gaps
- **1298 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1293 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **67 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `diagnostics-settings-screen.tsx` to `authenticated-landing-screen.tsx`, `team-screen.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `index.ts`, `index.ts`, `use-subscription.ts`, `app-tab-bar.tsx`, `order-detail-screen.tsx`, `auth-provider.tsx`, `firestore-timestamp.ts`, `notifications-settings-screen.tsx`, `scan-screen.tsx`, `paywall.tsx`, `subscription-registry.ts`, `mc-featured-insight.tsx`, `haptics`, `@react-native-async-storage/async-storage`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `empty-state.tsx`, `push-channel.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `login-screen.tsx`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `mobilePost`, `ac-payroll-list.tsx`, `apple-sign-in.ts`, `priority-router.ts`, `input-field.tsx`, `auth-store.ts`, `goBackOrReplace`, `styles.ts`, `useEngineIntakeOutbox`, `labels.ts`, `cache-settings-screen.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `ScanDebounce`, `app-loading-screen.tsx`, `tab-transition-context.tsx`, `work-order.ts`, `in-app-banner-provider.tsx`, `orders-mail-list.ios.tsx`, `kv.ts`, `invite-accept-screen.tsx`, `location-contents.ts`, `relocate-pending-store.ts`, `useRbacPolicy`, `apple-sign-in.ts`, `sell-motor-sheet.tsx`, `intake-evidence-checklist.tsx`, `goBackOrReplace`, `useFloatingTabBarInset`, `copy-button.tsx`, `EditProfileScreen`, `use-search-idle-data.ts`, `advances.ts`, `team-employee-card.tsx`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `Text` connect `use-search-idle-data.ts` to `authenticated-landing-screen.tsx`, `create-operation-screen.tsx`, `team-screen.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `index.ts`, `use-subscription.ts`, `expo-blur`, `order-detail-screen.tsx`, `app-tab-bar.tsx`, `auth-provider.tsx`, `activity-notification-row.tsx`, `firestore-timestamp.ts`, `notifications-settings-screen.tsx`, `scan-screen.tsx`, `currency-screen.tsx`, `paywall.tsx`, `subscription-registry.ts`, `mc-featured-insight.tsx`, `haptics`, `index.ts`, `scan-product-sheet.tsx`, `@react-native-async-storage/async-storage`, `order-composition-step.tsx`, `edit-profile-screen.tsx`, `team-invite-card.tsx`, `empty-state.tsx`, `push-channel.ts`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `login-screen.tsx`, `setup-wizard-screen.tsx`, `mobilePost`, `ac-payroll-list.tsx`, `apple-sign-in.ts`, `priority-router.ts`, `input-field.tsx`, `auth-store.ts`, `animated-tab-screen.tsx`, `styles.ts`, `useEngineIntakeOutbox`, `labels.ts`, `cache-settings-screen.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `orders-mail-list.ios.tsx`, `invite-accept-screen.tsx`, `relocate-pending-store.ts`, `useRbacPolicy`, `apple-sign-in.ts`, `intake-evidence-checklist.tsx`, `diagnostics-settings-screen.tsx`, `advances.ts`, `team-employee-card.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `useSession()` connect `location-contents.ts` to `team-screen.tsx`, `profile-danger-zone.tsx`, `create-order-screen.tsx`, `index.ts`, `index.ts`, `app-tab-bar.tsx`, `expo-blur`, `useTheme`, `auth-provider.tsx`, `activity-notification-row.tsx`, `firestore-timestamp.ts`, `currency-screen.tsx`, `inventory.ts`, `expo-status-bar`, `auth-gate.tsx`, `use-scan-experience.ts`, `index.ts`, `scan-product-sheet.tsx`, `order-composition-step.tsx`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `push-channel.ts`, `autocomplete-provider.tsx`, `document-file-actions.ts`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `mobilePost`, `apple-sign-in.ts`, `priority-router.ts`, `auth-store.ts`, `styles.ts`, `modules.ts`, `ac-payroll-list.tsx`, `app-loading-screen.tsx`, `in-app-banner-provider.tsx`, `tab-transition-context.tsx`, `work-order.ts`, `orders-mail-list.ios.tsx`, `relocate-pending-store.ts`, `useRbacPolicy`, `goBackOrReplace`, `advances.ts`, `team-employee-card.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1298 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06903622693096377 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07532467532467532 - nodes in this community are weakly interconnected._