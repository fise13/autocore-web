# Graph Report - autocore-mobile  (2026-07-17)

## Corpus Check
- 755 files · ~215,619 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3520 nodes · 11397 edges · 196 communities (136 shown, 60 thin omitted)
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
- `useAuthActionsController()` --indirect_call--> `signInWithAppleNative()`  [INFERRED]
  authentication/auth-provider.tsx → services/auth/apple-sign-in.ts
- `RootStatusBar()` --calls--> `useTheme()`  [EXTRACTED]
  components/navigation/root-navigator.tsx → hooks/use-theme.tsx
- `TabScreenPlaceholder()` --calls--> `useTheme()`  [EXTRACTED]
  components/navigation/tab-screen-placeholder.tsx → hooks/use-theme.tsx
- `AvatarFallback()` --calls--> `useTheme()`  [EXTRACTED]
  components/ui/avatar.tsx → hooks/use-theme.tsx
- `TileSkeleton()` --calls--> `useTheme()`  [EXTRACTED]
  features/accounting/components/ac-accounting-skeleton.tsx → hooks/use-theme.tsx

## Import Cycles
- 1-file cycle: `lib/vehicles/vehicle-catalog.ts -> lib/vehicles/vehicle-catalog.ts`
- 4-file cycle: `components/ui/index.ts -> components/ui/section-header.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/divider.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/divider.tsx`
- 4-file cycle: `components/ui/index.ts -> components/ui/segmented-control.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/index.ts -> components/ui/list-group.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `components/ui/index.ts -> components/ui/tabs.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts`
- 4-file cycle: `assets/icons/create-icon.tsx -> hooks/index.ts -> hooks/use-mission-control-data.ts -> assets/icons/index.ts -> assets/icons/create-icon.tsx`
- 4-file cycle: `components/ui/action-icon-button.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/action-icon-button.tsx`
- 4-file cycle: `components/ui/alert.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/alert.tsx`
- 4-file cycle: `components/ui/app-loading-screen.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/app-loading-screen.tsx`
- 4-file cycle: `components/ui/avatar.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/avatar.tsx`
- 4-file cycle: `components/ui/badge.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/badge.tsx`
- 4-file cycle: `components/ui/bottom-bar.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/bottom-bar.tsx`
- 4-file cycle: `components/ui/bottom-sheet.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/bottom-sheet.tsx`
- 4-file cycle: `components/ui/button.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/button.tsx`
- 4-file cycle: `components/ui/card.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/card.tsx`
- 4-file cycle: `components/ui/checkbox.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/checkbox.tsx`
- 4-file cycle: `components/ui/chip.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/chip.tsx`
- 4-file cycle: `components/ui/context-menu.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/context-menu.tsx`
- 4-file cycle: `components/ui/copy-button.tsx -> hooks/index.ts -> hooks/use-optimistic-stock-adjust.ts -> components/ui/index.ts -> components/ui/copy-button.tsx`

## Communities (196 total, 60 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.06
Nodes (64): AutocompleteOverlay, AutocompleteOverlayProps, styles, AutocompletePanel(), AutocompleteRow, AutocompleteRowProps, styles, AutocompleteInputProps (+56 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.05
Nodes (57): AccountingScreen(), AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, CreateOperationScreen(), readPreset(), newOperationHref(), NewOperationPreset (+49 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.05
Nodes (52): FlashList, OrderOpenOverlay(), OrderTransitionContext, OrderTransitionContextValue, OrderTransitionProvider(), OverlayProps, SourceLayout, useOrderTransition() (+44 more)

### Community 3 - "text.tsx"
Cohesion: 0.04
Nodes (50): useCardLift(), CheckIcon, AuthDivider(), CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, sizeMap, AnalyticsCard (+42 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.05
Nodes (54): MailIcon, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS, TeamEmployeeCard, styles, TeamInviteCardProps (+46 more)

### Community 5 - "motion.ts"
Cohesion: 0.04
Nodes (51): ProgressProps, profileSpring, profileTimeline, DeviceClass, duration, enterValues, presets, smoothEase (+43 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.06
Nodes (51): CreateOrderScreen(), StepIndicator(), STEPS, useOrderCompositionForm(), UseOrderCompositionFormOptions, resolveInventoryUnitPrice(), compositionGrandTotal(), isSellOnlyComposition() (+43 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.08
Nodes (58): AccountingAttentionAction, AccountingQuickActionId, AttentionTone, CashFlowPeriod, InvoiceStatus, TransactionStatus, TrendTone, AnimatedPolyline (+50 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.06
Nodes (45): PrinterIcon, Share2Icon, AcAccountingEmptyState(), AcAccountingSkeleton(), TileSkeleton(), AcAdvancesOverview(), AcAdvancesOverviewProps, AdvanceRow() (+37 more)

### Community 9 - "index.ts"
Cohesion: 0.07
Nodes (51): ActivityIcon, AlertTriangleIcon, ArrowRightIcon, ArrowUpRightIcon, BellIcon, CarIcon, CheckCircle2Icon, ChevronDownIcon (+43 more)

### Community 10 - "index.ts"
Cohesion: 0.11
Nodes (37): useAccountingData(), UseAccountingDataResult, clientRepository, useClientsRealtime(), useCompanyAppConfig(), CommonControlledStateProps, useControlledState(), useDocumentGenerationJobsRealtime() (+29 more)

### Community 11 - "index.ts"
Cohesion: 0.07
Nodes (44): DesignSystemScreen(), NotFoundScreen(), MapPinIcon, ActivityCard, ActivityCardProps, AnalyticsCardProps, BusinessCardShell(), BusinessCardShellProps (+36 more)

### Community 12 - "useSession"
Cohesion: 0.08
Nodes (46): AnimatedTabScreen, Screen(), OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, SellMotorSheet, SellMotorSheetRef, inventoryCardSubtitle() (+38 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.06
Nodes (41): MemoTabBar, TAB_SCREEN_OPTIONS, BarChart3Icon, GripVerticalIcon, LayoutGridIcon, AppTabBar, AppTabBarItem, AppTabBarProps (+33 more)

### Community 14 - "index.ts"
Cohesion: 0.06
Nodes (39): usePressAnimation(), CopyIcon, Loader2Icon, TabScreenPlaceholder(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize (+31 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.07
Nodes (40): PhoneIcon, useOrderDetailContentEnter(), useOrderDetailHeroEnter(), OrderStatusBadge(), OrderStatusBadgeProps, toneToColor(), indexCenter(), OrderWorkflowProgress() (+32 more)

### Community 16 - "useTheme"
Cohesion: 0.05
Nodes (39): AuthBootLoadingProps, AuthEmailChip(), AuthEmailChipProps, InviteFormNotice(), InviteFormNoticeProps, SubscriptionRequiredScreen(), SubscriptionRequiredScreenProps, AnimatedPath (+31 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.09
Nodes (46): AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace() (+38 more)

### Community 18 - "Text"
Cohesion: 0.07
Nodes (30): Button, SettingsInset(), SettingsInsetProps, SettingsSectionCard(), SettingsSectionCardProps, styles, Text, OrderClaimSection() (+22 more)

### Community 19 - "radius"
Cohesion: 0.09
Nodes (37): acTimeline, AcAccountTiles, AcAccountTilesProps, AccountTile(), TileDef, AcAttention(), AcAttentionProps, AttentionCard (+29 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.08
Nodes (31): notifyFirestoreSnapshotError(), toDateFromFirestore(), documentGenerationJobRepository, mapJob(), FinancialOperationRepository, FinancialOperationsFilters, mapOperation(), readAmount() (+23 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.10
Nodes (42): setJson(), MobileApiError, fetchNotificationInbox(), markAllNotificationsRead(), markNotificationState(), updateInboxNotificationState(), applyInboxPayload(), archiveServerNotification() (+34 more)

### Community 22 - "getJson"
Cohesion: 0.11
Nodes (32): AppProviders(), RootNavigator(), RootStack, RootStatusBar(), clearSubscriptionCaches(), clearSubscriptionRegistry(), preloadSessionSnapshots(), clearRecentQueriesCache() (+24 more)

### Community 23 - "types.ts"
Cohesion: 0.07
Nodes (35): NotificationCard, ActivityDateGroup(), ActivityDateGroupProps, ActivityNotificationRow, ActivityNotificationRowProps, ActivityFeedFilters(), ActivityFeedFiltersProps, CATEGORY_OPTIONS (+27 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.09
Nodes (30): CATEGORY_HINTS, EXTENDED_CATEGORY_HINTS, NotificationsSettingsScreen(), useNotificationInbox(), useNotificationService(), stripUndefinedDeep(), mergeNotificationPreferences(), backfillTeamNotifications() (+22 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.06
Nodes (29): BARCODE_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, styles, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanConfirmFlash() (+21 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.08
Nodes (29): ScreenEnterConfig, useFadeIn(), usePageEnter(), useScaleEnter(), useShimmer(), useStaggerFadeIn(), AnimatedContainer(), AnimatedContainerProps (+21 more)

### Community 27 - "useAuth"
Cohesion: 0.13
Nodes (25): useAuth(), useAuthActions(), CompanyJourneyScreen(), CompanySwitcherSheet(), CompanySwitcherSheetProps, styles, OrganizationMembershipRow, WorkspaceCompaniesSection() (+17 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.13
Nodes (28): CurrencyScreen(), styles, useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), useUserDisplayCurrency(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS (+20 more)

### Community 29 - "subscription-registry.ts"
Cohesion: 0.09
Nodes (34): noop(), CachedSubscription, deserializeSubscription(), readSubscriptionCache(), readSubscriptionCacheSync(), SerializedSubscription, serializeSubscription(), writeSubscriptionCache() (+26 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.11
Nodes (30): useSessionBootstrapReady(), reviveDatesDeep(), shouldReviveDateField(), queryClient, sessionBootstrapQueryKeys(), CachedRealtimeSnapshot, clearRealtimeSnapshots(), isFresh() (+22 more)

### Community 31 - "types.ts"
Cohesion: 0.09
Nodes (26): ModulesEditorList(), ModulesEditorListProps, ACCOUNTING_DEMO, DESKTOP_DEMO, PERMISSION_GROUPS, WORKSPACE_DEMO, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS (+18 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.13
Nodes (24): AuthGate(), MemoAppTree, AuthLoadingScreen(), useAuthHasAccess(), useAuthReady(), AuthRedirectEffect(), WorkspaceAccessScreen(), AUTH_JOURNEY_STEP_LABELS (+16 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.10
Nodes (27): AnimatedTabScreenProps, isTabRouteName(), resolveTabRouteName(), TAB_ORDER, TabRouteName, TabTransitionContext, TabTransitionContextValue, TabTransitionProvider() (+19 more)

### Community 34 - "haptics"
Cohesion: 0.07
Nodes (25): SwitchProps, AttentionRow(), McAttentionBanner, McAttentionBannerProps, InsightRow, McInsights, McInsightsProps, McTodayOverview (+17 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.11
Nodes (29): OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent(), ScanUnknownSheetProps, sheetPresentationKey(), useDevMockFallback(), useScanExperience(), classifyScanPayload() (+21 more)

### Community 36 - "index.ts"
Cohesion: 0.10
Nodes (29): resolveInviteHref(), buildImportDeepLink(), buildOrderDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType (+21 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.09
Nodes (27): ScanCandidatesSheet, ScanCandidatesSheetProps, ActionButton(), ScanProductSheet, ScanProductSheetProps, StatCell(), StatDivider(), ScanProductThumb() (+19 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.14
Nodes (25): normalizeCompanyId(), resolveCompanyIdsForSync(), getFirebaseDb(), updateUserAccountProfile(), BarcodeMapping, barcodeMappingRepository, createBarcodeMappingRepository(), hydrateMembershipNames() (+17 more)

### Community 39 - "rhythm"
Cohesion: 0.10
Nodes (15): AuthBackdrop(), AuthShell(), AuthShellProps, ForgotPasswordScreen(), isValidEmail(), normalizeCode(), VerificationCodeInput(), VerificationCodeInputProps (+7 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.11
Nodes (23): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBarProps, ComposerTabOption, TabIcon, ComposerTabPanel(), ComposerTabPanelProps (+15 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.12
Nodes (22): ScanDocumentSheet, ScanDocumentSheetProps, classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem (+14 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.11
Nodes (18): ArrowLeftIcon, Dialog(), DialogProps, IconButton, IconButtonProps, sizes, ScreenProps, ScreenScrollProps (+10 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.16
Nodes (22): getOAuthButtonTheme(), OAuthButtonTheme, resolveScheme(), ThemeContext, ThemeContextValue, ThemeProvider(), ThemeProviderProps, colors (+14 more)

### Community 44 - "index.ts"
Cohesion: 0.14
Nodes (18): TrendingDownIcon, AnimatedTextInput, formatCounterWorklet(), formatGroupedInteger(), McAnimatedCounter(), McAnimatedCounterProps, McCounterFormat, mcDuration (+10 more)

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.11
Nodes (18): ClipboardListIcon, Can(), CanProps, RequirePermission(), RequirePermissionProps, ScreenScroll(), MissionControlScreen(), MissionControlWeekBar (+10 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.09
Nodes (19): IconProps, ButtonProps, ButtonSize, ButtonVariant, ContextMenu(), ContextMenuItem, ContextMenuProps, EmptyStateAction (+11 more)

### Community 47 - "inventory.ts"
Cohesion: 0.12
Nodes (19): CreateInventoryItemInput, useMobileCreateInventoryItem(), useMobileQuickReceive(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), mobileApi, sendEmployeeInviteEmail() (+11 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.08
Nodes (25): @autocore/rbac, clsx, expo-camera, expo-font, expo-linking, expo-web-browser, dependencies, @autocore/rbac (+17 more)

### Community 50 - "index.ts"
Cohesion: 0.10
Nodes (14): NOTIFICATION_ROW_DIVIDER_INSET, EmptyState(), MetaRow(), MetaRowProps, Skeleton(), SkeletonProps, AcAccountingEmptyStateProps, NotificationInboxSkeleton() (+6 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.11
Nodes (21): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, enqueueMotorSoldEffects() (+13 more)

### Community 52 - "types.ts"
Cohesion: 0.12
Nodes (17): AnimatedRect, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanIdleIndicator(), ScanIdleIndicatorProps, ScanLauncherButton(), ScanLauncherButtonProps (+9 more)

### Community 53 - "push-channel.ts"
Cohesion: 0.14
Nodes (23): setString(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken(), fetchExpoPushTokenViaExperienceId(), ForegroundPushHandler (+15 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.10
Nodes (15): ListGroup(), ListGroupProps, ListRow, ListRowProps, styles, Surface(), SurfaceProps, OrganizationSwitchButtonProps (+7 more)

### Community 55 - "toneBackground"
Cohesion: 0.15
Nodes (16): ScanSearchIcon, McWeekBar(), ComposerTabBar(), SectionCard(), SummaryMetric(), TeamSummaryCardProps, SearchBar(), SearchBarProps (+8 more)

### Community 56 - "design-language-context.ts"
Cohesion: 0.11
Nodes (21): animationSpeed, buttonHeight, A11ySlice, DesignLanguageContext, designLanguageFromScheme(), defaultEasing, glassStyle, iconWeight (+13 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.22
Nodes (19): mapResolveResultToScanResult(), compactBarcode(), compactCode(), extractGs1Primary(), normalizeScanPayload(), scanPayloadKey(), classifyPayloadOutcome(), isWeakCameraAutoAccept() (+11 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.15
Nodes (15): HomeRoute(), CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), getStartupMarks(), getStartupSummary(), logStartupTable(), MarkEntry (+7 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.21
Nodes (18): OrderDocumentsSection(), downloadPdfFromApi(), downloadRemotePdf(), ensurePdfFile(), ensureWarrantyPdfFile(), getAuthHeaders(), printWarrantyDocument(), printWorkOrderDocument() (+10 more)

### Community 60 - "use-profile-snapshot.ts"
Cohesion: 0.15
Nodes (18): PROFILE_ROUTES, NotificationsScreen(), ProfileDangerAction, ProfileHubData, ProfileHubRouteId, ProfilePreferenceRow, ProfileQuickAction, ProfileRouteId (+10 more)

### Community 61 - "ScanService"
Cohesion: 0.19
Nodes (8): acceptsCameraInput(), activeResultForOutcome(), isInstantOutcome(), ScanService, sheetKindForOutcome(), ScanDetection, ScanOutcome, ScanServiceSnapshot

### Community 62 - "profile-screen.tsx"
Cohesion: 0.15
Nodes (11): OrganizationSwitchButton(), ProfileHeader(), ProfileHeroCard(), profileHubRouteHref(), ProfileHubRow, ProfileScreen(), useReleaseStackNavigationOnFocus(), guardedPush() (+3 more)

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
Cohesion: 0.19
Nodes (14): isValidEmail(), LoginScreen(), readInviteCompanyName(), readInviteEmail(), readInviteToken(), storePendingInvite(), getPasswordStrengthState(), PasswordRequirement (+6 more)

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.16
Nodes (14): XIcon, InAppBannerProvider(), layoutTransition, styles, NotificationBellButton(), NotificationBellButtonProps, groupNotificationsByDate(), NotificationInboxScreen() (+6 more)

### Community 68 - "document-import-screen.tsx"
Cohesion: 0.14
Nodes (16): FlashlightIcon, DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus (+8 more)

### Community 69 - "search-results.tsx"
Cohesion: 0.19
Nodes (16): actions, SearchEmptyActionId, SearchEmptyState(), SearchEmptyStateProps, pluralResults(), SearchResults(), SearchResultsProps, AddToOrderHandlers (+8 more)

### Community 70 - "rbac.ts"
Cohesion: 0.22
Nodes (12): HydrationPayload, SessionHydrationPayload, SessionBootstrapPayload, AuthStore, initialState, AuthSnapshot, AuthStatus, CompanyAppConfig (+4 more)

### Community 71 - "mapAuthError"
Cohesion: 0.15
Nodes (10): ProfileNameJourneyScreen(), VerifyEmailJourneyScreen(), JoinCompanyScreen(), parseInviteInput(), acceptInviteByCode(), joinCompanyWithInviteCode(), AuthErrorCode, getAuthErrorCode() (+2 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.27
Nodes (12): InputField, InputFieldProps, InputFieldTone, InputProps, SearchInputProps, TextArea, TextAreaProps, createInputTextStyle() (+4 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "mobilePost"
Cohesion: 0.18
Nodes (16): OrgDangerZone(), ScanResolveInput, useMobileScanDisambiguate(), useMobileScanFeedback(), useMobileScanResolve(), activateCompanyPro(), BillingInterval, startCompanyTrial() (+8 more)

### Community 75 - "useSearchEnter"
Cohesion: 0.18
Nodes (13): searchSpring, searchTimeline, useSearchEnter(), SearchGroupHeader(), SearchGroupHeaderProps, SearchHeader(), SearchHeaderProps, searchLayout (+5 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.16
Nodes (13): SearchFilters(), SearchFiltersProps, AnimatedSection(), CATEGORY_ICONS, SearchIdle(), SearchIdleProps, searchFilters, QuickCategory (+5 more)

### Community 77 - "styles.ts"
Cohesion: 0.17
Nodes (15): withAlpha(), borderStyle(), cornerStyle, defaultShadow(), toneStyles(), touchTarget, createCardStyle(), createIconBadgeStyle() (+7 more)

### Community 78 - "appearance-settings-screen.tsx"
Cohesion: 0.14
Nodes (12): Switch(), ProfileAnimatedSectionProps, ProfileSegmentedControl(), ProfileSegmentedControlProps, SettingsChip(), SettingsChipProps, SettingsToggleRow(), SettingsToggleRowProps (+4 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.24
Nodes (11): TeamProGate(), TeamProGateProps, STATUS_LABELS, SubscriptionScreen(), WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, getWebAppUrl(), formatNextBillingDate() (+3 more)

### Community 80 - "profile.ts"
Cohesion: 0.22
Nodes (17): ensureFirestoreAuthReady(), buildFallbackProfile(), CompanyDocShape, ensureUserDocument(), hydrateEffectiveProfile(), loadFastSessionBootstrap(), loadFastUserProfile(), loadMemberships() (+9 more)

### Community 81 - "document-import.ts"
Cohesion: 0.18
Nodes (11): DocumentImportScreen(), appendLocalFile(), createLocalFileFormData(), AvatarUploadResult, uploadUserAvatar(), DocumentImportJobStatus, DocumentImportUploadResult, getDocumentImportStatus() (+3 more)

### Community 82 - "useFloatingTabBarInset"
Cohesion: 0.22
Nodes (8): ScreenActionFooter(), ScreenActionFooterProps, ScanScreen(), useFloatingTabBarInset(), useModalBottomSheet(), getFloatingTabBarOffset(), getScreenActionScrollInset(), useRegisterAutocompleteChromeInset()

### Community 83 - "use-mission-control-data.ts"
Cohesion: 0.23
Nodes (14): BoxIcon, PlusIcon, resolveMissionControlRevenue(), formatActivityTime(), buildWeekBars(), closedRevenueForDay(), isSameDay(), orderRevenue() (+6 more)

### Community 84 - "mock-search-catalog.ts"
Cohesion: 0.15
Nodes (13): catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter(), matchesQuery(), quickCategories, recentlyViewedEngines (+5 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.23
Nodes (11): DocumentAction, OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), resolveApplicableDocumentSlugs(), resolveDocumentsForOrderCompleted(), resolveDocumentsForOrderCreated(), DOCUMENT_BY_SLUG (+3 more)

### Community 86 - "ScanDebounce"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.20
Nodes (9): SettingsLinkRow, SettingsLinkRowProps, styles, BetaBadge(), VersionSettingsScreen(), formatPlatformPhone(), getPlatformContacts(), PlatformContacts (+1 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.25
Nodes (13): OAuthProvider, isAppleSignInCancellation(), accountUsesPassword(), deleteAccountForCurrentUser(), DeleteAccountInput, isCancelled(), reauthenticateForDeletion(), deleteCurrentAuthUser() (+5 more)

### Community 89 - "google-sign-in-button.tsx"
Cohesion: 0.34
Nodes (10): ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), canUseNativeGoogleSignIn(), configureNativeGoogleSignIn() (+2 more)

### Community 90 - "index.ts"
Cohesion: 0.23
Nodes (9): CompanyEmployeeRow, useCompanyEmployees(), touchLastActive(), usePresenceHeartbeat(), useUserPhotoUrl(), sanitizeUserPhotoUrl(), firebaseConfig, getFirebaseApp() (+1 more)

### Community 91 - "auth-oauth-button.tsx"
Cohesion: 0.19
Nodes (10): AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AppleIcon(), BrandIconProps, GoogleIcon(), AUTH_BUTTON_HEIGHT, AuthOAuthButton() (+2 more)

### Community 92 - "form"
Cohesion: 0.31
Nodes (8): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, form

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "search-result-row.tsx"
Cohesion: 0.23
Nodes (11): HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart, resolveIconColor(), SearchResultRow(), SearchResultRowProps (+3 more)

### Community 95 - "mobile-client.ts"
Cohesion: 0.42
Nodes (12): getApiBaseUrl(), getBearerToken(), humanizeApiErrorBody(), mobileFetch(), mobileFetchBlob(), mobileGet(), mobilePatch(), mobilePostFlexible() (+4 more)

### Community 96 - "location-screen.tsx"
Cohesion: 0.27
Nodes (6): kindLabel(), LocationContentsResponse, LocationScreen(), StatPill(), buildLocationEntityLink(), fetchLocationContentsFromFirestore()

### Community 97 - "team-employee-card.tsx"
Cohesion: 0.20
Nodes (9): AuthProviderKind, badgeSize, monogramFontSize, UserAvatar(), UserAvatarProps, UserAvatarSize, Dropdown(), ProfileHeroCardProps (+1 more)

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "notification-provider.tsx"
Cohesion: 0.26
Nodes (9): useNotificationInboxRealtime(), NotificationProvider(), NotificationProviderProps, fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord(), markAllInboxNotificationsRead() (+1 more)

### Community 100 - "scan-glass-panel.tsx"
Cohesion: 0.18
Nodes (9): ClockIcon, ImagesIcon, SearchIcon, PhotoGrid, PhotoGridProps, PanelItem(), ScanGlassPanel(), ScanGlassPanelProps (+1 more)

### Community 101 - "resolve-active-company-name.ts"
Cohesion: 0.33
Nodes (7): AuthenticatedLandingScreen(), useActiveCompanyName(), useCompanyProfile(), CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), pickCompanyLabel()

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+3 more)

### Community 103 - "index.ts"
Cohesion: 0.29
Nodes (6): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter(), SearchEnterConfig

### Community 104 - "invite-accept-screen.tsx"
Cohesion: 0.31
Nodes (7): InviteAcceptScreen(), InviteAcceptScreenProps, InvitePreviewCard(), clearPendingInvite(), acceptInvite(), declineInvite(), fetchInvitePreview()

### Community 105 - "use-add-to-order-flow.ts"
Cohesion: 0.49
Nodes (8): PendingAdd, useAddToOrderFlow(), CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart(), navigateOrderEdit()

### Community 106 - "search-engine-card.tsx"
Cohesion: 0.31
Nodes (8): hasShelfValue(), isEngine(), SearchEngineCard(), SearchEngineCardProps, formatVin(), statusLabel, statusVariant, InventoryStatus

### Community 107 - "should-hide-tab-bar.ts"
Cohesion: 0.33
Nodes (9): getDeepestActiveRoute(), isModalOverlayPath(), isModalOverlayRoute(), isNestedTabStackActive(), shouldHideTabBar(), shouldHideTabBarFromNavState(), TAB_BAR_VISIBLE_NESTED_ROUTES, TAB_ROOTS (+1 more)

### Community 108 - "scan-move-sheet.tsx"
Cohesion: 0.28
Nodes (7): ScanMoveSheet, ScanMoveSheetProps, ScanMoveTarget, MobileAssignAssetResult, MobileRelocateResult, MobileWarehouseLocation, useMobileWarehouseLocations()

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
Nodes (5): Sidebar(), SidebarItem, SidebarProps, SidebarSection, isTablet()

### Community 113 - "useAccessibility"
Cohesion: 0.60
Nodes (5): useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled()

### Community 114 - "recent-scans.ts"
Cohesion: 0.53
Nodes (5): formatRelativeTime(), loadRecentScans(), mapStored(), rememberRecentScan(), StoredRecentScan

### Community 115 - "metro.config.js"
Cohesion: 0.40
Nodes (4): config, { getDefaultConfig }, path, { withNativeWind }

### Community 116 - "invite-code.ts"
Cohesion: 0.83
Nodes (3): generateInviteCode(), generateInviteToken(), pickFromAlphabet()

### Community 117 - "with-ios-universal-links.js"
Cohesion: 0.67
Nodes (3): isUniversalLinksEnabled(), { withEntitlementsPlist }, withIosUniversalLinks()

## Knowledge Gaps
- **857 isolated node(s):** `ScreenEnterConfig`, `withGoogleModularHeaders`, `withGoogleIosUrlScheme`, `withOptionalAppleSignIn`, `withDisableSwiftUICoreAutolink` (+852 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `search-registry.ts`, `create-operation-screen.tsx`, `orders-screen.tsx`, `text.tsx`, `team-screen.tsx`, `motion.ts`, `create-order-screen.tsx`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `index.ts`, `useSession`, `app-tab-bar.tsx`, `index.ts`, `order-detail-screen.tsx`, `Text`, `radius`, `getJson`, `scan-screen.tsx`, `useReducedMotion`, `useAuth`, `currency-screen.tsx`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `use-scan-experience.ts`, `scan-product-sheet.tsx`, `rhythm`, `order-composition-step.tsx`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `use-theme.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `index.ts`, `types.ts`, `organization-switch-button.tsx`, `toneBackground`, `design-language-context.ts`, `use-profile-snapshot.ts`, `profile-screen.tsx`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `notification-bell-button.tsx`, `document-import-screen.tsx`, `search-results.tsx`, `input-field.tsx`, `useSearchEnter`, `search-idle.tsx`, `appearance-settings-screen.tsx`, `subscription-screen.tsx`, `document-import.ts`, `useFloatingTabBarInset`, `version-settings-screen.tsx`, `auth-oauth-button.tsx`, `form`, `search-result-row.tsx`, `location-screen.tsx`, `team-employee-card.tsx`, `scan-glass-panel.tsx`, `resolve-active-company-name.ts`, `search-engine-card.tsx`, `scan-move-sheet.tsx`, `sidebar.tsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `Text` connect `Text` to `search-registry.ts`, `create-operation-screen.tsx`, `orders-screen.tsx`, `text.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `useSession`, `app-tab-bar.tsx`, `index.ts`, `order-detail-screen.tsx`, `useTheme`, `radius`, `types.ts`, `notifications-settings-screen.tsx`, `scan-screen.tsx`, `useReducedMotion`, `useAuth`, `currency-screen.tsx`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `use-scan-experience.ts`, `scan-product-sheet.tsx`, `rhythm`, `order-composition-step.tsx`, `scan-document-sheet.tsx`, `edit-profile-screen.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `index.ts`, `types.ts`, `organization-switch-button.tsx`, `toneBackground`, `setup-wizard-screen.tsx`, `login-screen.tsx`, `notification-bell-button.tsx`, `document-import-screen.tsx`, `search-results.tsx`, `input-field.tsx`, `useSearchEnter`, `search-idle.tsx`, `appearance-settings-screen.tsx`, `subscription-screen.tsx`, `order-documents-section.tsx`, `version-settings-screen.tsx`, `auth-oauth-button.tsx`, `form`, `search-result-row.tsx`, `location-screen.tsx`, `team-employee-card.tsx`, `scan-glass-panel.tsx`, `invite-accept-screen.tsx`, `search-engine-card.tsx`, `scan-move-sheet.tsx`, `sidebar.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `useSession()` connect `useSession` to `create-operation-screen.tsx`, `orders-screen.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `accounting-screen.tsx`, `index.ts`, `app-tab-bar.tsx`, `order-detail-screen.tsx`, `Text`, `notifications-settings-screen.tsx`, `scan-screen.tsx`, `useAuth`, `currency-screen.tsx`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `use-scan-experience.ts`, `getFirebaseDb`, `rhythm`, `my-earnings-screen.tsx`, `index.ts`, `document-file-actions.ts`, `use-profile-snapshot.ts`, `setup-wizard-screen.tsx`, `notification-bell-button.tsx`, `mobilePost`, `subscription-screen.tsx`, `useFloatingTabBarInset`, `use-mission-control-data.ts`, `order-documents-section.tsx`, `location-screen.tsx`, `notification-provider.tsx`, `resolve-active-company-name.ts`, `use-add-to-order-flow.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `ScreenEnterConfig`, `withGoogleModularHeaders`, `withGoogleIosUrlScheme` to the rest of the system?**
  _857 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05994710549515134 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.053998632946001365 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05441400304414003 - nodes in this community are weakly interconnected._