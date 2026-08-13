# Graph Report - autocore-mobile  (2026-08-11)

## Corpus Check
- Large corpus: 1098 files · ~730,399 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 4744 nodes · 12788 edges · 160 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: imports_from: 4148 · imports: 3840 · contains: 3661 · calls: 591 · re_exports: 519 · method: 29


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 1098 · Candidates: 1206
- Excluded: 38 untracked · 100994 ignored · 8 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `77c52f6`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `workOsColors()` - 111 edges
2. `workOsSpace` - 110 edges
3. `workOsType` - 109 edges
4. `Text` - 81 edges
5. `WORK_OS_CHART_SERIES` - 61 edges
6. `WORK_OS_FIXTURE_ORDERS` - 61 edges
7. `useTheme()` - 51 edges
8. `workOsRadius` - 47 edges
9. `WorkOsColorScheme` - 41 edges
10. `workOsSprings` - 41 edges

## Surprising Connections (you probably didn't know these)
- `assertJsonApiResponse()` --calls--> `MobileApiError`  [EXTRACTED]
  services/api/mobile-client.ts → services/api/mobile-client.ts  _Bridges community 12 → community 8_
- `getFirebaseDb()` --calls--> `getFirebaseApp()`  [EXTRACTED]
  services/firebase/index.ts → services/firebase/index.ts  _Bridges community 15 → community 65_
- `hydrateEffectiveProfile()` --calls--> `resolveOwnedCompanyId()`  [EXTRACTED]
  services/firebase/profile.ts → services/firebase/profile.ts  _Bridges community 25 → community 65_
- `isProductionCompanyId()` --calls--> `isUnassignedCompanyId()`  [EXTRACTED]
  lib/company-id.ts → lib/company-id.ts  _Bridges community 43 → community 15_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (96): ActiveJobHero, ActiveJobHeroProps, ActivityRow, ActivityRowProps, BayColumnHeader, BayColumnHeaderProps, BrowseTile, BrowseTileProps (+88 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (73): WORK_OS_CHART_SERIES, WORK_OS_CYCLE_TIME, ThroughputBars, ThroughputBarsProps, TrendSparkline, TrendSparklineProps, WORK_OS_FIXTURE_ORDERS, WorkOsFixtureOrder (+65 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (79): SettingsToggleRowProps, WorkspaceStorageCardProps, TabScreenPlaceholderProps, ActionIconButton, ActionIconButtonProps, ActionIconButtonSize, ActionIconButtonVariant, ICON_SIZES (+71 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (77): AccountingScreen(), assertValidPayload(), createFinancialOperation(), CreatePayload, createTypedFinancialOperation(), BUILTIN_CATEGORY_SUGGESTIONS, CreateOperationScreen(), parseAmountInput() (+69 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (61): ActivityCard, ActivityCardProps, AnalyticsCard, AnalyticsCardProps, BusinessCardShell(), BusinessCardShellProps, CustomerCard, CustomerCardProps (+53 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (56): ProfileEnterConfig, ScanEnterConfig, HighlightedText(), HighlightedTextProps, splitHighlightParts(), TextComponentProps, TextPart, SearchBar() (+48 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (58): computeAccountingSnapshot(), ComputeAccountingSnapshotInput, emptyAccountingSnapshot(), accountingQuickActions, CATEGORY_ICONS, CategoryIcon, styles, IntakeOutboxBannerProps (+50 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (52): scanSheetAnimationConfigs, ScanCandidatesSheet, ScanCandidatesSheetProps, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanDocumentSheet, ScanDocumentSheetProps, ScanIdleIndicator() (+44 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (58): getBearerToken(), MobileApiError, fetchNotificationInbox(), InboxResponse, markAllNotificationsRead(), markNotificationState(), PreferencesResponse, registerNotificationDevice() (+50 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (55): resolveInviteHref(), buildImportDeepLink(), buildOrderDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink(), AI_EVENTS, DOCUMENT_EVENTS, DocumentEventType (+47 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (45): featureDelay(), paywallDuration, paywallEase, paywallEnter, paywallSpring, paywallTimeline, PaywallEnterConfig, usePaywallEnter() (+37 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (33): McWeekBars(), McWeekBarsProps, AuthEmailChipProps, InviteFormNoticeProps, AcAccountingSkeleton(), McRevenueCard, McRevenueCardProps, McStatTiles (+25 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (43): DocumentImportJobStatus, DocumentImportUploadResult, getDocumentImportStatus(), pollDocumentImportUntilSettled(), uploadDocumentImport(), uploadDocumentImportWithRetry(), mobileApi, SendEmployeeInviteResult (+35 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (46): FormListRow(), FormListSplitRow(), GroupedList(), GroupedSection(), STEP_SUBTITLES, STEPS, WizardStepHeader(), WizardStepHeaderProps (+38 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (41): AuthGate(), ErrorBoundary(), ExpoRouterErrorBoundaryProps, queryClient, RootNavigator(), getStartupSummary(), clearRealtimeSubscriptions(), CacheSettingsScreen() (+33 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (27): getFirebaseDb(), BarcodeMapping, barcodeMappingRepository, documentGenerationJobRepository, FinancialOperationsFilters, mapOperation(), readAmount(), notifyFirestoreSnapshotError() (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (50): activateProForever(), AppAccountTokenResponse, AppleVerificationRejection, fetchAppAccountToken(), refreshCompanyBilling(), restoreApplePurchases(), RestoreApplePurchasesRequest, RestoreApplePurchasesResponse (+42 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (34): ChartPoint, LineChart, LineChartProps, Props, resolveHomeAccent(), HomeActivity(), HomeAiInsightCard(), HomeAttention() (+26 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (48): HomeDashboard, ACTIVE_INTAKE, buildAiInsight(), buildAttentionRows(), buildHomeNow(), buildHomeToday(), buildHomeTrend(), buildOperationalHealth() (+40 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (34): AutocompleteDataStore, EMPTY, useAutocompleteDataStore, createClientSchema, createVehicleSchema, workOrderLaborLineSchema, workOrderMotorLineSchema, workOrderPartLineSchema (+26 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (41): ScanLauncherButton(), ScanLauncherButtonProps, ScanLauncherRow(), isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload() (+33 more)

### Community 21 - "Community 21"
Cohesion: 0.06
Nodes (25): WORK_OS_DESIGN_DOC_0, WORK_OS_DESIGN_DOC_1, WORK_OS_DESIGN_DOC_2, WORK_OS_DESIGN_DOC_3, WORK_OS_DESIGN_DOC_4, WORK_OS_DESIGN_DOC_5, WORK_OS_DESIGN_DOC_6, WORK_OS_DESIGN_DOC_7 (+17 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (33): ActivityRow, ActivityRowProps, expandTransition, McActivityFeed, McActivityFeedProps, McAttentionBanner, McAttentionBannerProps, McFeaturedInsight (+25 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (31): AiBlockList(), Props, AiActionBlock, AiConfirmationBlock, AiMetricBlock, AiObjectCardBlock, AiTextBlock, AiTimelineBlock (+23 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (35): fetchSessionBootstrapFromApi(), accountUsesPassword(), deleteAccountForCurrentUser(), DeleteAccountInput, isCancelled(), reauthenticateForDeletion(), AuthActions, AuthActionsContext (+27 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (36): companyAppConfigRef(), loadCompanyAppConfig(), saveCompanyAppConfig(), subscribeCompanyAppConfig(), AccessibleCompany, buildFallbackProfile(), CompanyDocShape, companyHasBusinessData() (+28 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (26): OrderTransitionContext, OrderTransitionContextValue, SourceLayout, useOrderTransition(), OrdersEnterConfig, useOrdersEnter(), OrderCard, OrderCardProps (+18 more)

### Community 27 - "Community 27"
Cohesion: 0.06
Nodes (32): isCompleteFullName(), MemoAppTree, styles, SubscriptionRequiredScreen, WorkspaceAccessScreen, useAuthHasAccess(), AuthRedirectEffect(), armLoginRiseHandoff() (+24 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (25): DeleteAccountDialog(), DeleteAccountDialogProps, ProfileScreenShell(), ProfileScreenShellProps, ROLE_LABELS, WorkspaceHeroCard(), WorkspaceHeroCardProps, useGuardedRouter() (+17 more)

### Community 29 - "Community 29"
Cohesion: 0.08
Nodes (35): HIDDEN_TAB_ROUTES, ROOT_APP_ROUTES, TAB_ROUTE_ORDER, TAB_SPECS, TabSpec, ActionSheetState, useActionSheetStore, presentActionSheet() (+27 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (31): AdvanceSnapshot, ac, AccountingAttentionAction, AccountingQuickActionId, AccountingSnapshot, AttentionTone, CashFlowPeriod, InvoiceStatus (+23 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (33): updateNotificationPreferences(), fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord(), markAllInboxNotificationsRead(), subscribeInboxFromFirestore(), updateInboxNotificationState() (+25 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (24): BalanceSnapshot, calculateCashBalance(), AccountingHeroMetrics, buildAccountingHeroMetrics(), buildRawWeekBars(), isIncomeOperation(), acTimeline, whTimeline (+16 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (20): OrderTransitionProvider(), profileSpring, profileTimeline, SettingsHubCardProps, SettingsGroupProps, SettingsSectionTitleProps, CreateInventoryItemScreen(), ordersLayout (+12 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (32): OrderPickerSheet, OrderPickerSheetProps, OPTIONS, WarehouseFilter, WarehouseFilterBar(), WarehouseFilterBarProps, WarehouseHeader(), StepperButton (+24 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (37): finalizeEngineIntakePhoto(), prepareEngineIntakePhoto(), sendEngineIntakeCommand(), buildSnapshot(), clearFailedIntakeOutbox(), commandFailureBlocksJob(), countPendingCommands(), countPhotoFailed() (+29 more)

### Community 36 - "Community 36"
Cohesion: 0.08
Nodes (31): CATEGORY_ICONS, growthPercent(), buildAttentionItems(), buildBalanceTrend(), buildCashFlow(), buildDailySeries(), buildExpenseCategories(), buildInvoices() (+23 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (23): scanSpring, scanTimeline, ScanConfirmFlash(), ScanConfirmFlashProps, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanFrameOverlay() (+15 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (24): canUseNativeGoogleSignIn(), configureNativeGoogleSignIn(), mapNativeGoogleSignInError(), signInWithGoogleNative(), getGoogleOAuthEnv(), GoogleOAuthEnv, isGoogleOAuthConfigured(), AuthEmailChip() (+16 more)

### Community 39 - "Community 39"
Cohesion: 0.07
Nodes (28): ScanUnknownSheet, ScanUnknownSheetProps, useMobileAssignAssetLocation(), useDevMockFallback(), useScanExperience(), classifyScanPayload(), ENTITY_PREFIXES, hasValidEanChecksum() (+20 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (25): isMotorSaleOperation(), motorSaleDetail(), motorSaleMotorId(), nextPayrollStatus(), PAYROLL_STATUS_LABELS, enqueueMotorSoldEffects(), fetchMotorWarrantyId(), AcMotorSaleDocumentsSheet (+17 more)

### Community 41 - "Community 41"
Cohesion: 0.07
Nodes (27): asPurchaseFailure(), CODE_MAP, failure(), isCancellation(), isPurchaseFailure(), MESSAGES, readErrorCode(), toPurchaseFailure() (+19 more)

### Community 42 - "Community 42"
Cohesion: 0.08
Nodes (28): ADVANCE_KEYWORDS, AdvanceDirection, advanceDirectionLabel(), appendAdvanceMarker(), buildAdvanceSnapshot(), filterAdvanceOperations(), isAdvanceOperation(), isAdvanceText() (+20 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (25): PayrollTransactionRepository, vehicleRepository, warehouseRepository, WorkOrderRepository, useMotorsRealtime(), useOperationsRealtime(), usePayrollTransactionsRealtime(), usePresenceHeartbeat() (+17 more)

### Community 44 - "Community 44"
Cohesion: 0.08
Nodes (28): ordersSpring, ordersTimeline, COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBar(), ComposerTabBarProps, ComposerTabOption (+20 more)

### Community 45 - "Community 45"
Cohesion: 0.10
Nodes (30): AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS, mapAccountingSettings(), patchAccountingSettings(), readStringArray(), saveAccountingLists(), saveUserDisplayCurrency(), subscribeAccountingSettings() (+22 more)

### Community 46 - "Community 46"
Cohesion: 0.09
Nodes (24): claimWorkOrder(), OrderDetailActionStrip(), OrderDetailActionStripProps, OrderDetailActionTab(), OrderDetailActionTabProps, TAB_LABEL_STYLE, TabIcon, OrderStatusMoreSheet (+16 more)

### Community 47 - "Community 47"
Cohesion: 0.08
Nodes (29): transitionWorkOrder(), OrdersLiftContext, OrdersLiftContextValue, OrdersLiftProvider(), OrdersLiftSession, useOrdersLift(), FilterIcon, explainCannotComplete() (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.08
Nodes (23): OrderRowSkeletonProps, OrdersLoadingState(), OrdersLoadingStateProps, OrderClaimSection(), OrderClaimSectionProps, OrderLine, OrderLinesList(), OrderLinesListProps (+15 more)

### Community 49 - "Community 49"
Cohesion: 0.09
Nodes (30): PlanOffer, UseSubscriptionResult, allStoreSkus(), PlanAvailability, planById(), PlanDescriptor, planForSku(), purchasablePlans() (+22 more)

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (22): UserAvatar(), ProfileHeader(), ProfileHeroCard(), ProfileHeroCardProps, useReleaseStackNavigationOnFocus(), guardedPush(), PushRouter, navigationHrefKey() (+14 more)

### Community 51 - "Community 51"
Cohesion: 0.08
Nodes (21): OrdersFilterMenuItem, OrdersFilterMenuProps, OrdersFilterMenu(), OrdersFilterMenuItem, OrdersFilterMenuProps, OrdersHeader(), OrdersHeaderProps, OrdersMailListProps (+13 more)

### Community 52 - "Community 52"
Cohesion: 0.07
Nodes (32): autocoreEase, duration, enterValues, presets, smoothEase, spring, staggerDelay(), dialogBackdropEnter (+24 more)

### Community 53 - "Community 53"
Cohesion: 0.08
Nodes (22): getPublicApiBaseUrl(), AppleSignInApiPayload, AppleSignInApiResponse, AuthEmailApiError, PasswordResetDelivery, postAuthEmailApi(), sendPasswordResetViaApi(), sendVerificationEmailViaApi() (+14 more)

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (23): NavEditorRowProps, NavigationEditorListProps, ACCOUNTING_DEMO, PERMISSION_GROUPS, DEFAULT_NAV_ENABLED, DEFAULT_NAV_ORDER, MORE_TAB_ID, NAV_ITEM_DEFINITIONS (+15 more)

### Community 55 - "Community 55"
Cohesion: 0.10
Nodes (28): companySubscriptionRef(), mapSubscription(), readCompanySubscription(), subscribeCompanySubscription(), SubscriptionDoc, toDate(), CachedEntitlement, CachedSubscription (+20 more)

### Community 56 - "Community 56"
Cohesion: 0.10
Nodes (26): animationSpeed, borderStyle(), buttonHeight, A11ySlice, DesignLanguageContext, cornerStyle, glassStyle, iconWeight (+18 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (19): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, InputField (+11 more)

### Community 58 - "Community 58"
Cohesion: 0.09
Nodes (17): TeamProGate(), TeamProGateProps, removeEmployee(), setEmployeeActive(), setEmployeePermissionOverrides(), setEmployeeRole(), TeamScreen(), TeamTab (+9 more)

### Community 59 - "Community 59"
Cohesion: 0.10
Nodes (21): coerceInventoryString(), mapItem(), normalizeInventoryItem(), useClientsRealtime(), MODULE_KEY_TO_PRODUCT, useCompanyModuleEnabled(), useModuleEnabled(), useProductModuleEnabled() (+13 more)

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (22): buildDocumentFilename(), buildDocumentPdfPath(), buildPdfPath(), DocumentAggregateType, fetchDocumentPdf(), fetchWorkOrderDocumentPdf(), mobileFetchBlob(), downloadPdfFromApi() (+14 more)

### Community 61 - "Community 61"
Cohesion: 0.10
Nodes (20): DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus, ImportSuccessView() (+12 more)

### Community 62 - "Community 62"
Cohesion: 0.10
Nodes (16): IntakeCreateIdentityDraft, IntakeCreateSerialSheet, IntakeCreateSerialSheetProps, IntakeCreateSerialSheetRef, SHEET_SPRING, styles, IntakeJobRow(), IntakeJobRowProps (+8 more)

### Community 63 - "Community 63"
Cohesion: 0.11
Nodes (22): DocumentAction, OrderDocumentsSection(), OrderDocumentsSectionProps, orderShowsOilIntervalTag(), textMatches(), resolveApplicableDocumentSlugs(), resolveDocumentsForOrderCompleted(), resolveDocumentsForOrderCreated() (+14 more)

### Community 64 - "Community 64"
Cohesion: 0.12
Nodes (18): formatCounter(), formatGroupedInteger(), McAnimatedCounter(), McAnimatedCounterProps, McCounterFormat, mcDuration, mcMotion, mcSpring (+10 more)

### Community 65 - "Community 65"
Cohesion: 0.11
Nodes (16): AvatarUploadResult, uploadUserAvatar(), firebaseConfig, getFirebaseApp(), getFirebaseAuth(), isFirebaseConfigured(), bootstrappedUids, markSyncAuthPrepared() (+8 more)

### Community 66 - "Community 66"
Cohesion: 0.10
Nodes (15): acceptInvite(), declineInvite(), fetchInvitePreview(), CompanyJourneyScreen(), CompanyMode, JourneyOptionCard(), JourneyOptionCardProps, AuthShell() (+7 more)

### Community 67 - "Community 67"
Cohesion: 0.12
Nodes (17): buildNativeButtonModifiers(), mapBorderShape(), mapButtonStyle(), mapControlSize(), SwiftButtonStyle, SwiftControlSize, NativeButton, NativeButtonProps (+9 more)

### Community 68 - "Community 68"
Cohesion: 0.14
Nodes (19): hydrateMembershipNames(), listUserCompanyMemberships(), loadEmployeeCompanyMemberships(), loadOwnedCompanyMemberships(), loadStoredMemberships(), mergeCompanyMemberships(), recordUserCompanyMembership(), repairMissingMemberships() (+11 more)

### Community 69 - "Community 69"
Cohesion: 0.10
Nodes (19): CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, fontMap, radiusMap, sizeMap, OrganizationMembershipRow, OrganizationMembershipRowProps (+11 more)

### Community 70 - "Community 70"
Cohesion: 0.08
Nodes (14): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+6 more)

### Community 71 - "Community 71"
Cohesion: 0.10
Nodes (15): NotificationCard, ActivityDateGroup(), ActivityDateGroupProps, ActivityNotificationRow, ActivityNotificationRowProps, SwipeActionProps, NotificationInboxSkeleton(), NotificationRowSkeletonProps (+7 more)

### Community 72 - "Community 72"
Cohesion: 0.11
Nodes (15): IntakeCamera, IntakeCameraHandle, IntakeCameraProps, IntakeCaptureDock(), IntakeCaptureDockProps, IntakeSessionDone(), IntakeSessionDoneProps, EngineIntakeSessionScreen() (+7 more)

### Community 73 - "Community 73"
Cohesion: 0.10
Nodes (19): goBackOrReplace(), PROFILE_SETTINGS_HUB_HREF, StackBackRouter, Dialog(), DialogProps, IconButton, IconButtonProps, sizes (+11 more)

### Community 74 - "Community 74"
Cohesion: 0.09
Nodes (17): AuthEmailPill(), AuthEmailPillProps, AnimatedLine, AuthHeroCar(), FRONT_WHEEL, HERO_DISPLAY_HEIGHT, HERO_DISPLAY_WIDTH, REAR_WHEEL (+9 more)

### Community 75 - "Community 75"
Cohesion: 0.11
Nodes (11): getOAuthButtonTheme(), OAuthButtonTheme, OAuthProvider, ElevationLevel, ringBorder(), ShadowKey, createCardStyle(), createInputTextStyle() (+3 more)

### Community 76 - "Community 76"
Cohesion: 0.14
Nodes (20): useRealtimeReconnect(), useSessionBootstrapReady(), acquireRealtimeSubscription(), applyCachedSnapshot(), areAcquiredSessionListenersReady(), areInteractiveSessionReady(), attachListener(), getSessionBootstrapStatus() (+12 more)

### Community 77 - "Community 77"
Cohesion: 0.13
Nodes (19): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+11 more)

### Community 78 - "Community 78"
Cohesion: 0.12
Nodes (18): AUTO_TYPE_SET, PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES, styles (+10 more)

### Community 79 - "Community 79"
Cohesion: 0.13
Nodes (20): useEntitlement(), useEntitlementFor(), UseEntitlementResult, acquireEntitlement(), clearEntitlementRegistry(), clearSettleTimer(), EntitlementSnapshot, getEntitlementSnapshot() (+12 more)

### Community 80 - "Community 80"
Cohesion: 0.11
Nodes (13): ENTER_FADE, EXIT_FADE, sheetIn, sheetOut, toastIn(), toastOut(), toast(), ToastAction (+5 more)

### Community 81 - "Community 81"
Cohesion: 0.13
Nodes (13): DeviceClass, useAdaptiveLayout(), getFloatingTabBarOffset(), getScreenActionScrollInset(), BreakpointKey, breakpoints, platform, screen (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.12
Nodes (14): ActionSheetHost(), AnimatedTabScreenProps, StaticTabScreen, isTabRouteName(), NO_TRANSITION, resolveTabRouteName(), TAB_ORDER, TabRouteName (+6 more)

### Community 83 - "Community 83"
Cohesion: 0.13
Nodes (14): AuthProviderKind, badgeSize, monogramFontSize, UserAvatarProps, UserAvatarSize, AppleSignInButton(), AppleSignInButtonProps, AppleIcon() (+6 more)

### Community 84 - "Community 84"
Cohesion: 0.11
Nodes (17): sendEmployeeInviteEmail(), TeamInvitePresentOptions, TeamInviteSheet, TeamInviteSheetProps, TeamInviteSheetRef, TTL_OPTIONS, createCompanyInvite(), CreateInviteApiResponse (+9 more)

### Community 85 - "Community 85"
Cohesion: 0.17
Nodes (16): BASE, getNativeInputProps(), NativeProps, resolveAutocompleteType(), AutocompleteConfig, AutocompleteFuelBadge, AutocompleteOptionMeta, AutocompleteReplaceMode (+8 more)

### Community 86 - "Community 86"
Cohesion: 0.12
Nodes (14): ProfileAnimatedSectionProps, ProfileSegmentedControl(), ProfileSegmentedControlProps, ThemePreference, AppearanceSettingsScreen(), THEME_OPTIONS, AccentColorId, AppearanceSettings (+6 more)

### Community 87 - "Community 87"
Cohesion: 0.16
Nodes (18): mapAssignment(), mapEvent(), mapJob(), mapPhoto(), mapReworkRequest(), mapSession(), subscribeEngineIntakeEvents(), subscribeEngineIntakeJobs() (+10 more)

### Community 88 - "Community 88"
Cohesion: 0.10
Nodes (17): CommonControlledStateProps, useControlledState(), CheckIcon, CopyIcon, Checkbox(), CheckboxProps, CopyButton, CopyButtonProps (+9 more)

### Community 89 - "Community 89"
Cohesion: 0.10
Nodes (17): ChevronRightIcon, CollectionList(), CollectionListProps, CollectionRowProps, CollectionSwitchRow, CollectionSwitchRowProps, pressTiming, SwipeableRow() (+9 more)

### Community 90 - "Community 90"
Cohesion: 0.19
Nodes (5): acceptsCameraInput(), activeResultForOutcome(), isInstantOutcome(), ScanService, sheetKindForOutcome()

### Community 91 - "Community 91"
Cohesion: 0.13
Nodes (14): AuthBootLoadingProps, AuthBrandMark(), AuthLoadingScreen(), AuthLoadingScreenProps, AuthSplashSurface(), AuthSplashSurfaceProps, enterEase, exitEase (+6 more)

### Community 92 - "Community 92"
Cohesion: 0.12
Nodes (15): getAutocompleteDataSnapshot(), AutocompleteOverlay, AutocompleteOverlayProps, DockPanelProps, InlineAutocomplete, InlineAutocompleteEmpty(), AutocompleteAnchor, AutocompleteSession (+7 more)

### Community 93 - "Community 93"
Cohesion: 0.11
Nodes (12): BOARD_KEYS, DOCS, WorkOsCatalogHarness(), HealthRing, HealthRingProps, OpsTable, OpsTableColumn, OpsTableProps (+4 more)

### Community 94 - "Community 94"
Cohesion: 0.13
Nodes (10): fetchLocationContentsFromFirestore(), listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, buildLocationEntityLink() (+2 more)

### Community 95 - "Community 95"
Cohesion: 0.18
Nodes (16): SubscriptionStatusCard(), SubscriptionStatusCardProps, TrialCountdown(), TrialCountdownProps, WorkspaceSubscriptionCard(), WorkspaceSubscriptionCardProps, daysUntil(), formatDaysRemaining() (+8 more)

### Community 96 - "Community 96"
Cohesion: 0.16
Nodes (13): OperationsLiveActivityHost(), OperationsLiveActivity, OperationsLiveActivityProps, DesiredLiveActivity, liveActivityContentKey(), LiveActivityMode, LiveActivitySignals, progressFields() (+5 more)

### Community 97 - "Community 97"
Cohesion: 0.11
Nodes (18): body, callout, caption1, caption2, fontWeight, footnote, headline, identifier (+10 more)

### Community 98 - "Community 98"
Cohesion: 0.24
Nodes (15): AutocompleteDataSnapshot, computeMatchRanges(), inferEngineFuelBadge(), mergeEngineCustomOptions(), searchAutocomplete(), searchCategories(), searchCustomers(), searchEmployees() (+7 more)

### Community 99 - "Community 99"
Cohesion: 0.17
Nodes (13): filterAutocompleteOptions(), uniqueAutocompleteOptions(), AutocompleteOptionDisplay, formatAutocompleteOption(), AutocompleteOption, ComposerVehicleForm, brandByKey, brands (+5 more)

### Community 100 - "Community 100"
Cohesion: 0.20
Nodes (17): CachedRealtimeSnapshot, clearRealtimeSnapshots(), flushOneWrite(), isFresh(), lastDataJsonByKey, memoryCache, PendingWrite, pendingWrites (+9 more)

### Community 101 - "Community 101"
Cohesion: 0.19
Nodes (13): exchangeAppleSignInViaApi(), formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), applyAppleProfileFromCredential(), buildAppleApiPayload() (+5 more)

### Community 102 - "Community 102"
Cohesion: 0.18
Nodes (12): MODULE_KEYS, SetupWizardScreen(), BUSINESS_PRESETS, BusinessPresetId, categoriesForPreset(), CATEGORY_PRESETS, DEFAULT_COMPANY_MODULES, defaultCompanyAppConfig() (+4 more)

### Community 103 - "Community 103"
Cohesion: 0.19
Nodes (11): ModulesEditorList(), ModulesEditorListProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, ModuleDefinition, BoxIcon, ModulesScreen() (+3 more)

### Community 104 - "Community 104"
Cohesion: 0.17
Nodes (14): OrderRow, OrdersMailList(), Bucket, BUCKET_LABEL, BUCKET_ORDER, bucketFor(), buildOrderRows(), buildOrderSections() (+6 more)

### Community 105 - "Community 105"
Cohesion: 0.18
Nodes (13): DEFAULT_STATE, DEV_PRICES, DevScenario, DevState, devSubscription(), emit(), getDevState(), hydrate() (+5 more)

### Community 106 - "Community 106"
Cohesion: 0.15
Nodes (13): TeamDirectoryComposer(), TeamDirectoryComposerProps, TeamDirectoryRow, TeamDirectoryRowProps, styles, TeamInviteCardProps, TeamInviteRow, TeamBadge() (+5 more)

### Community 107 - "Community 107"
Cohesion: 0.16
Nodes (9): financeSettingsHref(), FinanceSettingsReturnTo, openFinanceSettings(), OpenFinanceSettingsRouter, resolveFinanceSettingsReturnHref(), RETURN_TO_KEYS, FinanceSettingsScreen(), ListPanelProps (+1 more)

### Community 108 - "Community 108"
Cohesion: 0.15
Nodes (8): ScreenEnterConfig, useFadeIn(), usePageEnter(), useStaggerFadeIn(), cardLift, cardPress, motionTiming, skeletonPulse

### Community 109 - "Community 109"
Cohesion: 0.23
Nodes (12): isSameStackInboxReturn(), notificationInboxHref(), NotificationInboxReturnTo, OpenInboxRouter, openNotificationInbox(), resolveInboxReturnToFromSegments(), resolveInboxReturnToFromTab(), resolveNotificationInboxReturnHref() (+4 more)

### Community 110 - "Community 110"
Cohesion: 0.21
Nodes (14): applyNow(), clearScheduledQueryDataApplies(), drainOne(), flushScheduledQueryDataApplies(), getMsSinceLastCatalogApply(), getPendingQueryDataApplyCount(), keyOf(), markCatalogApplyNow() (+6 more)

### Community 111 - "Community 111"
Cohesion: 0.19
Nodes (7): HighlightedText, HighlightedTextProps, InlineAutocompleteProps, InlineAutocompleteRenderArgs, InlineAutocompleteRow, InlineAutocompleteRowProps, styles

### Community 112 - "Community 112"
Cohesion: 0.18
Nodes (8): createWorkOrderSchema, stripUndefinedDeep(), allocateWorkOrderNumber(), mapWorkOrder(), normalizePricing(), workOrderCounterRef(), CreateWorkOrderInput, UpdateWorkOrderInput

### Community 113 - "Community 113"
Cohesion: 0.22
Nodes (10): createDirectoryPerson(), directoryCollection(), markDirectoryPersonInvited(), removeDirectoryPerson(), subscribeCompanyDirectory(), useCompanyDirectory(), DirectoryPerson, DirectoryPersonStatus (+2 more)

### Community 114 - "Community 114"
Cohesion: 0.18
Nodes (8): setEmployeeShiftOn(), subscribeCompanyEmployees(), useEmployeesRealtime(), buildWeekBars(), MyEarningsScreen(), MyEarningsScreenProps, WEEKDAY_SHORT_EN, weekDayShortLabel()

### Community 115 - "Community 115"
Cohesion: 0.16
Nodes (9): useFeatureGate(), UseFeatureGateResult, LockIcon, FeatureGateProps, FeatureLockedCardProps, evaluateGate(), FeatureLockedError, FeatureRule (+1 more)

### Community 116 - "Community 116"
Cohesion: 0.19
Nodes (6): ProfileNameJourneyScreen(), VerifyEmailJourneyScreen(), VerificationCodeInput(), VerificationCodeInputProps, updateUserProfileName(), authJourneyProgressLabel()

### Community 117 - "Community 117"
Cohesion: 0.24
Nodes (10): useAccessibility(), useFontScale(), useHighContrast(), useIsRTL(), useReducedMotion(), useScreenReaderEnabled(), useDesignLanguage(), designLanguageFromScheme() (+2 more)

### Community 118 - "Community 118"
Cohesion: 0.26
Nodes (10): ScanDocumentUploadResult, uploadScanDocument(), formatRelativeTime(), loadRecentScans(), mapStored(), migrateLegacyIfNeeded(), normalizeStored(), readMmkv() (+2 more)

### Community 119 - "Community 119"
Cohesion: 0.23
Nodes (12): highestPlan(), PLANS, entitlementsEqual(), FREE_ENTITLEMENT, fromLocal(), fromSubscription(), isManagedExternally(), LocalActiveSubscription (+4 more)

### Community 120 - "Community 120"
Cohesion: 0.18
Nodes (8): ActivityFeedFilters(), ActivityFeedFiltersProps, READ_FILTERS, useNotificationInboxRealtime(), useNotificationService(), NotificationProvider(), NotificationProviderProps, useNotificationStore

### Community 121 - "Community 121"
Cohesion: 0.26
Nodes (10): AddToOrderHandlers, MotorActionHandlers, motorActionMessage(), motorActionTitle(), openSearchResult(), SearchRouter, showCatalogActions(), showMotorActions() (+2 more)

### Community 122 - "Community 122"
Cohesion: 0.26
Nodes (8): hideNativeSplashAndLogStartup(), hideNativeSplashOnce(), getStartupMarks(), logStartupTable(), MarkEntry, marks, markStartup(), StartupMark

### Community 123 - "Community 123"
Cohesion: 0.21
Nodes (1): ScanDebounce

### Community 124 - "Community 124"
Cohesion: 0.26
Nodes (9): ALL_PERMISSIONS, ASSIGNABLE_ROLES, employeeDisplayName(), formatLastActive(), formatRole(), permissionsSummary(), TeamEmployeeCard, TeamEmployeeCardProps (+1 more)

### Community 125 - "Community 125"
Cohesion: 0.24
Nodes (7): Listener, listeners, resetAppShellReady(), setAppShellReady(), SessionBootstrapGate, hasSeenCatalogApply(), setShellRevealed()

### Community 126 - "Community 126"
Cohesion: 0.29
Nodes (6): AnimatedPolyline, McAnimatedSparkline(), McAnimatedSparklineProps, buildSparklinePoints(), normalizeSparkline(), sanitizeChartSeries()

### Community 127 - "Community 127"
Cohesion: 0.22
Nodes (6): CoCategoryField(), CoCategoryFieldProps, PillProps, LayoutGridIcon, PlusIcon, SearchIcon

### Community 128 - "Community 128"
Cohesion: 0.27
Nodes (5): useSessionQueryData(), EngineObjectScreen(), ObjectSection, ObjectShell(), ObjectShellProps

### Community 129 - "Community 129"
Cohesion: 0.22
Nodes (8): APP_ICON, AuthBrandMarkProps, LOCKUP, LOGIN_FONT, LOGIN_GAP, LOGIN_ICON, LOGIN_LOCKUP, SPLASH_LOCKUP

### Community 130 - "Community 130"
Cohesion: 0.28
Nodes (6): ProfileDangerZoneProps, ProfileNavCard(), ProfileNavCardProps, ProfileSettingsGroup(), ProfileSettingsGroupProps, ProfileDangerAction

### Community 131 - "Community 131"
Cohesion: 0.39
Nodes (7): formatVin(), inventoryCardSubtitle(), normalizeCompareKey(), normalizeInventoryCode(), mapMotorToSearchResult(), resolveMotorShelf(), convertPrice()

### Community 132 - "Community 132"
Cohesion: 0.42
Nodes (8): can(), canEditInventory(), canEditWorkOrders(), canManageEmployees(), canManageSettings(), canViewEmployees(), canViewInventory(), canViewWorkOrders()

### Community 133 - "Community 133"
Cohesion: 0.33
Nodes (5): formatPlatformPhone(), getPlatformContacts(), PlatformContacts, readEnv(), VersionSettingsScreen()

### Community 134 - "Community 134"
Cohesion: 0.25
Nodes (3): AnimatedPath, AppLoadingLogoProps, easeInOut

### Community 135 - "Community 135"
Cohesion: 0.32
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 136 - "Community 136"
Cohesion: 0.57
Nodes (6): fieldKey(), readFieldValues(), readRecentValues(), rememberFieldValue(), rememberRecentValue(), storageKey()

### Community 137 - "Community 137"
Cohesion: 0.33
Nodes (4): Menu(), MenuItem, MenuProps, StyleSheetFill

### Community 138 - "Community 138"
Cohesion: 0.33
Nodes (5): ListGroup(), ListGroupProps, Surface(), SurfaceProps, SurfaceVariant

### Community 139 - "Community 139"
Cohesion: 0.47
Nodes (5): normalizeMethods(), ResolveEmailLookupResult, ResolveEmailResponse, resolveEmailSignInMethodsLookup(), resolveEmailSignInMethodsViaApi()

### Community 140 - "Community 140"
Cohesion: 0.33
Nodes (3): WORK_OS_DAY_FIXTURES, WORK_OS_INTAKE_FIXTURES, WorkOsIntakeFixtureJob

### Community 141 - "Community 141"
Cohesion: 0.40
Nodes (5): config, { getDefaultConfig }, path, sharedPackages, { withNativeWind }

### Community 142 - "Community 142"
Cohesion: 0.33
Nodes (5): DETENT_POINTS, Sheet, SHEET_SPRING, SheetDetent, SheetProps

### Community 143 - "Community 143"
Cohesion: 0.60
Nodes (3): EngineIntakeLaunch(), IntakeLaunchCard(), CameraIcon

### Community 144 - "Community 144"
Cohesion: 0.40
Nodes (3): METRICS, PremiumBadgeProps, PremiumBadgeSize

### Community 145 - "Community 145"
Cohesion: 0.40
Nodes (4): Sidebar(), SidebarItem, SidebarProps, SidebarSection

### Community 146 - "Community 146"
Cohesion: 0.67
Nodes (3): parseFeature(), PaywallRoute(), FEATURE_MATRIX

### Community 147 - "Community 147"
Cohesion: 0.83
Nodes (3): generateInviteCode(), generateInviteToken(), pickFromAlphabet()

### Community 148 - "Community 148"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 149 - "Community 149"
Cohesion: 0.50
Nodes (1): { withEntitlementsPlist }

### Community 150 - "Community 150"
Cohesion: 0.50
Nodes (3): Navbar(), NavbarProps, NavItem

### Community 151 - "Community 151"
Cohesion: 0.50
Nodes (3): RadioGroup(), RadioGroupProps, RadioOption

### Community 152 - "Community 152"
Cohesion: 0.50
Nodes (3): Segment, SegmentedControl(), SegmentedControlProps

### Community 154 - "Community 154"
Cohesion: 0.67
Nodes (1): ExternalLinkProps

### Community 155 - "Community 155"
Cohesion: 0.67
Nodes (1): ProfileMetaCardProps

### Community 156 - "Community 156"
Cohesion: 0.67
Nodes (1): SectionTitleProps

### Community 157 - "Community 157"
Cohesion: 0.67
Nodes (1): SettingsAnimatedCardProps

### Community 158 - "Community 158"
Cohesion: 0.67
Nodes (1): SettingsCardProps

### Community 159 - "Community 159"
Cohesion: 0.67
Nodes (2): WORK_OS_SYMBOLS, WorkOsSymbolKey

### Community 161 - "Community 161"
Cohesion: 0.67
Nodes (2): TabBarVisibilityState, useTabBarVisibilityStore

## Knowledge Gaps
- **1053 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+1048 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 123`** (1 nodes): `ScanDebounce`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 149`** (1 nodes): `{ withEntitlementsPlist }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (1 nodes): `ExternalLinkProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (1 nodes): `ProfileMetaCardProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (1 nodes): `SectionTitleProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (1 nodes): `SettingsAnimatedCardProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (1 nodes): `SettingsCardProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (2 nodes): `WORK_OS_SYMBOLS`, `WorkOsSymbolKey`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (2 nodes): `TabBarVisibilityState`, `useTabBarVisibilityStore`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 17` to `Community 23`, `Community 111`, `Community 3`, `Community 16`, `Community 10`, `Community 95`, `Community 7`, `Community 117`, `Community 31`, `Community 6`, `Community 128`, `Community 28`, `Community 86`, `Community 114`, `Community 58`, `Community 115`, `Community 144`, `Community 29`, `Community 82`, `Community 80`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Community 32` to `Community 102`, `Community 16`, `Community 17`, `Community 7`, `Community 68`, `Community 79`, `Community 115`, `Community 18`, `Community 31`, `Community 59`, `Community 6`, `Community 43`, `Community 49`, `Community 96`, `Community 71`, `Community 128`, `Community 19`, `Community 120`, `Community 27`, `Community 23`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `ScanService` connect `Community 90` to `Community 20`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _1053 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02876358614063532 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06756623658032108 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.02402022756005057 - nodes in this community are weakly interconnected._