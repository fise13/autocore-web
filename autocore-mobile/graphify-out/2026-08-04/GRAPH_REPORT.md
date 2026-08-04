# Graph Report - autocore-mobile  (2026-08-04)

## Corpus Check
- 857 files · ~339,254 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4284 nodes · 13629 edges · 230 communities (168 shown, 62 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2fc337e5`
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
- invite-service.ts
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
- gradients.ts
- @autocore/billing
- expo-auth-session

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 415 edges
2. `Text` - 211 edges
3. `haptics` - 134 edges
4. `rhythm` - 95 edges
5. `useSession()` - 90 edges
6. `getFirebaseDb()` - 85 edges
7. `useReducedMotion()` - 84 edges
8. `normalizeCompanyId()` - 67 edges
9. `spacing` - 67 edges
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

## Communities (230 total, 62 thin omitted)

### Community 0 - "search-registry.ts"
Cohesion: 0.05
Nodes (69): AutocompleteOverlay, AutocompleteOverlayProps, HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs (+61 more)

### Community 1 - "create-operation-screen.tsx"
Cohesion: 0.12
Nodes (21): SLUG_TO_TYPE, notifyFirestoreSnapshotError(), toDateFromFirestore(), mapClient(), documentGenerationJobRepository, mapJob(), coerceInventoryString(), createInventoryItemRepository() (+13 more)

### Community 2 - "orders-screen.tsx"
Cohesion: 0.10
Nodes (39): isDevModeActive(), clearEntitlementCaches(), peekEntitlement(), asPurchaseFailure(), failure(), isCancellation(), isFlowBusy(), resetPurchaseStore() (+31 more)

### Community 3 - "text.tsx"
Cohesion: 0.05
Nodes (40): AuthDivider(), AnimatedPath, AppLoadingLogo(), AppLoadingLogoProps, AppLoadingLogoStatic(), DrawablePath(), easeInOut, FeatureLockedCard() (+32 more)

### Community 4 - "team-screen.tsx"
Cohesion: 0.15
Nodes (13): TeamDirectoryComposer(), TeamDirectoryComposerProps, TeamDirectoryRow, TeamDirectoryRowProps, styles, TeamInviteCardProps, TeamInviteRow, TeamBadge() (+5 more)

### Community 5 - "motion.ts"
Cohesion: 0.06
Nodes (36): ScreenEnterConfig, useScaleEnter(), enterValues, presets, smoothEase, spring, staggerDelay(), cardLift (+28 more)

### Community 6 - "create-order-screen.tsx"
Cohesion: 0.06
Nodes (55): CreateOrderScreen(), FormCard(), SheetNavButton(), STEPS, StepTrail(), SummaryRow(), useOrderCompositionForm(), UseOrderCompositionFormOptions (+47 more)

### Community 7 - "snapshot-builders.ts"
Cohesion: 0.09
Nodes (30): EmptyState(), OrderTransitionContext, OrderTransitionContextValue, SourceLayout, useOrderTransition(), OrderRow, OrderRowBody(), OrderRowProps (+22 more)

### Community 8 - "accounting-screen.tsx"
Cohesion: 0.08
Nodes (24): workspaceImport(), useAuth(), AuthBackdrop(), AuthShell(), AuthShellProps, ProgressBar(), AuthenticatedLandingScreen(), ForgotPasswordScreen() (+16 more)

### Community 9 - "index.ts"
Cohesion: 0.07
Nodes (38): CollectionRow, ListSection(), Input, StackScreen(), DeleteAccountDialog(), DeleteAccountDialogProps, ProfileHeroCard(), ProfileHeroCardProps (+30 more)

### Community 10 - "index.ts"
Cohesion: 0.17
Nodes (22): clientRepository, useClientsRealtime(), useCompanyAppConfig(), useEmployeesRealtime(), useInventoryCatalog(), useMotorsRealtime(), useOperationsRealtime(), usePayrollTransactionsRealtime() (+14 more)

### Community 11 - "index.ts"
Cohesion: 0.19
Nodes (17): SearchEmptyActionId, SearchEmptyState(), SearchEmptyStateProps, SearchGroupHeader(), pluralResults(), SearchResults(), SearchResultsProps, AddToOrderHandlers (+9 more)

### Community 12 - "useSession"
Cohesion: 0.04
Nodes (44): 10. Decisions — resolved 2026-07-31, 10a. Review finding — the app is all-or-nothing gated, 11. Implementation order (once approved), 1.1 Authentication, 1.2 Navigation, 1.3 Settings / Profile, 1.4 Existing backend (web repo, Vercel + Firebase), 1.5 Current user / subscription model (+36 more)

### Community 13 - "app-tab-bar.tsx"
Cohesion: 0.36
Nodes (6): createMotorRepository(), dedupeMotors(), mapMotor(), motorDocRef(), readLocalId(), readNumber()

### Community 14 - "index.ts"
Cohesion: 0.27
Nodes (12): companySubscriptionRef(), mapSubscription(), readCompanySubscription(), subscribeCompanySubscription(), SubscriptionDoc, toDate(), BILLING_PLANS, BILLING_STATUSES (+4 more)

### Community 15 - "order-detail-screen.tsx"
Cohesion: 0.06
Nodes (36): backdropIn(), backdropOut(), dialogIn(), dialogOut(), ENTER_FADE, EXIT_FADE, popoverIn(), popoverOut() (+28 more)

### Community 16 - "useTheme"
Cohesion: 0.08
Nodes (43): useAccountingData(), UseAccountingDataResult, buildWeekRevenueBars(), computeWeekRevenueGrowth(), dayKey(), incomeForDay(), isIncomeOperation(), operationDate() (+35 more)

### Community 17 - "auth-provider.tsx"
Cohesion: 0.10
Nodes (29): DatePicker(), CachedEntitlement, CachedSubscription, date(), deserialize(), iso(), readEntitlementCache(), readEntitlementCacheSync() (+21 more)

### Community 18 - "Text"
Cohesion: 0.30
Nodes (12): PendingAdd, useAddToOrderFlow(), CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart(), ScanEntityLinkKind (+4 more)

### Community 19 - "radius"
Cohesion: 0.17
Nodes (23): applyInboxPayload(), EMPTY_CACHE, InboxCache, loadInboxCache(), markAllReadInCache(), markNotificationReadInCache(), mergeServerItems(), paginateItems() (+15 more)

### Community 20 - "firestore-timestamp.ts"
Cohesion: 0.10
Nodes (37): CompanyNameSource, isCompanyIdDisplayValue(), readCompanyDisplayName(), normalizeCompanyId(), resolveCompanyIdsForSync(), getFirebaseDb(), deleteUserAccountData(), loadMemberships() (+29 more)

### Community 21 - "notification-service.ts"
Cohesion: 0.39
Nodes (7): useAppearanceSettingsStore, useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useScreenReaderEnabled(), DesignLanguageContext

### Community 22 - "getJson"
Cohesion: 0.04
Nodes (69): ChevronRightIcon, TrendingDownIcon, isTabRouteName(), NO_TRANSITION, resolveTabRouteName(), TAB_ORDER, TabRouteName, TabTransitionContext (+61 more)

### Community 23 - "types.ts"
Cohesion: 0.15
Nodes (14): ExternalLinkIcon, Share2Icon, TeamInvitePresentOptions, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS, profileLayout (+6 more)

### Community 24 - "notifications-settings-screen.tsx"
Cohesion: 0.05
Nodes (67): useCardLift(), NotFoundScreen(), IconProps, ImagesIcon, MapPinIcon, ActivityCard, ActivityCardProps, AnalyticsCard (+59 more)

### Community 25 - "scan-screen.tsx"
Cohesion: 0.13
Nodes (39): AccountingAttentionAction, AccountingQuickActionId, AttentionTone, CashFlowPeriod, InvoiceStatus, TransactionStatus, TrendTone, computeMonthRevenueGrowth() (+31 more)

### Community 26 - "useReducedMotion"
Cohesion: 0.10
Nodes (28): AccountingScreen(), AcAccountTiles, AcBalanceCard, AcOperationsList(), AcTabBar(), AcTabBarProps, AcTabPanel(), AcTabPanelProps (+20 more)

### Community 27 - "useAuth"
Cohesion: 0.09
Nodes (24): OrderStatusBadge(), OrderStatusBadgeProps, OrderWorkflowProgress(), OrderWorkflowProgressProps, resolveStatusInk(), StatusEmphasis, StatusInk, getWorkflowStages() (+16 more)

### Community 28 - "currency-screen.tsx"
Cohesion: 0.19
Nodes (15): purchasablePlans(), devDisplayPrice(), devProducts(), emit(), EMPTY_PRODUCTS, getFlow(), listeners, PurchaseStoreSnapshot (+7 more)

### Community 30 - "subscription-registry.ts"
Cohesion: 0.10
Nodes (32): useRealtimeReconnect(), useSessionBootstrapReady(), queryClient, hydrateOne(), preloadSessionSnapshots(), preloadSessionSnapshotsChunked(), sessionBootstrapQueryKeys(), sessionInteractiveQueryKeys() (+24 more)

### Community 31 - "types.ts"
Cohesion: 0.08
Nodes (34): AuthEmailChip(), AuthEmailChipProps, NOTIFICATION_ROW_DIVIDER_INSET, Segment, SegmentedControl(), SegmentedControlProps, CoTypeSegment, CoTypeSelector() (+26 more)

### Community 32 - "auth-gate.tsx"
Cohesion: 0.05
Nodes (74): ActivityIcon, ArrowUpRightIcon, BarChart3Icon, BellIcon, BoxIcon, CarIcon, ChevronsUpDownIcon, ChevronUpIcon (+66 more)

### Community 33 - "mc-featured-insight.tsx"
Cohesion: 0.11
Nodes (32): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, useDocumentGenerationJobsRealtime(), useWorkOrderDocumentsRealtime(), orderShowsOilIntervalTag(), textMatches(), downloadPdfFromApi() (+24 more)

### Community 34 - "haptics"
Cohesion: 0.08
Nodes (27): FlashlightIcon, ScreenActionFooter(), ScreenActionFooterProps, DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps (+19 more)

### Community 35 - "use-scan-experience.ts"
Cohesion: 0.14
Nodes (15): OAuthButtonTheme, OAuthProvider, resolveScheme(), ThemeProvider(), base(), platform, defaultShadow(), floatingShadow() (+7 more)

### Community 36 - "index.ts"
Cohesion: 0.15
Nodes (22): CurrencyScreen(), useAppDisplayCurrency(), fetchExchangeRates(), useExchangeRates(), APP_DISPLAY_CURRENCIES, APP_DISPLAY_CURRENCY_OPTIONS, AppDisplayCurrency, appDisplayCurrencyAffix() (+14 more)

### Community 37 - "scan-product-sheet.tsx"
Cohesion: 0.15
Nodes (15): CreateInventoryItemInput, useMobileQuickReceive(), useMobileStockAdjust(), inventoryQueryKey(), useOptimisticStockAdjust(), mobileApi, sendEmployeeInviteEmail(), SendEmployeeInviteResult (+7 more)

### Community 38 - "getFirebaseDb"
Cohesion: 0.18
Nodes (20): ExpoGoogleSignInButton(), GoogleSignInButton(), GoogleSignInButtonProps, getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), accountUsesPassword(), deleteAccountForCurrentUser() (+12 more)

### Community 39 - "rhythm"
Cohesion: 0.09
Nodes (22): HorizontalFilterBar(), SearchFilters(), SearchFiltersProps, catalog, CatalogEntry, groupOrder, groupTitles, matchesFilter() (+14 more)

### Community 40 - "order-composition-step.tsx"
Cohesion: 0.09
Nodes (28): Dropdown(), COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBar(), ComposerTabBarProps, ComposerTabOption, TabIcon (+20 more)

### Community 41 - "scan-document-sheet.tsx"
Cohesion: 0.15
Nodes (19): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+11 more)

### Community 42 - "edit-profile-screen.tsx"
Cohesion: 0.19
Nodes (12): OptionRow(), ScanUnknownSheet, ScanUnknownSheetContent(), ScanUnknownSheetProps, classifyScanPayload(), ENTITY_PREFIXES, hasValidEanChecksum(), isHttpUrl() (+4 more)

### Community 43 - "use-theme.tsx"
Cohesion: 0.14
Nodes (21): MobileApiError, registerNotificationDevice(), attachForegroundListener(), ensureAndroidChannel(), ensureNotificationHandler(), ensurePushDeviceRegistered(), fetchExpoPushToken(), fetchExpoPushTokenViaExperienceId() (+13 more)

### Community 44 - "index.ts"
Cohesion: 0.22
Nodes (8): CheckCircle2Icon, CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, sizeMap, OrganizationMembershipRow, OrganizationMembershipRowProps, styles

### Community 45 - "my-earnings-screen.tsx"
Cohesion: 0.16
Nodes (14): AuthProviderKind, badgeSize, monogramFontSize, UserAvatar(), UserAvatarProps, UserAvatarSize, McHeader(), resolveGreetingHeadline() (+6 more)

### Community 46 - "empty-state.tsx"
Cohesion: 0.06
Nodes (63): parseFeature(), PaywallRoute(), CheckIcon, Loader2Icon, LockIcon, FeatureGateProps, FeatureLockedCardProps, METRICS (+55 more)

### Community 47 - "inventory.ts"
Cohesion: 0.10
Nodes (36): PremiumBadge(), presentNativeMenu(), SettingsSectionCard(), InvitePreviewCard(), presentOrganizationSwitcher(), PresentOrganizationSwitcherArgs, profileRouteHref(), WorkspaceCompaniesSection() (+28 more)

### Community 48 - "app.config.ts"
Cohesion: 0.09
Nodes (18): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+10 more)

### Community 49 - "dependencies"
Cohesion: 0.08
Nodes (25): @autocore/billing, @autocore/org, expo-constants, expo-router, nativewind, dependencies, @autocore/billing, @autocore/org (+17 more)

### Community 50 - "index.ts"
Cohesion: 0.10
Nodes (28): allStoreSkus(), PlanDescriptor, skuForPlan(), readErrorCode(), toPurchaseFailure(), connect(), disconnect(), emitFailure() (+20 more)

### Community 51 - "client-repository.ts"
Cohesion: 0.24
Nodes (14): appStorage, clearNamespace(), getAllKeys(), getString(), remove(), setString(), busterListeners, notifyBusterListeners() (+6 more)

### Community 52 - "types.ts"
Cohesion: 0.36
Nodes (6): computeOrdersListMeta(), filterCounts(), filterOrders(), mockOrders, orderFilters, isOpenOrderStatus()

### Community 53 - "push-channel.ts"
Cohesion: 0.10
Nodes (19): usePressAnimation(), ArrowRightIcon, AppleSignInButton(), AppleSignInButtonProps, resolveAppleSignInEnabled(), AppleIcon(), BrandIconProps, GoogleIcon() (+11 more)

### Community 54 - "organization-switch-button.tsx"
Cohesion: 0.23
Nodes (18): useNotificationInboxRealtime(), markAllNotificationsRead(), markNotificationState(), fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord(), markAllInboxNotificationsRead() (+10 more)

### Community 55 - "toneBackground"
Cohesion: 0.16
Nodes (3): ScanCommitResult, ScanDebounce, ScanDebounceOptions

### Community 56 - "autocomplete-provider.tsx"
Cohesion: 0.13
Nodes (16): OrderClaimSection(), OrderClaimSectionProps, LineRow(), OrderLine, OrderLinesList(), OrderLinesListProps, Section(), HeaderTextButton() (+8 more)

### Community 57 - "scan-service.ts"
Cohesion: 0.17
Nodes (12): TeamEmployeeCard, TeamEmployeeCardProps, TeamRoleCard, TeamRoleCardProps, ALL_PERMISSIONS, ASSIGNABLE_ROLES, employeeDisplayName(), formatLastActive() (+4 more)

### Community 58 - "startup-tracer.ts"
Cohesion: 0.06
Nodes (51): AutocompleteInput, AcTransferSheet, AcTransferSheetProps, AcTransferSheetRef, CoAmountField(), CoAmountFieldProps, CoCommentField(), CoCard() (+43 more)

### Community 59 - "document-file-actions.ts"
Cohesion: 0.16
Nodes (14): AuthSocialCluster(), AuthSocialClusterProps, isValidEmail(), LoginScreen(), readInviteCompanyName(), readInviteEmail(), getPasswordStrengthState(), PasswordRequirement (+6 more)

### Community 60 - "login-screen.tsx"
Cohesion: 0.12
Nodes (26): CompanyJourneyScreen(), CompanyMode, OrgDangerZone(), OrgDangerZoneProps, InviteAcceptScreen(), InviteAcceptScreenProps, JoinCompanyScreen(), parseInviteInput() (+18 more)

### Community 61 - "ScanService"
Cohesion: 0.11
Nodes (30): ParsedDocument, mapResolveResultToScanResult(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve(), mapOcrResponse(), resolveBarcodePayload(), PendingScanContext (+22 more)

### Community 62 - "profile-screen.tsx"
Cohesion: 0.14
Nodes (24): AuthGate(), MemoAppTree, paywallImport(), styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, AuthRedirectEffect(), armLoginRiseHandoff() (+16 more)

### Community 63 - "include"
Cohesion: 0.08
Nodes (25): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, nativewind-env.d.ts, ../packages/avatars/src, ../packages/billing/src, ../packages/design-tokens/src, ../packages/domain-search/src (+17 more)

### Community 64 - "setup-wizard-screen.tsx"
Cohesion: 0.14
Nodes (18): animationSpeed, buttonHeight, A11ySlice, defaultEasing, glassStyle, iconWeight, iosControls, layering (+10 more)

### Community 65 - "apple-sign-in.ts"
Cohesion: 0.14
Nodes (19): withAlpha(), borderStyle(), designLanguageFromScheme(), cornerStyle, surfaceStyle(), toneStyles(), touchTarget, pickMotion() (+11 more)

### Community 66 - "login-screen.tsx"
Cohesion: 0.26
Nodes (8): buildWeekBars(), formatMoney(), MyEarningsScreen(), MyEarningsScreenProps, WEEKDAY_SHORT_EN, weekDayShortLabel(), isOpenStatus(), setEmployeeShiftOn()

### Community 67 - "notification-bell-button.tsx"
Cohesion: 0.10
Nodes (19): APP_ICON, AuthBrandMark(), AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON, LOGIN_LOCKUP (+11 more)

### Community 68 - "document-import-screen.tsx"
Cohesion: 0.14
Nodes (12): listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, kindLabel(), LocationContentsResponse (+4 more)

### Community 69 - "ac-payroll-list.tsx"
Cohesion: 0.18
Nodes (20): inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode(), SearchResultItem, QUICK_CATEGORIES, useSearchIdleData(), resolveInventoryShelf(), inventoryStatus() (+12 more)

### Community 70 - "apple-sign-in.ts"
Cohesion: 0.23
Nodes (13): formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), exchangeAppleSignInViaApi(), applyAppleProfileFromCredential(), buildAppleApiPayload() (+5 more)

### Community 71 - "mapAuthError"
Cohesion: 0.20
Nodes (10): AUTO_TYPE_SET, modeAllowsSymbology(), PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES (+2 more)

### Community 72 - "input-field.tsx"
Cohesion: 0.14
Nodes (23): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, FormPanel() (+15 more)

### Community 73 - "Issues found & resolutions"
Cohesion: 0.11
Nodes (18): 10. Missing architecture, 1. Duplicated styles, 2. Duplicated animations, 3. Duplicated colors, 4. Duplicated spacing / layout, 5. Duplicated typography, 6. Duplicated shadows, 7. Duplicated icons (+10 more)

### Community 74 - "composer-utils.ts"
Cohesion: 0.11
Nodes (17): body, callout, caption1, caption2, fontWeight, footnote, headline, largeTitle (+9 more)

### Community 75 - "animated-tab-screen.tsx"
Cohesion: 0.10
Nodes (25): PlanOffer, useSubscription(), UseSubscriptionResult, CODE_MAP, isPurchaseFailure(), MESSAGES, getPurchaseStoreSnapshot(), subscribePurchaseStore() (+17 more)

### Community 76 - "search-idle.tsx"
Cohesion: 0.23
Nodes (4): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, WarehouseScreen()

### Community 77 - "styles.ts"
Cohesion: 0.12
Nodes (13): PhoneIcon, ordersSpring, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), OrderCard, OrderCardProps, SF (+5 more)

### Community 78 - "inline-autocomplete-row.tsx"
Cohesion: 0.18
Nodes (20): dateMs(), comparePlans(), highestPlan(), PlanAvailability, planForSku(), PLANS, TIER_RANK, tierRank() (+12 more)

### Community 79 - "subscription-screen.tsx"
Cohesion: 0.06
Nodes (42): TabLayout(), ModulesEditorList(), ModulesEditorListProps, ACCOUNTING_DEMO, PERMISSION_GROUPS, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER (+34 more)

### Community 80 - "profile.ts"
Cohesion: 0.10
Nodes (44): AuthActions, AuthActionsContext, AuthProvider(), ENRICH_RETRY_DELAYS_MS, HydrationPayload, persistSessionSnapshot(), readHydrationFromStore(), recoverSessionWorkspace() (+36 more)

### Community 81 - "document-import.ts"
Cohesion: 0.24
Nodes (9): IosLiftMenu(), IosLiftMenuAnchor, IosLiftMenuItem, IosLiftMenuProps, styles, OrdersLiftContext, OrdersLiftContextValue, OrdersLiftProvider() (+1 more)

### Community 82 - "modules.ts"
Cohesion: 0.10
Nodes (19): useShimmer(), AlertTriangleIcon, AlertProps, AlertVariant, ButtonProps, ButtonShape, ButtonSize, ButtonVariant (+11 more)

### Community 83 - "location-screen.tsx"
Cohesion: 0.14
Nodes (19): HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart, hasShelfValue(), isEngine(), SearchEngineCard() (+11 more)

### Community 84 - "ac-payroll-list.tsx"
Cohesion: 0.08
Nodes (41): ListGroup(), ListGroupProps, acTimeline, AcAccountTilesProps, AccountTile(), TileDef, AcAccountingSkeleton(), TileSkeleton() (+33 more)

### Community 85 - "order-documents-section.tsx"
Cohesion: 0.22
Nodes (7): AcMotorSaleDocumentsSheet, AcMotorSaleDocumentsSheetProps, AcMotorSaleDocumentsSheetRef, DocAction, isMotorSaleOperation(), motorSaleDetail(), motorSaleMotorId()

### Community 86 - "ScanDebounce"
Cohesion: 0.40
Nodes (7): AccountingLayout(), OrdersLayout(), OrderTransitionProvider(), formSheetScreenOptions(), NavigationPolicy, RouteCategory, stackOptionsFor()

### Community 87 - "version-settings-screen.tsx"
Cohesion: 0.10
Nodes (19): Auth vs product, Autocore Mobile Design Language v3, Buttons, Device smoke checklist (verify), Do / Don’t, Icons, List dialects, Living gallery (+11 more)

### Community 88 - "delete-account.ts"
Cohesion: 0.14
Nodes (19): FinanceSettingsScreen(), ListPanel(), ListPanelProps, listsEqual(), normalizeList(), financeSettingsHref(), FinanceSettingsReturnTo, openFinanceSettings() (+11 more)

### Community 89 - "use-work-order-composer-options.ts"
Cohesion: 0.09
Nodes (37): ActivityFeedFiltersProps, READ_FILTERS, buildOrderDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType, ERROR_EVENTS, ErrorEventType (+29 more)

### Community 90 - "search-engine-card.tsx"
Cohesion: 0.15
Nodes (12): NotificationCard, ActivityDateGroup(), ActivityDateGroupProps, ActivityNotificationRow, ActivityNotificationRowProps, SwipeActionProps, DateGroup, DateGroupKey (+4 more)

### Community 92 - "kv.ts"
Cohesion: 0.24
Nodes (15): parseFilter(), SearchScreen(), useInventorySearch(), calendarDaysBetween(), isMotorStale(), isWarehouseLowStock(), motorMatchesSearchQuery(), warehouseLowStockThreshold() (+7 more)

### Community 93 - "Manual Matrix"
Cohesion: 0.15
Nodes (12): 1. Cold launch with valid session, 2. Cold launch without session, 3. Invalid credentials, 4. Offline login attempt, 5. Password reset request, 6. Logout and relaunch, 7. Firestore user without company, 8. Inactive employee membership (+4 more)

### Community 94 - "deep-link-resolver.ts"
Cohesion: 0.20
Nodes (9): resolveInviteHref(), guardedPush(), PushRouter, navigationHrefKey(), stackNavigationGuard, buildImportDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink() (+1 more)

### Community 96 - "useFloatingTabBarInset"
Cohesion: 0.28
Nodes (5): AuthBootLoadingProps, AppLoadingScreen(), AppLoadingScreenProps, Loading(), LoadingProps

### Community 97 - "order-row.tsx"
Cohesion: 0.20
Nodes (8): AnimatedLine, AuthHeroCar(), FRONT_WHEEL, HERO_DISPLAY_HEIGHT, HERO_DISPLAY_WIDTH, REAR_WHEEL, SPEED_LINES, WheelProps

### Community 98 - "package.json"
Cohesion: 0.17
Nodes (11): eas-cli, devDependencies, eas-cli, @types/react, typescript, main, name, private (+3 more)

### Community 99 - "copy-button.tsx"
Cohesion: 0.07
Nodes (37): createClientSchema, createVehicleSchema, createWorkOrderSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema, workOrderPricingSchema, AutocompleteDataSnapshot (+29 more)

### Community 100 - "google-sign-in-button.tsx"
Cohesion: 0.12
Nodes (26): HomeRoute(), OverviewScreen(), getStartupMarks(), logStartupTable(), MarkEntry, marks, markStartup(), StartupMark (+18 more)

### Community 101 - "highlighted-text.tsx"
Cohesion: 0.15
Nodes (15): ScanSearchIcon, OrderPickerRow(), OrderPickerSheet, OrderPickerSheetProps, whTimeline, OPTIONS, WarehouseFilter, WarehouseFilterBar() (+7 more)

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, eas:init, eas:login, eas:whoami, ios, ios:provision, ios:release (+3 more)

### Community 103 - "mobilePost"
Cohesion: 0.36
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 104 - "useFloatingTabBarInset"
Cohesion: 0.13
Nodes (28): appendLocalFile(), createLocalFileFormData(), AvatarUploadResult, uploadUserAvatar(), DocumentImportJobStatus, DocumentImportUploadResult, getDocumentImportStatus(), pollDocumentImportUntilSettled() (+20 more)

### Community 105 - "financial-operation-repository.ts"
Cohesion: 0.31
Nodes (6): VersionSettingsScreen(), formatPlatformPhone(), getPlatformContacts(), PlatformContacts, readEnv(), openPhone()

### Community 106 - "team-invite-card.tsx"
Cohesion: 0.18
Nodes (10): ListRow, ListRowProps, styles, ProfileDangerZone(), ProfileDangerZoneProps, ProfileNavCard(), ProfileNavCardProps, ProfileSettingsGroup() (+2 more)

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
Cohesion: 0.21
Nodes (18): WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, SubscriptionStatusCard(), SubscriptionStatusCardProps, TrialCountdown(), TrialCountdownProps, daysUntil(), formatDaysRemaining() (+10 more)

### Community 111 - "Firebase integration QA matrix"
Cohesion: 0.25
Nodes (7): Auth shell, Environment, Firebase integration QA matrix, Firestore indexes, Mobile API, Offline, Realtime data

### Community 112 - "diagnostics-settings-screen.tsx"
Cohesion: 0.17
Nodes (14): orderStatusLabel, searchSpring, searchTimeline, SearchEnterConfig, useSearchEnter(), SearchBar(), SearchBarProps, SearchGroupHeaderProps (+6 more)

### Community 113 - "advances.ts"
Cohesion: 0.17
Nodes (23): DevSubscriptionPanel(), readDevOffline(), SyncState, clearDevMode(), DEFAULT_STATE, DEV_PRICES, DEV_SCENARIOS, DevScenario (+15 more)

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
Cohesion: 0.26
Nodes (13): CachedRealtimeSnapshot, flushOneWrite(), lastDataJsonByKey, memoryCache, PendingWrite, pendingWrites, persistSnapshot(), scheduleFlush() (+5 more)

### Community 123 - "with-ios-push-entitlements.js"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 129 - "authenticated-landing-screen.tsx"
Cohesion: 0.02
Nodes (92): CopyIcon, TabScreenPlaceholder(), TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize, ActionIconButtonVariant, ICON_SIZES (+84 more)

### Community 132 - "inventory-card.tsx"
Cohesion: 0.36
Nodes (5): MODES, RnSegmentedScanMode(), ScanModeControl(), ScanModeControlProps, ScanCaptureMode

### Community 133 - "profile-danger-zone.tsx"
Cohesion: 0.10
Nodes (23): CompanyEmployeeRow, useCompanyEmployees(), getWebAppUrl(), fetchJsonWithTimeout(), getPublicApiBaseUrl(), AppleSignInApiPayload, AppleSignInApiResponse, AuthEmailApiError (+15 more)

### Community 140 - "use-work-order-composer-options.ts"
Cohesion: 0.19
Nodes (9): AppProviders(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, RootNavigator(), RootStack, RootStatusBar(), getQueryPersistBuster(), mmkvQueryPersister (+1 more)

### Community 141 - "expo-auth-session"
Cohesion: 0.29
Nodes (14): EMPTY, useAccountingPreferences(), useUserDisplayCurrency(), normalizeAppDisplayCurrency(), AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings(), patchAccountingSettings() (+6 more)

### Community 150 - "organization-switch-button.tsx"
Cohesion: 0.33
Nodes (6): UsageMeterRow(), UsageMeterRowProps, UsageRing(), UsageRingProps, usageTone(), ToneName

### Community 170 - "team-invite-card.tsx"
Cohesion: 0.10
Nodes (26): FeatureGate(), TeamProGate(), TeamProGateProps, INVITE_FILTER_OPTIONS, InviteStatusFilter, TeamInviteStatusFilters(), TeamInviteStatusFiltersProps, buildInviteJoinUrl() (+18 more)

### Community 199 - "notification-bell-button.tsx"
Cohesion: 0.15
Nodes (17): stripUndefinedDeep(), mergeNotificationPreferences(), updateNotificationPreferences(), buildPreferencesPayload(), preferencesRef(), saveNotificationPreferences(), subscribeNotificationPreferences(), CategoryPreferences (+9 more)

### Community 201 - "create-icon.tsx"
Cohesion: 0.20
Nodes (11): Listener, listeners, resetAppShellReady(), setAppShellReady(), clearScheduledQueryDataApplies(), clearRealtimeSnapshots(), clearRealtimeSubscriptions(), clearRecentQueriesCache() (+3 more)

### Community 202 - "use-notification-preferences.ts"
Cohesion: 0.11
Nodes (22): InAppBannerProvider(), NotificationBellButton(), NotificationBellButtonProps, ActivityFeedFilters(), groupNotificationsByDate(), NotificationInboxScreen(), CATEGORY_HINTS, NotificationsSettingsScreen() (+14 more)

### Community 203 - "auth-journey-screens.tsx"
Cohesion: 0.09
Nodes (24): ScanCandidatesSheet, ScanCodePickerSheet, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanDocumentSheet, ScanIdleIndicator(), ScanIdleIndicatorProps (+16 more)

### Community 206 - "useFadeIn"
Cohesion: 0.15
Nodes (10): DeviceClass, BreakpointKey, breakpoints, screen, sidebarWidth, { width, height }, productCta, layoutRhythm (+2 more)

### Community 208 - "sidebar.tsx"
Cohesion: 0.06
Nodes (35): useFadeIn(), usePageEnter(), useStaggerFadeIn(), ArrowLeftIcon, AuthHeroShell(), AuthHeroShellProps, HeroBackdrop(), takeLoginRiseHandoff() (+27 more)

### Community 209 - "useScreenEnter"
Cohesion: 0.29
Nodes (12): ScanDocumentUploadResult, uploadScanDocument(), formatRelativeTime(), loadRecentScans(), mapStored(), mergeRecents(), migrateLegacyIfNeeded(), normalizeStored() (+4 more)

### Community 210 - "sidebar.tsx"
Cohesion: 0.40
Nodes (5): Sidebar(), SidebarItem, SidebarProps, SidebarSection, isTablet()

### Community 212 - "CollectionSwitchRow"
Cohesion: 0.16
Nodes (17): MODULE_KEYS, SetupWizardScreen(), StaggerRow(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES (+9 more)

### Community 213 - "app-loading-screen.tsx"
Cohesion: 0.11
Nodes (32): FilterIcon, OrdersFilterMenu(), OrdersFilterMenuItem, OrdersFilterMenuProps, OrdersHeader(), OrdersHeaderProps, useOrdersLift(), MailOrderRow() (+24 more)

### Community 214 - "local-inventory-resolve.ts"
Cohesion: 0.38
Nodes (9): itemMatchesPayload(), resolveBarcodeFromLocalCatalog(), toMobileScanItem(), compactBarcode(), compactCode(), extractGs1Primary(), normalizeScanPayload(), scanPayloadKey() (+1 more)

### Community 215 - "in-app-banner-provider.tsx"
Cohesion: 0.29
Nodes (6): CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), getStartupSummary(), estimateCacheSizeBytes(), formatCacheSize()

### Community 216 - "tab-transition-context.tsx"
Cohesion: 0.13
Nodes (17): InviteFormNotice(), InviteFormNoticeProps, DemoModeBanner(), typeBadgeColors(), AcPayrollList(), AcPayrollListProps, PayrollRow(), PayrollStatusBadge() (+9 more)

### Community 218 - "invite-service.ts"
Cohesion: 0.13
Nodes (23): useWorkspaceAccessRealtime(), HydrationPayload, SessionHydrationPayload, resolveWorkspaceAccessBlock(), WorkspaceAccessCopy, SessionBootstrapPayload, CompanyDocShape, ensureUserDocument() (+15 more)

### Community 221 - "priority-router.ts"
Cohesion: 0.14
Nodes (13): DeliveryChannels, isServerCategoryEnabled(), PRIORITY_BASE, resolveDeliveryChannels(), resolveLiveEditingChannels(), resolveSyncChannels(), CategoryChannelPrefs, DEFAULT_EXTENDED_CATEGORY_PREFS (+5 more)

### Community 222 - "recent-scans.ts"
Cohesion: 0.11
Nodes (32): scanSheetAnimationConfigs, ScanCandidatesSheetProps, ScanCodePickerSheetProps, ScanDocumentSheetProps, ScanMoveSheetProps, ScanNotFoundSheetProps, ScanProductSheetProps, ScanProductThumb() (+24 more)

### Community 223 - "useScreenEnter"
Cohesion: 0.38
Nodes (5): useScreenEnter(), ProfileEnterConfig, useProfileEnter(), ScanEnterConfig, useScanEnter()

### Community 224 - "export-operations-csv.ts"
Cohesion: 0.33
Nodes (7): Can(), CanProps, RequirePermission(), RequirePermissionProps, RbacPolicy, useCan(), useRbacPolicy()

### Community 225 - "scan-frame-overlay.tsx"
Cohesion: 0.13
Nodes (13): GlassCard(), GlassCardProps, profileSpring, profileTimeline, SectionTitle(), SectionTitleProps, scanSpring, scanTimeline (+5 more)

### Community 227 - "engine-status.tsx"
Cohesion: 0.39
Nodes (7): useCompanyDirectory(), createDirectoryPerson(), directoryCollection(), mapDirectoryPerson(), subscribeCompanyDirectory(), DirectoryPerson, DirectoryPersonStatus

### Community 228 - "mock-scan-registry.ts"
Cohesion: 0.38
Nodes (6): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload(), RecentScan

### Community 229 - "scan-top-bar.tsx"
Cohesion: 0.32
Nodes (5): AnimatedIconWrapper, createIcon(), IconState, IconSize, iconSizes

### Community 232 - "gradients.ts"
Cohesion: 0.16
Nodes (23): sheetPresentationKey(), useDevMockFallback(), useScanExperience(), entityLinkLabel(), MobileAssignAssetResult, MobileRelocateResult, MobileWarehouseLocation, useMobileAssignAssetLocation() (+15 more)

### Community 233 - "@autocore/billing"
Cohesion: 0.10
Nodes (18): DesignSystemScreen(), CollectionList(), CollectionListProps, CollectionRowProps, CollectionSwitchRow, CollectionSwitchRowProps, pressTiming, SwipeableRow() (+10 more)

## Knowledge Gaps
- **1090 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1085 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `text.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `team-screen.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `use-work-order-composer-options.ts`, `order-detail-screen.tsx`, `auth-provider.tsx`, `notification-service.ts`, `organization-switch-button.tsx`, `getJson`, `notifications-settings-screen.tsx`, `types.ts`, `useAuth`, `types.ts`, `auth-gate.tsx`, `haptics`, `rhythm`, `order-composition-step.tsx`, `team-invite-card.tsx`, `edit-profile-screen.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `push-channel.ts`, `autocomplete-provider.tsx`, `scan-service.ts`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `input-field.tsx`, `use-notification-preferences.ts`, `auth-journey-screens.tsx`, `styles.ts`, `subscription-screen.tsx`, `sidebar.tsx`, `document-import.ts`, `modules.ts`, `sidebar.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `CollectionSwitchRow`, `app-loading-screen.tsx`, `tab-transition-context.tsx`, `location-screen.tsx`, `search-engine-card.tsx`, `delete-account.ts`, `recent-scans.ts`, `useFloatingTabBarInset`, `order-row.tsx`, `scan-frame-overlay.tsx`, `highlighted-text.tsx`, `@autocore/billing`, `team-invite-card.tsx`, `use-search-idle-data.ts`, `diagnostics-settings-screen.tsx`, `advances.ts`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Why does `Text` connect `notifications-settings-screen.tsx` to `search-registry.ts`, `authenticated-landing-screen.tsx`, `text.tsx`, `team-screen.tsx`, `inventory-card.tsx`, `create-order-screen.tsx`, `snapshot-builders.ts`, `accounting-screen.tsx`, `index.ts`, `index.ts`, `order-detail-screen.tsx`, `organization-switch-button.tsx`, `getJson`, `types.ts`, `useReducedMotion`, `useAuth`, `types.ts`, `auth-gate.tsx`, `mc-featured-insight.tsx`, `haptics`, `index.ts`, `order-composition-step.tsx`, `team-invite-card.tsx`, `edit-profile-screen.tsx`, `index.ts`, `my-earnings-screen.tsx`, `empty-state.tsx`, `inventory.ts`, `push-channel.ts`, `autocomplete-provider.tsx`, `scan-service.ts`, `startup-tracer.ts`, `document-file-actions.ts`, `login-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `mapAuthError`, `input-field.tsx`, `use-notification-preferences.ts`, `auth-journey-screens.tsx`, `styles.ts`, `sidebar.tsx`, `document-import.ts`, `modules.ts`, `sidebar.tsx`, `ac-payroll-list.tsx`, `order-documents-section.tsx`, `CollectionSwitchRow`, `app-loading-screen.tsx`, `tab-transition-context.tsx`, `location-screen.tsx`, `search-engine-card.tsx`, `delete-account.ts`, `recent-scans.ts`, `useFloatingTabBarInset`, `scan-frame-overlay.tsx`, `highlighted-text.tsx`, `@autocore/billing`, `team-invite-card.tsx`, `use-search-idle-data.ts`, `diagnostics-settings-screen.tsx`, `advances.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `useSession()` connect `inventory.ts` to `create-order-screen.tsx`, `accounting-screen.tsx`, `index.ts`, `useTheme`, `Text`, `firestore-timestamp.ts`, `useReducedMotion`, `mc-featured-insight.tsx`, `index.ts`, `team-invite-card.tsx`, `my-earnings-screen.tsx`, `autocomplete-provider.tsx`, `startup-tracer.ts`, `login-screen.tsx`, `profile-screen.tsx`, `login-screen.tsx`, `document-import-screen.tsx`, `ac-payroll-list.tsx`, `use-notification-preferences.ts`, `auth-journey-screens.tsx`, `search-idle.tsx`, `animated-tab-screen.tsx`, `subscription-screen.tsx`, `sidebar.tsx`, `profile.ts`, `CollectionSwitchRow`, `app-loading-screen.tsx`, `delete-account.ts`, `kv.ts`, `export-operations-csv.ts`, `copy-button.tsx`, `highlighted-text.tsx`, `gradients.ts`, `diagnostics-settings-screen.tsx`, `advances.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1090 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `search-registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054945054945054944 - nodes in this community are weakly interconnected._
- **Should `create-operation-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12433862433862433 - nodes in this community are weakly interconnected._
- **Should `orders-screen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09936575052854123 - nodes in this community are weakly interconnected._