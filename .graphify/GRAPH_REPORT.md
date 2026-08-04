# Graph Report - .  (2026-08-02)

## Corpus Check
- Large corpus: 2337 files · ~1,416,129 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 10791 nodes · 28736 edges · 318 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: imports: 9677 · contains: 8590 · imports_from: 7874 · calls: 2014 · re_exports: 465 · method: 115 · inherits: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 2337 · Candidates: 2718
- Excluded: 154 untracked · 187897 ignored · 23 sensitive · 87 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `4ab4989`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `cn()` - 253 edges
2. `userCopy` - 241 edges
3. `normalizeCompanyId()` - 157 edges
4. `Button()` - 124 edges
5. `useAuth()` - 85 edges
6. `getAdminFirestore()` - 76 edges
7. `Text` - 58 edges
8. `getFirestoreDb()` - 56 edges
9. `MotorEntity` - 48 edges
10. `Dialog()` - 46 edges

## Surprising Connections (you probably didn't know these)
- `isProductionCompanyId()` --calls--> `isUnassignedCompanyId()`  [EXTRACTED]
  autocore-mobile/lib/company-id.ts → src/lib/company-id.ts
- `Skeleton()` --calls--> `resolveRadius()`  [EXTRACTED]
  src/components/ui/skeleton.tsx → autocore-mobile/components/ui/skeleton.tsx
- `sha256Nonce()` --calls--> `sha256NonceHex()`  [EXTRACTED]
  src/lib/auth/apple-nonce.ts → autocore-mobile/lib/auth/apple-nonce.ts
- `orderShowsOilIntervalTag()` --calls--> `textMatches()`  [EXTRACTED]
  autocore-mobile/lib/documents/classify-service-order.ts → src/lib/documents/classify-service-order.ts
- `mapItem()` --calls--> `coerceInventoryString()`  [EXTRACTED]
  src/infrastructure/firestore/inventory-item-repository.ts → autocore-mobile/services/firestore/inventory-item-repository.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (129): CompanyAvatar(), CompanyAvatarProps, CompanyAvatarSize, sizeMap, getOAuthButtonTheme(), OAuthButtonTheme, OAuthProvider, CoAmountFieldProps (+121 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (117): AccountSettingsPanelProps, CREATABLE_OPERATION_TYPES, operationAccountLabel(), paymentMethodLabel(), NewOperationDialogProps, SellFinancialDialog(), SellFinancialDialogProps, SellFinancialPayload (+109 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (135): CommercialProposalDocument(), CommercialProposalDocumentProps, demoDocumentFixtures, demoMotor, demoOrder, buildBrandingPreviewContext(), previewWarrantyCopy(), buildDocumentContextFromOrder() (+127 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (128): PayrollTable(), PayrollTableProps, PAYROLL_RATE_TYPES, PAYROLL_TRANSACTION_STATUSES, PayrollRateType, PayrollTransaction, PayrollTransactionStatus, CompanyEmployee (+120 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (117): AccountSettingsPanel(), ACTIVITY_NAV, ActivityWorkspace(), can(), canEditInventory(), canExportInventory(), canImportInventory(), canManageEmployees() (+109 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (122): searchSpring, searchTimeline, whTimeline, SearchEnterConfig, useSearchEnter(), HighlightedText(), HighlightedTextProps, splitHighlightParts() (+114 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (107): deleteOrganization(), leaveOrganization(), useAuth(), CompanySwitcherSheet(), CompanySwitcherSheetProps, DeleteAccountDialog(), DeleteAccountDialogProps, OrgDangerZone() (+99 more)

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (103): BrandsSidebarGroupProps, catalogRepository, DialogMode, motorRepository, DemoSessionBanner(), BrandEntity, CatalogRepository, createCatalogRepository() (+95 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (76): SITEMAP_CHANGE_FREQUENCY, SITEMAP_PRIORITY, landingContent, DownloadExperience(), MobileDownloadExperience(), PageProps, legacyPathToLocalized(), LOCALE_PREFIX (+68 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (85): featureDelay(), paywallDuration, paywallEase, paywallEnter, paywallSpring, paywallTimeline, PaywallEnterConfig, usePaywallEnter() (+77 more)

### Community 10 - "Community 10"
Cohesion: 0.03
Nodes (92): canAccessMotorsArea(), canAccessPath(), defaultAppPath(), isNavAllowed(), navPermission(), ROLE_NAV_ALLOWLIST, roleNavAllowlist(), RequireAppAccessProps (+84 more)

### Community 11 - "Community 11"
Cohesion: 0.03
Nodes (97): MobileApiError, fetchNotificationInbox(), InboxResponse, markAllNotificationsRead(), markNotificationState(), PreferencesResponse, registerNotificationDevice(), applyInboxPayload() (+89 more)

### Community 12 - "Community 12"
Cohesion: 0.03
Nodes (80): sendEmployeeInviteEmail(), acceptInvite(), acceptInviteByCode(), declineInvite(), fetchInvitePreview(), removeMemberFromCompany(), resendInvite(), revokeInvite() (+72 more)

### Community 13 - "Community 13"
Cohesion: 0.03
Nodes (61): PageProps, DecorIcon(), DecorIconProps, DecorIconVariants, DocumentImportViewerProps, DocumentImportsList(), DocumentImportsListProps, STATUS_LABELS (+53 more)

### Community 14 - "Community 14"
Cohesion: 0.03
Nodes (77): ActivityCard, ActivityCardProps, AnalyticsCard, AnalyticsCardProps, BusinessCardShell(), BusinessCardShellProps, CustomerCard, CustomerCardProps (+69 more)

### Community 15 - "Community 15"
Cohesion: 0.03
Nodes (49): AcceptCodeBody, AcceptBody, callerMayActivate(), internalActivationEnabled(), normalizeInterval(), POST(), AccountAccessError, readBearerToken() (+41 more)

### Community 16 - "Community 16"
Cohesion: 0.04
Nodes (75): enqueueDocumentJob(), fetchWorkOrder(), RouteContext, CreateDomainEventInput, DomainEvent, DomainEventStatus, CreateQuoteInput, Quote (+67 more)

### Community 17 - "Community 17"
Cohesion: 0.03
Nodes (58): ProfileEnterConfig, ScanEnterConfig, ProfileNameJourneyScreen(), VerifyEmailJourneyScreen(), CompanyJourneyScreen(), CompanyMode, JourneyOptionCard(), JourneyOptionCardProps (+50 more)

### Community 18 - "Community 18"
Cohesion: 0.03
Nodes (83): resolveInviteHref(), buildImportDeepLink(), buildOrderDeepLink(), openNotificationDeepLink(), resolveNotificationDeepLink(), emitNotificationEvent(), emitNotificationEvents(), EmitNotificationResult (+75 more)

### Community 19 - "Community 19"
Cohesion: 0.04
Nodes (58): AccountMenu(), AccountMenuProps, GradientAvatarFallback(), GradientAvatarFallbackProps, AuthProviderKind, badgeSize, badgeSizeClasses, monogramFontSize (+50 more)

### Community 20 - "Community 20"
Cohesion: 0.04
Nodes (69): AvatarUploadResult, uploadUserAvatar(), getPublicApiBaseUrl(), AppleSignInApiPayload, AppleSignInApiResponse, AuthEmailApiError, PasswordResetDelivery, postAuthEmailApi() (+61 more)

### Community 21 - "Community 21"
Cohesion: 0.05
Nodes (84): AppleAuthMode, getAppleWebClientIdMisconfigurationIssue(), isAppleJsPopupEnabled(), AppleAuthInitConfig, AppleJsModeDecision, AppleJsModeLabel, AppleJsRuntimeMode, AppleSdkForensicCapture (+76 more)

### Community 22 - "Community 22"
Cohesion: 0.03
Nodes (66): BarcodeScanListener, createBarcodeScanListener(), barcodeRepository, BarcodeScanProvider(), BarcodeScanProviderProps, itemRepository, BarcodeUnknownProductDialog(), createMotorImportRepository() (+58 more)

### Community 23 - "Community 23"
Cohesion: 0.04
Nodes (58): ac, isMotorSaleOperation(), motorSaleDetail(), motorSaleMotorId(), filterCashboxOperations(), filterExpenseOperations(), filterPayrollExpenseOperations(), filterWorkOrderOperations() (+50 more)

### Community 24 - "Community 24"
Cohesion: 0.03
Nodes (64): moduleIcons, WorkspaceActivityFeedProps, PRO_BILLING_FEATURES, createEmployeeRbacRepository(), useMyEarningsData(), AuthErrorContext, GRID_FIELD_LABELS_EN, GRID_FIELD_LABELS_RU (+56 more)

### Community 25 - "Community 25"
Cohesion: 0.04
Nodes (70): CompanyAppConfigForm(), CompanyAppConfigFormProps, MODULE_KEYS, CompanyAppConfig, CompanyModuleKey, CompanySpecificCategoryConfig, DEFAULT_COMPANY_MODULES, defaultCompanyAppConfig() (+62 more)

### Community 26 - "Community 26"
Cohesion: 0.04
Nodes (59): FirebaseLikeError, formatAppleAuthErrorForUi(), logAppleAuthError(), logAppleAuthStep(), logAppleIdToken(), logAppleJs(), logAppleNonce(), logAppleTag() (+51 more)

### Community 27 - "Community 27"
Cohesion: 0.04
Nodes (47): IPhone16ProFrame(), IPhone16ProFrameProps, formatUsd(), landingDemoCompany, landingDemoInventory, landingDemoMotor, landingDemoMotorEntity, landingDemoMotorsAtmosphere (+39 more)

### Community 28 - "Community 28"
Cohesion: 0.05
Nodes (61): loadMotorImportServerContext(), mapMotor(), MotorImportServerContext, readNumber(), toDate(), isInventoryGroupId(), isInventorySubcategoryId(), normalizeTaxonomyKey() (+53 more)

### Community 29 - "Community 29"
Cohesion: 0.04
Nodes (58): ServiceOrderProfile, DEFAULT_DOCUMENT_UI_LABELS, DocumentUiLabels, documentClientName(), addDays(), addMonths(), coerceDocumentDate(), daysBetween() (+50 more)

### Community 30 - "Community 30"
Cohesion: 0.04
Nodes (62): appendEmployeeActivityLog(), getCompanyName(), removeMemberFromCompanyAsAdmin(), setMemberActiveAsAdmin(), switchUserActiveCompany(), avatarMonogram(), companyMonogramLabel(), COMPANY_AVATAR_GRADIENTS (+54 more)

### Community 31 - "Community 31"
Cohesion: 0.04
Nodes (52): SidebarFooter(), SidebarFooterProps, statusDotClass, ASSIGNABLE_ROLES, EmployeeProfileSheet(), EmployeeProfileSheetProps, employeeRepository, sheetReveal (+44 more)

### Community 32 - "Community 32"
Cohesion: 0.04
Nodes (71): applyAiFallback(), ApplyAiOptions, AnalyzeOptions, analyzeTable(), buildRow(), computeStats(), dedupeKey(), dominantType() (+63 more)

### Community 33 - "Community 33"
Cohesion: 0.05
Nodes (61): accountingQuickActions, parseFeature(), PaywallRoute(), CATEGORY_ICONS, CategoryIcon, styles, AcAccountingEmptyStateProps, CoCategoryFieldProps (+53 more)

### Community 34 - "Community 34"
Cohesion: 0.04
Nodes (51): EnterpriseAnimatedPanel(), EnterpriseAnimatedPanelProps, getActiveUserCopyLocale(), MotorWarrantyCardProps, getSidebarFooterContent(), sidebarFooterContent, ChangelogWorkspace(), CATEGORY_ICONS (+43 more)

### Community 35 - "Community 35"
Cohesion: 0.04
Nodes (51): ResolvedAccessProfile, InventoryImportAccessError, readBearerToken(), VerifiedInventoryImportAccess, verifyInventoryImportAccess(), InventoryViewAccessError, readBearerToken(), VerifiedInventoryViewAccess (+43 more)

### Community 36 - "Community 36"
Cohesion: 0.04
Nodes (49): ACCOUNTING_SYSTEM_CATEGORIES, MOTOR_SALE_CATEGORY, buildOperationsCsv(), shareOperationsCsv(), CATEGORY_KEYS, categoryBundle(), CategoryKey, isKnownOperationCategory() (+41 more)

### Community 37 - "Community 37"
Cohesion: 0.04
Nodes (59): geistMono, geistSans, metadata, viewport, AuthGate(), MemoAppTree, SubscriptionRequiredScreen, WorkspaceAccessScreen (+51 more)

### Community 38 - "Community 38"
Cohesion: 0.06
Nodes (60): addFileToImportBatchAdmin(), AddImportBatchFileParams, batchRef(), createImportBatchAdmin(), detectImportFileKind(), ensureOpenImportBatchAdmin(), extensionFor(), filesCol() (+52 more)

### Community 39 - "Community 39"
Cohesion: 0.04
Nodes (44): createDocumentImportJob(), CreateDocumentImportParams, EXTENSION_BY_TYPE, extensionForContentType(), getDocumentImportJobAdmin(), listDocumentImportJobsAdmin(), mapDocumentImportJob(), toDate() (+36 more)

### Community 40 - "Community 40"
Cohesion: 0.04
Nodes (51): GridCommand, GridCommandBus, GridMutation, GridEditorOverlay(), GridFillHandle(), GridFillHandleProps, deleteShortcutLabel(), isApplePlatform() (+43 more)

### Community 41 - "Community 41"
Cohesion: 0.05
Nodes (55): BrandingColorField(), BrandingLivePreview(), BrandingLivePreviewInput, BrandingLivePreviewProps, usePreviewScale(), BrandingSection(), BrandingSectionProps, sectionMotion (+47 more)

### Community 42 - "Community 42"
Cohesion: 0.07
Nodes (47): GLOBAL_DICTIONARIES, buildCompanyDictionary(), CompanyDomainEntry, CompanyDomainMap, companyEntryExists(), createCompanyEntry(), DomainAutocomplete, DomainAutocompleteHandle (+39 more)

### Community 43 - "Community 43"
Cohesion: 0.07
Nodes (33): ActionMode, ActionStatus, AuthActionContent(), AuthActionShellProps, resolveMode(), EmailVerificationGateProps, FloatingPaths(), GatePhase (+25 more)

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (52): fetchWarrantyByMotorId(), loadMotorForSale(), lookupMotorSaleOperation(), MotorSaleOperationContext, parseSaleComment(), patchMotorSaleOperationWarranty(), processStandaloneMotorSold(), resolveMotorSaleClientId() (+44 more)

### Community 45 - "Community 45"
Cohesion: 0.06
Nodes (45): WorkOrderLaborPricingMode, useOrderCompositionForm(), UseOrderCompositionFormOptions, resolveInventoryUnitPrice(), compositionGrandTotal(), isSellOnlyComposition(), mapCompositionToWorkOrderLines(), mapOrderToCompositionDrafts() (+37 more)

### Community 46 - "Community 46"
Cohesion: 0.05
Nodes (39): smoothScrollToElement(), smoothScrollToY(), SplitResult, splitText(), wrapLinesInElement(), wrapWords(), RevealOptions, useGsapMountReveal() (+31 more)

### Community 47 - "Community 47"
Cohesion: 0.05
Nodes (40): AccountingScreen(), assertValidPayload(), createFinancialOperation(), CreatePayload, createTypedFinancialOperation(), CATEGORY_SUGGESTIONS, CreateOperationScreen(), parseAmountInput() (+32 more)

### Community 48 - "Community 48"
Cohesion: 0.06
Nodes (48): BalanceSnapshot, calculateCashBalance(), incomingTypes, outgoingTypes, CATEGORY_ICONS, computeAccountingSnapshot(), ComputeAccountingSnapshotInput, emptyAccountingSnapshot() (+40 more)

### Community 49 - "Community 49"
Cohesion: 0.06
Nodes (40): ActivityDayGroup, ActivityJournalFilters, ActivityJournalModuleFilter, ActivityJournalSeverityFilter, actorInitials(), filterActivityEntries(), formatActivityTargetName(), formatDayLabel() (+32 more)

### Community 50 - "Community 50"
Cohesion: 0.07
Nodes (51): AuthJourneyContentWidth, AuthJourneyLayout, AuthJourneyShell(), AuthJourneyShellProps, contentWidthClass, authJourneyBrandReveal(), authJourneyStepTransition, authJourneyStepVariants() (+43 more)

### Community 51 - "Community 51"
Cohesion: 0.05
Nodes (44): ProductContent, ProductSectionId, TocItem, useProductContent(), IPhoneSimulatorFrame(), IPhoneSimulatorFrameProps, DocumentScaledPreviewFrame(), useDocumentPreviewScale() (+36 more)

### Community 52 - "Community 52"
Cohesion: 0.07
Nodes (45): InventoryItem, GROUPS_BY_ID, InventoryGroupId, InventorySubcategoryId, InventoryTaxonomyGroup, InventoryTaxonomyKind, InventoryTaxonomySubcategory, presetForSubcategory() (+37 more)

### Community 53 - "Community 53"
Cohesion: 0.05
Nodes (39): ACCOUNTING_CATEGORY_SUGGESTIONS, buildAccountingCategorySuggestions(), filterAccountingCategorySuggestions(), AccountingWorkspace(), motorRepository, payrollRepository, repository, AccountingWorkspaceSkeleton() (+31 more)

### Community 54 - "Community 54"
Cohesion: 0.06
Nodes (45): processInventoryEventForWorkOrder(), recordInventoryMovementAdmin(), resolveDefaultWarehouseId(), resolveWarehouseIdForEvent(), MovementType, upsertInventoryItemSchema, commitImportBatchMotors(), commitImportBatchWarehouse() (+37 more)

### Community 55 - "Community 55"
Cohesion: 0.07
Nodes (46): buildDocumentFilename(), buildDocumentPdfPath(), buildPdfPath(), DocumentAggregateType, fetchDocumentPdf(), fetchWorkOrderDocumentPdf(), mobileFetchBlob(), waitForFirebaseUser() (+38 more)

### Community 56 - "Community 56"
Cohesion: 0.06
Nodes (37): AuthDebugEntry, AuthDebugSnapshot, buildAuthDebugSnapshot(), clearAuthDebugEntries(), describeFirebaseUser(), entries, formatError(), getAuthDebugEntries() (+29 more)

### Community 57 - "Community 57"
Cohesion: 0.09
Nodes (41): scanSheetAnimationConfigs, ScanCandidatesSheet, ScanCandidatesSheetProps, ScanCodePickerSheet, ScanCodePickerSheetProps, ScanDocumentSheet, ScanDocumentSheetProps, ScanMoveSheet (+33 more)

### Community 58 - "Community 58"
Cohesion: 0.06
Nodes (40): DocumentImportJobStatus, DocumentImportUploadResult, getDocumentImportStatus(), pollDocumentImportUntilSettled(), uploadDocumentImport(), uploadDocumentImportWithRetry(), mobileApi, SendEmployeeInviteResult (+32 more)

### Community 59 - "Community 59"
Cohesion: 0.06
Nodes (35): ChaosItem, FaqItem, GoLiveStep, LandingContent, MessageWorkflow, ROI_DEFAULTS, SceneItem, TrustPillar (+27 more)

### Community 60 - "Community 60"
Cohesion: 0.06
Nodes (45): MotorNormalizeBatchItem, NormalizeBatchItem, applyManualColumnMapping(), escapeRegex(), FIELD_MATCH_ORDER, HEADER_ALIASES, headerMatchScore(), levenshtein() (+37 more)

### Community 61 - "Community 61"
Cohesion: 0.07
Nodes (33): InventoryLocationBalance, CreateSupplierInput, Supplier, documentGenerationJobRepository, createInventoryLocationBalanceRepository(), InventoryLocationBalanceRepository, isIgnorableFirestoreError(), notifyFirestoreSnapshotError() (+25 more)

### Community 62 - "Community 62"
Cohesion: 0.05
Nodes (40): BarcodeMapping, BarcodeMappingRepository, createBarcodeMappingRepository(), createWarehousePresenceRepository(), WarehousePresenceInput, useInventoryRealtime(), LifecyclePausableOptions, useLifecyclePausable() (+32 more)

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (39): appendMotorImportActivityLog(), assertMotorImportCompanyAccess(), cancelMotorImportJobAdmin(), claimMotorImportJobForApply(), claimMotorImportJobForProcessing(), completeMotorImportAnalyze(), createQueuedMotorImportJob(), deleteEngineRowsSubcollection() (+31 more)

### Community 64 - "Community 64"
Cohesion: 0.06
Nodes (42): AuthJourneyReveal(), AuthJourneyRevealProps, AuthJourneyStaggerGroupProps, AuthJourneyStepBody(), AuthJourneyStepBodyProps, AuthJourneyStepCard(), AuthJourneyStepCardProps, AuthJourneyStepHeader() (+34 more)

### Community 65 - "Community 65"
Cohesion: 0.06
Nodes (26): useMarketingPages(), DownloadPagesCopy, DownloadPlatformGrid(), EASE, HeroRevealProps, PlatformKind, ScrollRevealProps, useDesktopAvailability() (+18 more)

### Community 66 - "Community 66"
Cohesion: 0.06
Nodes (37): ModulesEditorList(), ModulesEditorListProps, NavEditorRowProps, NavigationEditorListProps, DEFAULT_MODULE_ENABLED, MODULE_DEFINITIONS, MODULE_ORDER, NAV_ITEM_DEFINITIONS (+29 more)

### Community 67 - "Community 67"
Cohesion: 0.05
Nodes (33): DocumentImportTopBarIsland(), AnimatedSidebarSlot(), AnimatedSidebarSlotProps, DashboardLayoutContext, DashboardLayoutContextValue, DashboardLayoutProvider(), useDashboardLayout(), availabilityOptionValues (+25 more)

### Community 68 - "Community 68"
Cohesion: 0.06
Nodes (36): updateNotificationPreferences(), fetchInboxFromFirestore(), filterByState(), mapCompanyInbox(), mapNotificationRecord(), markAllInboxNotificationsRead(), subscribeInboxFromFirestore(), updateInboxNotificationState() (+28 more)

### Community 69 - "Community 69"
Cohesion: 0.07
Nodes (44): useRealtimeReconnect(), useSessionBootstrapReady(), queryClient, hydrateOne(), preloadSessionSnapshots(), preloadSessionSnapshotsChunked(), clearScheduledQueryDataApplies(), sessionBootstrapQueryKeys() (+36 more)

### Community 70 - "Community 70"
Cohesion: 0.10
Nodes (37): AI_ROLE_TO_FIELD, aiColumnRolesToMapping(), applyAiSheetToConfig(), buildRuleSheetMapping(), buildSheetMappingState(), finalizeSheetConfig(), mergeAiSheetMapping(), needsAiSheetMapping() (+29 more)

### Community 71 - "Community 71"
Cohesion: 0.09
Nodes (43): FIELD_SIGNATURE_BY_FIELD, FIELD_SIGNATURES, FieldSignature, FOLDED_ALIASES, HeaderMatch, matchHeaderToFields(), baseKey(), filenameMatchKeys() (+35 more)

### Community 72 - "Community 72"
Cohesion: 0.08
Nodes (37): getNoreplyFrom(), getResend(), getResendApiKey(), getSupportFrom(), isResendConfigured(), acceptInviteAsUser(), acceptInviteByCodeAsUser(), acceptPendingInviteForExistingMember() (+29 more)

### Community 73 - "Community 73"
Cohesion: 0.05
Nodes (29): polishDocumentContextForRender(), COMPILED_PATHS, getDocumentsCss(), PDF_STYLE_PATHS, readPdfStyles(), printPreviewInBrowser(), buildDocumentQrDataUri(), DocumentAggregateType (+21 more)

### Community 74 - "Community 74"
Cohesion: 0.06
Nodes (32): AuthJourneyCoordinator(), AuthJourneyCoordinatorProps, CompanyOnboardingStep(), EmailVerificationStep(), ProfileNameStep(), isCompleteFullName(), isCompleteFullName(), RequireAppAccess() (+24 more)

### Community 75 - "Community 75"
Cohesion: 0.07
Nodes (38): isAppleJsAuthMode(), AppleIcon(), GoogleIcon(), IconProps, AuthDivider(), AuthPhase, authStepEase, LoginScreenProps (+30 more)

### Community 76 - "Community 76"
Cohesion: 0.06
Nodes (33): isMotorRowEmpty(), nextEmptyRowId(), autocompleteSuffixForMatch(), filterColumnSuggestions(), pickColumnAutocompleteMatch(), resolveGridColumnAutocomplete(), buildGridRows(), buildSavedMotorRowFromCreate() (+25 more)

### Community 77 - "Community 77"
Cohesion: 0.06
Nodes (23): Conversation, rows, ASSIGNABLE_ROLES, employeeRepository, EmployeesWorkspace(), INVITE_ROLES, inviteRepository, inviteStatusLabel() (+15 more)

### Community 78 - "Community 78"
Cohesion: 0.09
Nodes (26): MotorEntity, MotorHistoryEntry, MotorStatus, initialMotorSyncState, MotorSyncMeta, MotorSyncState, MotorSyncStatus, UpsertMotorInput (+18 more)

### Community 79 - "Community 79"
Cohesion: 0.08
Nodes (37): detectImportFormatPreset(), findHeader(), ImportFormatPreset, isQuickImportReady(), nomenclaturePreset, normalizeHeader(), PresetEnrichment, PRESETS (+29 more)

### Community 80 - "Community 80"
Cohesion: 0.06
Nodes (25): OrderTransitionProvider(), profileSpring, profileTimeline, SettingsHubCardProps, SettingsRowProps, SettingsGroupProps, SettingsSectionTitleProps, ROLE_LABELS (+17 more)

### Community 81 - "Community 81"
Cohesion: 0.09
Nodes (32): buildClientActionCodeSettings(), resolveClientActionOrigin(), useScroll(), APP_ROUTE_PREFIXES, appDashboardUrl(), appDemoUrl(), appLoginUrl(), ensureHttpScheme() (+24 more)

### Community 82 - "Community 82"
Cohesion: 0.08
Nodes (30): normalizeInventoryCode(), ScanDisambiguatePayload, buildScanDisambiguateSystemPrompt(), buildScanDisambiguateUserPrompt(), buildScanCodeVariants(), extractGs1Primary(), primaryScanCode(), scanToken() (+22 more)

### Community 83 - "Community 83"
Cohesion: 0.11
Nodes (22): InventoryStockLevel, InventoryMovement, MOVEMENT_REFERENCE_TYPES, MOVEMENT_TYPES, MovementReferenceType, RecordMovementInput, ConsumeForWorkOrderInput, WorkOrderConsumptionLine (+14 more)

### Community 84 - "Community 84"
Cohesion: 0.08
Nodes (29): TIER_DOT, DuplicateGroup, DuplicateResolution, MigrationCommitInput, MigrationCommitPort, MigrationPhase, MigrationProgress, MigrationResult (+21 more)

### Community 85 - "Community 85"
Cohesion: 0.06
Nodes (27): OrderTransitionContext, OrderTransitionContextValue, SourceLayout, useOrderTransition(), transitionWorkOrder(), OrderRowSkeletonProps, OrdersLoadingState(), OrdersLoadingStateProps (+19 more)

### Community 86 - "Community 86"
Cohesion: 0.09
Nodes (33): companyAppConfigRef(), loadCompanyAppConfig(), saveCompanyAppConfig(), subscribeCompanyAppConfig(), buildFallbackProfile(), CompanyDocShape, ensureUserDocument(), hydrateEffectiveProfile() (+25 more)

### Community 87 - "Community 87"
Cohesion: 0.08
Nodes (31): AutocompleteOverlay, AutocompleteOverlayProps, AutocompleteOptionDisplay, formatAutocompleteOption(), computeMatchRanges(), inferEngineFuelBadge(), BASE, getNativeInputProps() (+23 more)

### Community 88 - "Community 88"
Cohesion: 0.10
Nodes (34): isKnownPayload(), normalizePayload(), recentScans, registry, resolveScanPayload(), classifyPayloadOutcome(), isWeakCameraAutoAccept(), mapApiResolve() (+26 more)

### Community 89 - "Community 89"
Cohesion: 0.10
Nodes (28): ErApiResponse, fetchLiveRates(), GET(), saveUserDisplayCurrency(), subscribeUserDisplayCurrency(), userRef(), useExchangeRates(), useUserDisplayCurrency() (+20 more)

### Community 90 - "Community 90"
Cohesion: 0.08
Nodes (30): formatMotorDate(), parseMotorDateInput(), applySpecificCellValue(), buildSavedSpecificRowFromUpsert(), buildSpecificGridRows(), createEmptySpecificRow(), extractColumnKeysFromRows(), growSpecificRows() (+22 more)

### Community 91 - "Community 91"
Cohesion: 0.09
Nodes (28): createDomainDictionary(), DomainDictionary, getGlobalDictionary(), globalCache, IndexedEntry, isSubsequence(), SCORE, searchDomain() (+20 more)

### Community 92 - "Community 92"
Cohesion: 0.07
Nodes (23): scanSpring, scanTimeline, ScanConfirmFlash(), ScanConfirmFlashProps, normalizeBounds(), ScanDetectionOverlay(), ScanDetectionOverlayProps, ScanFrameOverlay() (+15 more)

### Community 93 - "Community 93"
Cohesion: 0.08
Nodes (30): DOCUMENT_BY_SLUG, DOCUMENT_BY_TYPE, ApplyPdfExportLayoutOptions, applyPdfExportLayoutScript(), computePdfFitScale(), MeasurePdfPageOptions, MeasurePdfPageResult, measurePdfPageScript() (+22 more)

### Community 94 - "Community 94"
Cohesion: 0.08
Nodes (32): AccessScopes, ASSIGNED_WORK_ORDER_ROLES, DataDomain, DataScope, DOMAIN_PERMISSION, getDataScope(), resolveAccessScopes(), shouldSubscribeToDomain() (+24 more)

### Community 95 - "Community 95"
Cohesion: 0.07
Nodes (27): allStoreSkus(), PlanAvailability, PlanDescriptor, planForSku(), purchasablePlans(), skuForPlan(), TIER_RANK, tierRank() (+19 more)

### Community 96 - "Community 96"
Cohesion: 0.08
Nodes (32): activateProForever(), AppAccountTokenResponse, AppleVerificationRejection, fetchAppAccountToken(), refreshCompanyBilling(), restoreApplePurchases(), RestoreApplePurchasesRequest, RestoreApplePurchasesResponse (+24 more)

### Community 97 - "Community 97"
Cohesion: 0.06
Nodes (24): ContactExperience(), EASE, HeroRevealProps, ScrollRevealProps, PageProps, LegalDocument, LegalDocumentKey, legalDocuments (+16 more)

### Community 98 - "Community 98"
Cohesion: 0.10
Nodes (25): InventoryCategory, CreateWarehouseInput, Warehouse, categoryRepository, createCompany(), ensureCompanyConsumablesWorkspace(), ensureDefaultCompany(), linkUserToCompany() (+17 more)

### Community 99 - "Community 99"
Cohesion: 0.08
Nodes (26): GridDirection, GridRange, isCellInsideRange(), makeSingleCellRange(), normalizeRange(), EnsureCellVisibleOptions, GridCellFrame, useGridScrollIntoView() (+18 more)

### Community 100 - "Community 100"
Cohesion: 0.08
Nodes (36): MOTOR_AI_DATA_INTEGRITY_RULES, MOTOR_BRAND_VS_ENGINE_RULES, MOTOR_COLUMN_AND_FLAGS_RULES, MOTOR_IMPORT_AI_PROMPTS, MOTOR_MAGIC_IMPORT_DOMAIN, MOTOR_NORMALIZE_BATCH_SYSTEM_PROMPT, MOTOR_SHEET_RESOLVE_FEW_SHOT, MOTOR_SHEET_RESOLVE_SYSTEM_PROMPT (+28 more)

### Community 101 - "Community 101"
Cohesion: 0.07
Nodes (26): NotificationCard, ActivityDateGroup(), ActivityDateGroupProps, ActivityFeedFilters(), ActivityFeedFiltersProps, READ_FILTERS, ActivityNotificationRow, ActivityNotificationRowProps (+18 more)

### Community 102 - "Community 102"
Cohesion: 0.09
Nodes (28): buildLocationDisplayCode(), CreateWarehouseLocationInput, DEFAULT_LOCATION_LABEL_SCHEME, isUnlocatedLocation(), LocationLabelScheme, normalizeLocationCode(), unlocatedLocationDocId(), UpdateWarehouseLocationInput (+20 more)

### Community 103 - "Community 103"
Cohesion: 0.10
Nodes (28): buildActionCodeSettings(), buildAuthActionPath(), buildAuthActionUrl(), resolveAuthActionOrigin(), rewriteFirebaseActionLink(), assertKeyedRateLimit(), assertPasswordResetRateLimit(), assertResolveEmailRateLimit() (+20 more)

### Community 104 - "Community 104"
Cohesion: 0.09
Nodes (20): ordersSpring, ordersTimeline, OrdersEnterConfig, useOrdersEnter(), ComposerTabBarProps, ComposerTabOption, TabIcon, OrderCard (+12 more)

### Community 105 - "Community 105"
Cohesion: 0.06
Nodes (35): DOMAIN_EVENT_TYPES, OPERATION_ACCOUNTS, OPERATION_TYPES, PAYMENT_METHODS, INVENTORY_ITEM_STATUSES, INVENTORY_ITEM_TYPES, MOTOR_STATUSES, companySchema (+27 more)

### Community 106 - "Community 106"
Cohesion: 0.10
Nodes (21): MOTOR_IMPORT_STATUSES, MotorImportJob, MotorImportJobProgress, MotorImportStatus, createActivityLogRepository(), MotorImportRepository, sanitizeForFirestore(), serializeEngineRowForFirestore() (+13 more)

### Community 107 - "Community 107"
Cohesion: 0.08
Nodes (32): highestPlan(), PLANS, CachedEntitlement, CachedSubscription, clearEntitlementCaches(), date(), deserialize(), isCacheTrustworthy() (+24 more)

### Community 108 - "Community 108"
Cohesion: 0.09
Nodes (30): InventoryItemStatus, InventoryItemType, adjustStockUseCase(), applyWarehouseDraftField(), buildSavedRowFromCreate(), buildWarehouseGridRows(), buildWarehouseReconcilePreserveIds(), createEmptyDraft() (+22 more)

### Community 109 - "Community 109"
Cohesion: 0.08
Nodes (23): HighlightedText, HighlightedTextProps, InlineAutocomplete, InlineAutocompleteEmpty(), InlineAutocompleteProps, InlineAutocompleteRenderArgs, InlineAutocompleteRow, InlineAutocompleteRowProps (+15 more)

### Community 110 - "Community 110"
Cohesion: 0.10
Nodes (23): MacBookProFrame(), MacBookProFrameProps, EcosystemDeviceShowcase(), EcosystemDeviceShowcaseProps, KeynoteDesktopUi(), KeynoteDesktopUiProps, KeynotePhoneUi(), KeynotePhoneUiProps (+15 more)

### Community 111 - "Community 111"
Cohesion: 0.12
Nodes (27): buildClearWrites(), buildFillDownWrites(), buildFillRightWrites(), buildFillWithActiveWrites(), buildPasteWrites(), parseClipboardTsv(), PasteWrite, readClipboardText() (+19 more)

### Community 112 - "Community 112"
Cohesion: 0.08
Nodes (18): claimWorkOrder(), OrderClaimSection(), OrderLine, OrderLinesList(), OrderLinesListProps, formatOrderVehicleLine(), formatWorkOrderLabel(), isOpenOrderStatus() (+10 more)

### Community 113 - "Community 113"
Cohesion: 0.09
Nodes (23): ScanUnknownSheet, ScanUnknownSheetProps, useMobileAssignAssetLocation(), useDevMockFallback(), useScanExperience(), classifyScanPayload(), ENTITY_PREFIXES, hasValidEanChecksum() (+15 more)

### Community 114 - "Community 114"
Cohesion: 0.08
Nodes (23): getFirestoreDb(), createInventoryItemRepository(), createInventoryMovementRepository(), createInventoryStockLevelRepository(), generateWebLocalId(), ensureMotorsLoaded(), financialRepository, itemRepository (+15 more)

### Community 115 - "Community 115"
Cohesion: 0.17
Nodes (26): BrandEngineHints, canonicalizeMotorBrand(), coerceBrandEnginePair(), ENGINE_PREFIX_TO_BRAND, inferBrandFromEngineCode(), inferBrandFromSerial(), isLikelyCarBrand(), isLikelyEngineCode() (+18 more)

### Community 116 - "Community 116"
Cohesion: 0.15
Nodes (23): loadQuoteDocumentContext(), quoteAsWorkOrder(), fetchMotorById(), loadWarrantyDocumentContext(), warrantyAsWorkOrder(), buildDocumentContext(), VehicleLogbookSource, collectAssigneeIds() (+15 more)

### Community 117 - "Community 117"
Cohesion: 0.10
Nodes (19): VerifiedDocumentAccess, fetchNextPendingJob(), assertWorkerConfigured(), readDocumentWorkerSecret(), verifyDocumentQueueAccess(), isLocalDevOrigin(), KickDocumentQueueParams, kickDocumentQueueWorker() (+11 more)

### Community 118 - "Community 118"
Cohesion: 0.11
Nodes (18): channelsForDefinition(), createInboxNotification(), deliverNotificationToUser(), listCompanyEmployees(), listTeamAdminRecipients(), readNotificationPreferences(), resolveNotificationRecipients(), upsertGroupedNotification() (+10 more)

### Community 119 - "Community 119"
Cohesion: 0.09
Nodes (21): MetricCard(), MetricCardProps, toneClasses, getDefaultOverviewCardsLabels(), OverviewCards(), OverviewCardsLabels, OverviewCardsProps, getDefaultOverviewInsightsLabels() (+13 more)

### Community 120 - "Community 120"
Cohesion: 0.10
Nodes (23): buildGridLayoutMetrics(), BuildGridLayoutOptions, cellFrame(), GridLayoutMetrics, motorGridBaseColumns(), GridColumnDefinition, GridColumnId, MOTOR_GRID_COLUMN_WIDTHS (+15 more)

### Community 121 - "Community 121"
Cohesion: 0.10
Nodes (24): autocoreEase, duration, enterValues, presets, smoothEase, spring, staggerDelay(), animationSpeed (+16 more)

### Community 122 - "Community 122"
Cohesion: 0.15
Nodes (23): filterAutocompleteOptions(), uniqueAutocompleteOptions(), mergeEngineCustomOptions(), searchAutocomplete(), searchCategories(), searchCustomers(), searchEngineCodes(), searchManufacturers() (+15 more)

### Community 123 - "Community 123"
Cohesion: 0.10
Nodes (22): AUTO_TYPE_SET, PRODUCT_TYPES, ScanCamera, ScanCameraHandle, ScanCameraProps, STABLE_BARCODE_SETTINGS, STABLE_BARCODE_TYPES, styles (+14 more)

### Community 124 - "Community 124"
Cohesion: 0.10
Nodes (18): KnowledgeRepository, defaultKnowledgeFlags(), mergeKnowledgeFlags(), COMPANY_DICTIONARY_CATEGORIES, CompanyDictionaryCategory, CompanyDictionaryEntry, KNOWLEDGE_EVENT_TYPES, KNOWLEDGE_FLAG_KEYS (+10 more)

### Community 125 - "Community 125"
Cohesion: 0.09
Nodes (23): AccountingWorkspace, ActivityWorkspace, CachedRoutePanel(), CachedRoutePanelProps, DashboardRouteCache(), DashboardRouteCacheProps, DocumentsWorkspace, MotorsWorkspace (+15 more)

### Community 126 - "Community 126"
Cohesion: 0.22
Nodes (21): shouldAcceptLocalWrite(), DocInternal, EngineListener, getPersistenceEngine(), persistenceFlags, PersistenceStorageAdapter, dedupeQueueByKey(), coalescePatches() (+13 more)

### Community 127 - "Community 127"
Cohesion: 0.15
Nodes (25): cleanField(), collapseWhitespace(), dedupeAdjacentTokens(), escapeRegExp(), extractGearboxMark(), normalizeSeparators(), PolishedMotorFields, PolishedPartFields (+17 more)

### Community 128 - "Community 128"
Cohesion: 0.13
Nodes (10): BackfillBody, RouteContext, assertOrderCompanyAccess(), DocumentAccessError, readBearerToken(), verifyDocumentAccess(), RouteContext, GenerateBody (+2 more)

### Community 129 - "Community 129"
Cohesion: 0.12
Nodes (17): ImportPhase, ImportValueSource, INVENTORY_IMPORT_STATUSES, InventoryImportJob, InventoryImportRow, InventoryImportStatus, createInventoryImportRepository(), InventoryImportRepository (+9 more)

### Community 130 - "Community 130"
Cohesion: 0.15
Nodes (17): FormField(), FormFieldProps, FormHelper(), FormLabel(), FormLabelProps, FormStack(), FormStackProps, InputField (+9 more)

### Community 131 - "Community 131"
Cohesion: 0.13
Nodes (18): pickDefaultSheet(), readWarehouseSpreadsheet(), cleanBrandSymbol(), cleanCell(), dedupeHeaders(), detectHeaderRowIndex(), isEmptyRow(), parseNumeric() (+10 more)

### Community 132 - "Community 132"
Cohesion: 0.11
Nodes (22): COMPOSER_TAB_ORDER, ComposerTab, useComposerTabState(), ComposerTabBar(), ComposerTabPanel(), ComposerTabPanelProps, resolveEntering(), resolveExiting() (+14 more)

### Community 133 - "Community 133"
Cohesion: 0.09
Nodes (10): ScanIdleIndicator(), ScanIdleIndicatorProps, ScanLauncherButton(), ScanLauncherButtonProps, ScanLauncherRow(), ScanCommitResult, ScanDebounce, ScanDebounceOptions (+2 more)

### Community 134 - "Community 134"
Cohesion: 0.11
Nodes (20): checkOnly, expected, outputPath, KNOWN_WAIVERS, colors, ColorScheme, colorSchemes, contrastContract (+12 more)

### Community 135 - "Community 135"
Cohesion: 0.07
Nodes (25): dialogBackdropEnter, dialogBackdropExit, dialogEnter, dialogExit, fabEnter, fabExit, heroTransition, listMotion (+17 more)

### Community 136 - "Community 136"
Cohesion: 0.11
Nodes (15): DocumentImportDataPanelProps, ExtractedEngine, ExtractedPayload, WorkspaceStatusBar(), WorkspaceStatusBarProps, formatAgo(), LastSavedHint(), PersistenceContext (+7 more)

### Community 137 - "Community 137"
Cohesion: 0.21
Nodes (15): CreateFinancialOperationInput, OperationType, FinancialOperationRepository, FinancialOperationsFilters, mapOperation(), readAmount(), toDate(), useOperationsRealtime() (+7 more)

### Community 138 - "Community 138"
Cohesion: 0.14
Nodes (17): scorePattern(), ScorePatternInput, wilsonLowerBound(), rankSuggestions(), SCOPE_PRIORITY, KitRecommendation, ageInDays(), buildPayload() (+9 more)

### Community 139 - "Community 139"
Cohesion: 0.08
Nodes (14): appleSignInFlag, iosUrlScheme, plugins, universalLinksFlag, withDisableSwiftUICoreAutolink, withGoogleIosUrlScheme, withGoogleModularHeaders, withOptionalAppleSignIn (+6 more)

### Community 140 - "Community 140"
Cohesion: 0.10
Nodes (12): DeviceSyncPulseProps, PhoneInventoryScreenProps, ScanChrome, INTERNAL_STEPS, InventoryMock(), InventoryMockProps, ScanChrome, SyncConnectionBridgeProps (+4 more)

### Community 141 - "Community 141"
Cohesion: 0.10
Nodes (17): createApiCommitPort(), BusinessMigration(), BusinessMigrationProps, fade, DetectedFieldsPanel(), DuplicatesPanel(), MigrationCompleteView(), MigrationDropzone() (+9 more)

### Community 142 - "Community 142"
Cohesion: 0.12
Nodes (18): mapToOrgError(), ORG_ERROR_CODES, ORG_ERROR_COPY, OrgError, OrgErrorCode, OrgErrorCopy, orgErrorResponse(), emailsMatch() (+10 more)

### Community 143 - "Community 143"
Cohesion: 0.11
Nodes (17): DocumentFrameOverlay(), styles, ImportCamera, ImportCameraHandle, ImportCameraProps, styles, ImportParseStatus, ImportSuccessView() (+9 more)

### Community 144 - "Community 144"
Cohesion: 0.11
Nodes (15): claimPendingMarketingCheckout(), tryClaimPendingMarketingCheckout(), ALLOWED_APP_ORIGINS, getAppOrigin(), clearPendingMarketingCheckout(), markMarketingCheckoutClaimAttempted(), PendingMarketingCheckout, readPendingMarketingCheckout() (+7 more)

### Community 145 - "Community 145"
Cohesion: 0.16
Nodes (21): dictionaryCategoriesForRecordType(), enrichMigrationValuesWithBrand(), inferBrandFromTransmissionSerial(), resolveMigrationBrandName(), RowValues, TRANSMISSION_SERIAL_BRANDS, appendPhotoNote(), buildInventoryInputFromMigrationRow() (+13 more)

### Community 146 - "Community 146"
Cohesion: 0.10
Nodes (17): compactRecord(), dedupeTrimmed(), DocumentPrintedFact, FieldCommitFact, fromDocumentPrinted(), fromInventorySoldTogether(), fromStockDepletion(), fromWorkOrderCompleted() (+9 more)

### Community 147 - "Community 147"
Cohesion: 0.20
Nodes (20): applyFactToPatterns(), fieldOpsFromRecord(), patternsFromDocumentPrinted(), patternsFromFieldCommitted(), patternsFromImportCorrection(), patternsFromInventorySoldTogether(), patternsFromMotorSold(), patternsFromOcrConfirm() (+12 more)

### Community 148 - "Community 148"
Cohesion: 0.13
Nodes (19): classifyDocument(), DocumentClass, documentClassLabel(), ScoreMap, SIGNALS, DocumentLineItem, extractLines(), extractTotal() (+11 more)

### Community 149 - "Community 149"
Cohesion: 0.14
Nodes (13): nextPayrollStatus(), PAYROLL_STATUS_LABELS, AcPayrollList(), AcPayrollListProps, PayrollStatusBadge(), statusColors(), AcDivider(), PayrollTransactionRepository (+5 more)

### Community 150 - "Community 150"
Cohesion: 0.16
Nodes (14): enqueueMotorSoldEffects(), ClientEntity, CreateClientInput, UpdateClientInput, createClientSchema, ClientRepository, createClientRepository(), clientRepository (+6 more)

### Community 151 - "Community 151"
Cohesion: 0.16
Nodes (18): buildInitialsAvatarDataUrl(), createAppleOAuthProvider(), AppleRedirectBootstrapResult, bootstrapAppleRedirect(), bootstrapAppleRedirectOnce(), returnedFromOAuthProvider(), clearAppleRedirectPending(), hasPendingAppleRedirect() (+10 more)

### Community 152 - "Community 152"
Cohesion: 0.16
Nodes (18): AI_PROFILES, AiProfile, AiProfileId, isRecoverableAiParseError(), resolveProfileModel(), AiTransport, callOpenRouterJson(), callOpenRouterOnce() (+10 more)

### Community 153 - "Community 153"
Cohesion: 0.13
Nodes (20): contextSnapshotHash(), CreateDocumentJobInput, DOCUMENT_JOB_STATUSES, DocumentAggregateType, DocumentGenerationJob, DocumentInstance, DocumentJobStatus, DocumentJobRecord (+12 more)

### Community 154 - "Community 154"
Cohesion: 0.13
Nodes (13): AuthLoadingScreen(), DeviceClass, useAdaptiveLayout(), BreakpointKey, breakpoints, platform, screen, sidebarWidth (+5 more)

### Community 155 - "Community 155"
Cohesion: 0.15
Nodes (17): BILLING_PLANS, BILLING_STATUSES, BillingPlan, BillingStatus, CompanySubscription, billingIntervalFromPriceId(), companySubscriptionRef(), mapSubscription() (+9 more)

### Community 156 - "Community 156"
Cohesion: 0.17
Nodes (18): verifiedAppleEmail(), AppleJwk, completeMobileAppleSignIn(), decodeJwtPart(), firebaseApiKey(), firebaseAuthHandlerUri(), getAppleJwks(), IdentityToolkitSignInResponse (+10 more)

### Community 157 - "Community 157"
Cohesion: 0.18
Nodes (13): createVehicleSchema, CreateVehicleInput, UpdateVehicleInput, VehicleEntity, VehicleServiceHistoryEntry, createVehicleRepository(), serviceHistoryRef(), vehicleRef() (+5 more)

### Community 158 - "Community 158"
Cohesion: 0.19
Nodes (5): acceptsCameraInput(), activeResultForOutcome(), isInstantOutcome(), ScanService, sheetKindForOutcome()

### Community 159 - "Community 159"
Cohesion: 0.15
Nodes (14): AppContextMenuAction, isEditableTarget(), isTextField(), resolveAppContextMenuActions(), sameOriginPath(), selectedText(), GridContextMenu(), GridContextMenuItem() (+6 more)

### Community 160 - "Community 160"
Cohesion: 0.13
Nodes (18): acquireEntitlement(), clearEntitlementRegistry(), EntitlementSnapshot, getEntitlementSnapshot(), IDLE_SNAPSHOT, listeners, LOADING_SNAPSHOT, localSubscriptions (+10 more)

### Community 161 - "Community 161"
Cohesion: 0.15
Nodes (12): useSimulatedFeed(), buildInitialFeed(), FeedCopy, FeedEventTemplate, FeedTone, nextFeedEvent(), SimulatedFeedEvent, FeedList() (+4 more)

### Community 162 - "Community 162"
Cohesion: 0.15
Nodes (17): explainRow(), ReasonTone, RecordSuggestion, RowExplanation, RowReason, SUGGEST_DOMAINS, suggestRecordTypes(), buildQuery() (+9 more)

### Community 163 - "Community 163"
Cohesion: 0.13
Nodes (13): orderOpenGuard, scanNavigationGuard, tabNavigationGuard, isTabRouteName(), NO_TRANSITION, resolveTabRouteName(), TAB_ORDER, TabRouteName (+5 more)

### Community 164 - "Community 164"
Cohesion: 0.19
Nodes (1): PersistenceEngine

### Community 165 - "Community 165"
Cohesion: 0.15
Nodes (14): canMechanicClaimWorkOrder(), CLAIMABLE_WORK_ORDER_STATUSES, ClaimEligibilityResult, CLOSED_WORK_ORDER_STATUSES, countOpenAssignedWorkOrders(), evaluateClaimEligibility(), hasUnassignedLaborLine(), isAssignedToWorkOrder() (+6 more)

### Community 166 - "Community 166"
Cohesion: 0.11
Nodes (18): body, callout, caption1, caption2, fontFamily, fontWeight, footnote, headline (+10 more)

### Community 167 - "Community 167"
Cohesion: 0.16
Nodes (13): AutocompleteDataSnapshot, AutocompleteDataStore, EMPTY, getAutocompleteDataSnapshot(), useAutocompleteDataStore, AutocompleteDataHead(), useCachedRealtime(), MOTOR_STATUSES (+5 more)

### Community 168 - "Community 168"
Cohesion: 0.20
Nodes (14): ColumnMapping, createAutoColumnMapping(), detectEngineField(), EngineFieldMapping, isLikelySoldSheetName(), normalizeHeader(), parseSheetBrandEngine(), buildImportRows() (+6 more)

### Community 169 - "Community 169"
Cohesion: 0.12
Nodes (10): borderStyle(), cornerStyle, toneStyles(), touchTarget, ringBorder(), createCardStyle(), createInputTextStyle(), createSurfaceCardStyle() (+2 more)

### Community 170 - "Community 170"
Cohesion: 0.19
Nodes (13): exchangeAppleSignInViaApi(), formatAppleNativeErrorForUi(), getAppleNativeBundleId(), createRandomNonce(), sha256Nonce(), sha256NonceHex(), applyAppleProfileFromCredential(), buildAppleApiPayload() (+5 more)

### Community 171 - "Community 171"
Cohesion: 0.23
Nodes (13): bufferToDataUrl(), persistCompanyLogo(), uploadCompanyLogoAdmin(), uploadCompanyLogoToFirestore(), uploadCompanyLogoToStorage(), assertLogoUpload(), buildFirebaseStorageDownloadUrl(), EXTENSION_BY_TYPE (+5 more)

### Community 172 - "Community 172"
Cohesion: 0.15
Nodes (9): fetchLocationContentsFromFirestore(), listeners, LocationOpsPending, PendingAssignAsset, PendingFillLocation, PendingRelocateItem, relocatePendingStore, LocationContentsResponse (+1 more)

### Community 173 - "Community 173"
Cohesion: 0.21
Nodes (16): hydrateMembershipNames(), listUserCompanyMembershipIds(), loadEmployeeCompanyMemberships(), loadOwnedCompanyMemberships(), loadStoredMemberships(), loadUserCompanyMemberships(), mapMembershipDocs(), mergeCompanyMemberships() (+8 more)

### Community 174 - "Community 174"
Cohesion: 0.16
Nodes (14): PendingAdd, CompositionRouter, navigateEditOrderWithMotor(), navigateEditOrderWithPart(), navigateNewOrderWithMotor(), navigateNewOrderWithPart(), navigateOrderEdit(), WorkOrderMotorOutcome (+6 more)

### Community 175 - "Community 175"
Cohesion: 0.19
Nodes (12): formatExportDate(), parseExcelDateValue(), appendUniqueSheet(), brandLabel(), buildMotorExportWorkbook(), engineLabel(), engineSheetHeaders(), exportMotorsToExcelFile() (+4 more)

### Community 176 - "Community 176"
Cohesion: 0.25
Nodes (15): idbDeleteDraft(), idbDeleteQueueItem(), idbFindQueueByKey(), idbGetDraft(), idbGetQueueItem(), idbListDrafts(), idbListQueue(), idbPutDraft() (+7 more)

### Community 177 - "Community 177"
Cohesion: 0.25
Nodes (15): adminToDate(), applyOpsToPatterns(), backfillFromWorkOrders(), companyRef(), emit(), ensureKnowledgeHistorySeeded(), eventsCol(), getSuggestions() (+7 more)

### Community 178 - "Community 178"
Cohesion: 0.15
Nodes (11): PageTransitionProvider(), WebVitalsReporter(), AppLocaleProvider(), AppProviders(), AppProvidersProps, AuthProvider(), QueryProvider(), QueryProviderProps (+3 more)

### Community 179 - "Community 179"
Cohesion: 0.21
Nodes (13): collectTierSignals(), detectPerformanceTier(), refinePerformanceTier(), sampleFrameRate(), scoreTier(), TierSignals, PerformanceTier, PREFETCH_ROUTES_LOW_TIER (+5 more)

### Community 180 - "Community 180"
Cohesion: 0.17
Nodes (15): emit(), EMPTY_PRODUCTS, getFlow(), getPurchaseStoreSnapshot(), isFlowBusy(), listeners, PurchaseStoreSnapshot, resetPurchaseStore() (+7 more)

### Community 181 - "Community 181"
Cohesion: 0.15
Nodes (7): ENTER_FADE, EXIT_FADE, sheetIn, sheetOut, toastIn(), toastOut(), ToastProvider()

### Community 182 - "Community 182"
Cohesion: 0.15
Nodes (8): ScreenEnterConfig, useFadeIn(), usePageEnter(), useStaggerFadeIn(), cardLift, cardPress, motionTiming, skeletonPulse

### Community 183 - "Community 183"
Cohesion: 0.16
Nodes (7): AnimatedPath, AppLoadingLogo(), AppLoadingLogoProps, AppLoadingLogoDrawable(), AppLoadingLogoDrawableProps, AppLoadingLogoStatic(), easeInOut

### Community 184 - "Community 184"
Cohesion: 0.23
Nodes (12): clearVerificationCode(), codePepper(), hashesMatch(), hashVerificationCode(), incrementVerificationAttempts(), isValidVerificationCodeFormat(), normalizeVerificationCodeInput(), readVerificationRecord() (+4 more)

### Community 185 - "Community 185"
Cohesion: 0.18
Nodes (13): ACTIONS, parseOutcome(), POST(), ScanFeedbackPayload, createKnowledgeRepository(), fromSuggestionFeedback(), authHeaders(), backfillKnowledge() (+5 more)

### Community 186 - "Community 186"
Cohesion: 0.14
Nodes (8): SidebarAnimatedSectionProps, SIDEBAR_NAV_EASE, sidebarBlockEnterTransition(), sidebarNavActiveSpring, sidebarNavItemEnterTransition(), UseSectionPinOptions, usePerformanceTier(), GlassSurfaceProps

### Community 187 - "Community 187"
Cohesion: 0.22
Nodes (13): computeMobileFilterCounts(), computeMobileOrdersMeta(), estimateProgress(), formatTimeLabel(), isClosedStatus(), isClosedToday(), isSameCalendarDay(), mapDomainStatusToMobile() (+5 more)

### Community 188 - "Community 188"
Cohesion: 0.24
Nodes (12): DASHBOARD_ANIMATED_PREFIXES, isDashboardAnimatedPath(), isMarketingInternalPath(), isMarketingNavPath(), isMarketingPublicPath(), marketingSegment(), pathToBarbaNamespace(), shouldAnimateDashboardNavigation() (+4 more)

### Community 189 - "Community 189"
Cohesion: 0.24
Nodes (11): appLoginOrigin(), DESKTOP_DOWNLOAD_FILES, DesktopDownloadLinks, downloadsBaseUrl(), getDesktopDownloadLinks(), resolveDownloadUrl(), hasDesktopDownloadsConfigured(), hasLocalDesktopInstaller() (+3 more)

### Community 190 - "Community 190"
Cohesion: 0.22
Nodes (12): buildExistingIndexes(), conflictFields(), duplicateMotorRows(), enrichMotorRowsWithDuplicates(), enrichRowsWithDuplicates(), enrichSingleRow(), ExistingIndexes, findFuzzyDuplicate() (+4 more)

### Community 191 - "Community 191"
Cohesion: 0.32
Nodes (9): buildTransitionData(), getBarba(), initBarbaRuntime(), pageSchema(), resetBarbaContainerVisibility(), runBarbaEnter(), runBarbaLeave(), shouldPrefetchRoute() (+1 more)

### Community 192 - "Community 192"
Cohesion: 0.19
Nodes (8): createPresenceRepository(), useClientsRealtime(), presenceRepository, usePresenceHeartbeat(), useVehiclesRealtime(), PresenceHeartbeatHead(), KEEP, SessionRealtimeHead()

### Community 193 - "Community 193"
Cohesion: 0.22
Nodes (12): Bucket, BUCKET_LABEL, BUCKET_ORDER, bucketFor(), buildOrderRows(), buildOrderSections(), OrderRowPosition, OrdersRow (+4 more)

### Community 194 - "Community 194"
Cohesion: 0.19
Nodes (12): __dirname, docs, infoCards(), listItems(), outDir, parts, qr(), rows (+4 more)

### Community 195 - "Community 195"
Cohesion: 0.22
Nodes (9): cycleTabOption(), DatalistInput(), DatalistInputProps, DatalistOption, findFlexibleInlineSuggestion(), findInlineSuggestion(), getTabCycleCandidates(), InlineSuggestion (+1 more)

### Community 196 - "Community 196"
Cohesion: 0.18
Nodes (4): Item(), ItemMedia(), itemMediaVariants, itemVariants

### Community 197 - "Community 197"
Cohesion: 0.27
Nodes (11): activateInternalPro(), addDays(), INTERNAL_PRO_DAYS, isInternallyManaged(), periodEndTimestamp(), readPeriodEnd(), refreshInternalSubscription(), RefreshSubscriptionResult (+3 more)

### Community 198 - "Community 198"
Cohesion: 0.23
Nodes (6): ChartTooltipWeekdayStyle, DashboardDateStyle, formatChartAxisTick(), formatChartTooltipDate(), formatDate(), parseIsoCalendarDate()

### Community 199 - "Community 199"
Cohesion: 0.27
Nodes (9): DeskConnectionPlatform, DeskConnectionRecord, DeskConnectionsSnapshot, connectionsCollection(), deleteDeskConnection(), listDeskConnections(), mapDoc(), replaceDeskConnections() (+1 more)

### Community 200 - "Community 200"
Cohesion: 0.29
Nodes (11): hydrateMembershipNames(), listUserCompanyMemberships(), loadEmployeeCompanyMemberships(), loadOwnedCompanyMemberships(), loadStoredMemberships(), mergeCompanyMemberships(), recordUserCompanyMembership(), repairMissingMemberships() (+3 more)

### Community 201 - "Community 201"
Cohesion: 0.23
Nodes (10): closeSearch(), DASHBOARD, els, ICONS, openSearch(), params, renderList(), SEARCH_ITEMS (+2 more)

### Community 202 - "Community 202"
Cohesion: 0.24
Nodes (5): AnimatedTabScreen, AnimatedTabScreenProps, StaticTabScreen, ProfileScreen(), WarehouseScreen()

### Community 203 - "Community 203"
Cohesion: 0.23
Nodes (6): getStartupSummary(), CacheSettingsScreen(), DiagnosticsSettingsScreen(), formatMark(), estimateCacheSizeBytes(), formatCacheSize()

### Community 204 - "Community 204"
Cohesion: 0.25
Nodes (5): AppBreadcrumbPage, Breadcrumb(), BreadcrumbItem(), BreadcrumbList(), BreadcrumbPage()

### Community 205 - "Community 205"
Cohesion: 0.24
Nodes (9): OrderWorkflowProgress(), OrderWorkflowProgressProps, getWorkflowStages(), resolveStageIndex(), STAGE_LABELS, WorkflowStage, WorkflowStageId, OrderStatus (+1 more)

### Community 206 - "Community 206"
Cohesion: 0.27
Nodes (9): AppLocale, getLocaleMetadata(), isAppLocale(), LOCALE_METADATA, LocaleMetadata, normalizeLocale(), resolveLocale(), SUPPORTED_LOCALES (+1 more)

### Community 207 - "Community 207"
Cohesion: 0.22
Nodes (4): DemoResetOptions, dispatchDemoReset(), hasDemoResetDone(), resetDemoWorkspaceRemote()

### Community 208 - "Community 208"
Cohesion: 0.29
Nodes (8): buildListingDraft(), readPhotoUrls(), readSalePrice(), DesktopMotorSummary, ListingDraft, ListingPlatform, GET(), parsePlatform()

### Community 209 - "Community 209"
Cohesion: 0.27
Nodes (9): getPuppeteerBrowser(), globalStore, launchBrowser(), PuppeteerGlobal, MAC_BROWSER_CANDIDATES, resolvePuppeteerCacheChrome(), resolvePuppeteerExecutablePath(), resolvePuppeteerLaunchArgs() (+1 more)

### Community 210 - "Community 210"
Cohesion: 0.31
Nodes (2): DomainDictionary, isSubsequence()

### Community 211 - "Community 211"
Cohesion: 0.22
Nodes (5): CreateWarrantyInput, EngineWarranty, WARRANTY_STATUSES, WarrantyStatus, useMotorWarrantyRealtime()

### Community 212 - "Community 212"
Cohesion: 0.31
Nodes (9): buildFillOperations(), formatDate(), formatDecimal(), isInsideRange(), modIndex(), parseDecimal(), resolveFillDragTarget(), sequenceValue() (+1 more)

### Community 213 - "Community 213"
Cohesion: 0.18
Nodes (7): bundleDir, __dirname, macApp, macDmg, OUT_DIR, ROOT, TARGET_DIR

### Community 214 - "Community 214"
Cohesion: 0.25
Nodes (10): asPurchaseFailure(), CODE_MAP, failure(), isCancellation(), isPurchaseFailure(), MESSAGES, readErrorCode(), toPurchaseFailure() (+2 more)

### Community 215 - "Community 215"
Cohesion: 0.38
Nodes (8): buildAppleRedirectBridgeHtml(), buildLoginReturnPath(), isDesktopShellUserAgent(), POST(), AppleRedirectPayload, buildAppleRedirectPayload(), parseAppleRedirectFormEntry(), parseAppleRedirectUserField()

### Community 216 - "Community 216"
Cohesion: 0.24
Nodes (7): INVENTORY_DOCUMENT_STATUSES, INVENTORY_DOCUMENT_TYPES, InventoryDocument, InventoryDocumentStatus, InventoryDocumentType, createInventoryDocumentRepository(), InventoryDocumentRepository

### Community 217 - "Community 217"
Cohesion: 0.22
Nodes (6): errors, flattenMessages(), messagesRoot, readCatalog(), requiredLocales, root

### Community 218 - "Community 218"
Cohesion: 0.33
Nodes (8): appendTeamActivityLog(), backfillTeamJoinNotificationsForCompany(), deliverInboxNotification(), emitEmployeeJoinedByInviteNotifications(), emitMemberAccessSuspendedNotification(), emitMemberRemovedFromCompanyNotification(), normalizeRole(), ROLE_LABELS

### Community 219 - "Community 219"
Cohesion: 0.36
Nodes (9): SystemStatusComponentId, checkAuth(), checkFirestore(), checkStorage(), ComponentStatus, GET(), StatusResponse, withTimeout() (+1 more)

### Community 220 - "Community 220"
Cohesion: 0.36
Nodes (8): formatRelativeTime(), loadRecentScans(), mapStored(), migrateLegacyIfNeeded(), normalizeStored(), readMmkv(), rememberRecentScan(), StoredRecentScan

### Community 221 - "Community 221"
Cohesion: 0.22
Nodes (8): appUrl, CONF_FILE, __dirname, parseEnvFile(), resolveDesktopAppUrl(), ROOT, TAURI_DIR, URL_FILE

### Community 222 - "Community 222"
Cohesion: 0.22
Nodes (2): NavigationMenuTrigger(), navigationMenuTriggerStyle

### Community 223 - "Community 223"
Cohesion: 0.31
Nodes (5): GET(), readSha256Fingerprints(), buildAndroidAssetLinks(), buildAppleAppSiteAssociation(), MOBILE_UNIVERSAL_LINK_PATHS

### Community 224 - "Community 224"
Cohesion: 0.28
Nodes (6): ProfileDangerZoneProps, ProfileNavCard(), ProfileNavCardProps, ProfileSettingsGroup(), ProfileSettingsGroupProps, ProfileDangerAction

### Community 225 - "Community 225"
Cohesion: 0.44
Nodes (8): COMPANY_MUTABLE_SUBCOLLECTIONS, deleteCollectionRecursive(), deleteDemoEmployeesExceptOwner(), deleteDemoInvites(), deleteDemoUserMotors(), deleteTopLevelByCompanyId(), resetDemoWorkspaceData(), TOP_LEVEL_COMPANY_SCOPED

### Community 226 - "Community 226"
Cohesion: 0.28
Nodes (6): AppLocale, isMarketingLocale(), LocaleLayoutProps, MarketingLocaleLayout(), MarketingJsonLd(), LocaleHtmlLang()

### Community 227 - "Community 227"
Cohesion: 0.42
Nodes (7): authHeaders(), createImportBatchClient(), fetchImportBatchDetail(), fetchImportBatches(), reviveBatch(), reviveFile(), uploadImportBatchFileClient()

### Community 228 - "Community 228"
Cohesion: 0.25
Nodes (3): ScrollVelocityContext, ScrollVelocityRowImplProps, ScrollVelocityRowProps

### Community 229 - "Community 229"
Cohesion: 0.25
Nodes (6): AnimatedLine, AuthHeroCar(), FRONT_WHEEL, REAR_WHEEL, SPEED_LINES, WheelProps

### Community 230 - "Community 230"
Cohesion: 0.39
Nodes (4): CompanySettingsAccessError, readBearerToken(), VerifiedCompanySettingsAccess, verifyCompanySettingsAccess()

### Community 231 - "Community 231"
Cohesion: 0.36
Nodes (5): dismissDocumentImport(), getDismissedDocumentImportIds(), markDocumentImportInboxSeen(), readDismissedIds(), writeDismissedIds()

### Community 232 - "Community 232"
Cohesion: 0.39
Nodes (4): ScanDisambiguateResponse, scanDisambiguateResponseSchema, ScanOcrResponse, scanOcrResponseSchema

### Community 233 - "Community 233"
Cohesion: 0.43
Nodes (7): FuzzyScanCandidate, isBarcodeLikeCode(), isSubsequence(), rankFuzzyScanCandidates(), scoreCode(), stockSignal(), WEIGHTS

### Community 234 - "Community 234"
Cohesion: 0.46
Nodes (7): applyMotorImportJobRemote(), cancelMotorImportJobRemote(), fetchMotorImportPreviewRemote(), readAuthToken(), reanalyzeMotorImportJobRemote(), retryMotorImportJob(), startMotorImportJob()

### Community 235 - "Community 235"
Cohesion: 0.32
Nodes (5): getDeepestActiveRoute(), isModalOverlayRoute(), isNestedTabStackActive(), TAB_BAR_VISIBLE_NESTED_ROUTES, TabNavRoute

### Community 236 - "Community 236"
Cohesion: 0.39
Nodes (7): evaluateExpiringWarrantiesRule(), evaluateLowInventoryRule(), evaluateOpenWorkOrdersRule(), evaluateOverdueInvoicesRule(), runCompanyNotificationRules(), runEveningNotificationRules(), runMorningNotificationRules()

### Community 237 - "Community 237"
Cohesion: 0.32
Nodes (4): diffSnapshots(), FieldDiff, RecoveryCandidate, RecoveryManager

### Community 238 - "Community 238"
Cohesion: 0.25
Nodes (2): NetworkListener, NetworkMonitor

### Community 239 - "Community 239"
Cohesion: 0.25
Nodes (1): SaveScheduler

### Community 240 - "Community 240"
Cohesion: 0.25
Nodes (4): appleAuthorize, appleTokenRequests, events, handlerUrls

### Community 241 - "Community 241"
Cohesion: 0.46
Nodes (7): buildVerificationCodeEmailHtml(), codePepper(), escapeHtml(), generateVerificationCode(), hashVerificationCode(), initAdmin(), main()

### Community 242 - "Community 242"
Cohesion: 0.50
Nodes (7): build_main_window(), desktop_user_agent(), is_oauth_popup_url(), oauth_window_label(), open_main_window(), run(), trimmed_desktop_url()

### Community 243 - "Community 243"
Cohesion: 0.48
Nodes (5): MobileAccessError, readBearerToken(), VerifiedMobileAccess, verifyMobileAccess(), verifyMobileAuth()

### Community 244 - "Community 244"
Cohesion: 0.48
Nodes (6): activateInternalProRemote(), postBilling(), readAuthToken(), RefreshBillingRemoteResult, refreshCompanyBillingRemote(), startCompanyTrialRemote()

### Community 245 - "Community 245"
Cohesion: 0.33
Nodes (6): DEMO_CLIENT_IDS, DEMO_ITEM_IDS, DEMO_VEHICLE_IDS, DEMO_WORK_ORDER_IDS, seedDemoWorkspaceData(), ts()

### Community 246 - "Community 246"
Cohesion: 0.29
Nodes (6): authErrorMessagesEn, authErrorMessagesRu, permissionLabelsEn, permissionLabelsRu, roleLabelsEn, roleLabelsRu

### Community 247 - "Community 247"
Cohesion: 0.33
Nodes (5): MarketingBarbaLayout(), MarketingBarbaLayoutProps, MarketingBarbaShell(), MarketingMotionProvider(), MarketingMotionProviderProps

### Community 248 - "Community 248"
Cohesion: 0.33
Nodes (2): MotorsWorkspace(), SoldWorkspace()

### Community 249 - "Community 249"
Cohesion: 0.29
Nodes (3): OUTPUT_PATH, started, WAIT_MS

### Community 250 - "Community 250"
Cohesion: 0.47
Nodes (4): DesktopAccessError, readBearerToken(), VerifiedDesktopAccess, verifyDesktopAccess()

### Community 251 - "Community 251"
Cohesion: 0.33
Nodes (5): config, { getDefaultConfig }, path, sharedPackages, { withNativeWind }

### Community 252 - "Community 252"
Cohesion: 0.60
Nodes (5): createDemoCustomToken(), demoPassword(), ensureDemoAuthUser(), ensureDemoWorkspace(), isUserNotFound()

### Community 253 - "Community 253"
Cohesion: 0.60
Nodes (5): columnFromContentX(), pointerContentCoords(), resolvePointerCell(), resolvePointerCellClamped(), ResolvePointerCellOptions

### Community 254 - "Community 254"
Cohesion: 0.47
Nodes (5): getPanelTriggers(), PanelLifecycleOptions, resumePanelAnimations(), suspendPanelAnimations(), usePanelLifecycle()

### Community 255 - "Community 255"
Cohesion: 0.47
Nodes (5): buildExplanation(), BuildExplanationParams, pluralizeObservations(), windowSuffix(), KnowledgePatternKind

### Community 256 - "Community 256"
Cohesion: 0.33
Nodes (5): CHROMIUM_TRACE_INCLUDES, MONOREPO_TRACE_EXCLUDES, nextConfig, withBundleAnalyzer, withNextIntl

### Community 257 - "Community 257"
Cohesion: 0.33
Nodes (1): DraftManager

### Community 258 - "Community 258"
Cohesion: 0.33
Nodes (2): createOpId(), OfflineQueue

### Community 259 - "Community 259"
Cohesion: 0.53
Nodes (5): dismissedInMemory, dismissProductUpdate(), isProductUpdateDismissed(), readDismissedIds(), writeDismissedIds()

### Community 260 - "Community 260"
Cohesion: 0.47
Nodes (2): VersionSettingsScreen(), openPhone()

### Community 261 - "Community 261"
Cohesion: 0.53
Nodes (5): deriveBillingInterval(), deriveProActive(), initAdmin(), main(), SubscriptionDoc

### Community 262 - "Community 262"
Cohesion: 0.33
Nodes (5): args, body, flags, source, target

### Community 263 - "Community 263"
Cohesion: 0.33
Nodes (5): BarbaCore, IBarbaOptions, ISchemaPage, ITransitionData, ITransitionPage

### Community 264 - "Community 264"
Cohesion: 0.70
Nodes (4): getAppleWebSetupHint(), getFirebaseAppleRedirectUrl(), getFirebaseProjectId(), isAppleWebAuthConfigured()

### Community 265 - "Community 265"
Cohesion: 0.80
Nodes (3): isDenseInventoryChromeRoute(), isDocumentImportReviewRoute(), shouldShowDocumentImportTopBarIsland()

### Community 266 - "Community 266"
Cohesion: 0.40
Nodes (4): __dirname, MIME, PORT, server

### Community 267 - "Community 267"
Cohesion: 0.50
Nodes (2): MarketingLayoutProps, YandexMetrika()

### Community 268 - "Community 268"
Cohesion: 0.60
Nodes (4): dispatchPushForNotification(), dispatchSilentBadgeUpdate(), ExpoPushMessage, sendExpoPush()

### Community 269 - "Community 269"
Cohesion: 0.50
Nodes (4): main(), normalizeRole(), Role, ROLE_PERMISSIONS

### Community 270 - "Community 270"
Cohesion: 0.60
Nodes (4): createNotification(), init(), main(), ROLE_LABELS

### Community 271 - "Community 271"
Cohesion: 0.40
Nodes (4): MarketingMessages, MarketingPageSection, MarketingSection, MarketingSeoPageKey

### Community 272 - "Community 272"
Cohesion: 0.50
Nodes (2): AddPartPayload, RouteContext

### Community 273 - "Community 273"
Cohesion: 0.67
Nodes (3): ASSOCIATION_PATH, GET(), readAssociationFile()

### Community 274 - "Community 274"
Cohesion: 0.50
Nodes (2): ClaimPayload, RouteContext

### Community 275 - "Community 275"
Cohesion: 0.50
Nodes (2): I18N_NAMESPACES, I18nNamespace

### Community 277 - "Community 277"
Cohesion: 0.67
Nodes (3): CreateItemPayload, parseOptionalNumber(), POST()

### Community 278 - "Community 278"
Cohesion: 0.83
Nodes (3): GET(), isAuthorized(), POST()

### Community 279 - "Community 279"
Cohesion: 0.67
Nodes (2): csvInput(), inputFromBytes()

### Community 280 - "Community 280"
Cohesion: 0.50
Nodes (1): DATASET_DIR

### Community 281 - "Community 281"
Cohesion: 0.83
Nodes (3): generateInviteCode(), generateInviteToken(), pickFromAlphabet()

### Community 282 - "Community 282"
Cohesion: 0.50
Nodes (2): LoginLayoutProps, metadata

### Community 283 - "Community 283"
Cohesion: 0.67
Nodes (3): resolveApsEnvironment(), { withEntitlementsPlist, withInfoPlist }, withIosPushEntitlements()

### Community 284 - "Community 284"
Cohesion: 0.50
Nodes (1): { withEntitlementsPlist }

### Community 285 - "Community 285"
Cohesion: 0.83
Nodes (3): initAdmin(), main(), readCompanyIdArg()

### Community 286 - "Community 286"
Cohesion: 0.50
Nodes (2): child, ROOT

### Community 287 - "Community 287"
Cohesion: 0.50
Nodes (3): authCode, { clientSecret, header, payload }, flags

### Community 288 - "Community 288"
Cohesion: 0.50
Nodes (3): opacity, OpacityKey, semanticOpacity

### Community 290 - "Community 290"
Cohesion: 0.67
Nodes (1): size

### Community 291 - "Community 291"
Cohesion: 0.67
Nodes (1): size

### Community 292 - "Community 292"
Cohesion: 0.67
Nodes (1): size

### Community 293 - "Community 293"
Cohesion: 0.67
Nodes (1): AppleSignInBody

### Community 294 - "Community 294"
Cohesion: 0.67
Nodes (1): Body

### Community 295 - "Community 295"
Cohesion: 0.67
Nodes (1): ExternalLinkProps

### Community 296 - "Community 296"
Cohesion: 0.67
Nodes (1): SettingsAnimatedCardProps

### Community 297 - "Community 297"
Cohesion: 0.67
Nodes (2): productContent, ProductSectionId

### Community 298 - "Community 298"
Cohesion: 0.67
Nodes (1): DocumentImportPreviewResult

### Community 299 - "Community 299"
Cohesion: 0.67
Nodes (1): RouteContext

### Community 300 - "Community 300"
Cohesion: 0.67
Nodes (1): GridViewport

### Community 301 - "Community 301"
Cohesion: 0.67
Nodes (1): PageProps

### Community 302 - "Community 302"
Cohesion: 1.00
Nodes (2): getModKeyLabel(), getSearchShortcutLabel()

### Community 303 - "Community 303"
Cohesion: 0.67
Nodes (1): Params

### Community 305 - "Community 305"
Cohesion: 0.67
Nodes (1): PatchBody

### Community 306 - "Community 306"
Cohesion: 0.67
Nodes (1): PreparedVisionImage

### Community 307 - "Community 307"
Cohesion: 0.67
Nodes (1): QuickAdjustPayload

### Community 308 - "Community 308"
Cohesion: 0.67
Nodes (1): QuickReceivePayload

### Community 309 - "Community 309"
Cohesion: 0.67
Nodes (1): RegisterDeviceBody

### Community 310 - "Community 310"
Cohesion: 0.67
Nodes (1): RelocatePayload

### Community 311 - "Community 311"
Cohesion: 0.67
Nodes (2): inputPath, outputPath

### Community 312 - "Community 312"
Cohesion: 0.67
Nodes (1): result

### Community 313 - "Community 313"
Cohesion: 0.67
Nodes (1): MarketingSectionProps

### Community 314 - "Community 314"
Cohesion: 0.67
Nodes (2): TabBarVisibilityState, useTabBarVisibilityStore

### Community 327 - "Community 327"
Cohesion: 1.00
Nodes (1): eslintConfig

### Community 333 - "Community 333"
Cohesion: 1.00
Nodes (1): userCopyEn

### Community 334 - "Community 334"
Cohesion: 1.00
Nodes (1): userCopyRu

### Community 339 - "Community 339"
Cohesion: 1.00
Nodes (1): config

### Community 348 - "Community 348"
Cohesion: 1.00
Nodes (1): steps

### Community 349 - "Community 349"
Cohesion: 1.00
Nodes (1): companyId

## Knowledge Gaps
- **2311 isolated node(s):** `ENTER_FADE`, `EXIT_FADE`, `sheetIn`, `sheetOut`, `ScreenEnterConfig` (+2306 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 164`** (1 nodes): `PersistenceEngine`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 210`** (2 nodes): `DomainDictionary`, `isSubsequence()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 222`** (2 nodes): `NavigationMenuTrigger()`, `navigationMenuTriggerStyle`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 238`** (2 nodes): `NetworkListener`, `NetworkMonitor`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 239`** (1 nodes): `SaveScheduler`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 248`** (2 nodes): `MotorsWorkspace()`, `SoldWorkspace()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 257`** (1 nodes): `DraftManager`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 258`** (2 nodes): `createOpId()`, `OfflineQueue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 260`** (2 nodes): `VersionSettingsScreen()`, `openPhone()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 267`** (2 nodes): `MarketingLayoutProps`, `YandexMetrika()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 272`** (2 nodes): `AddPartPayload`, `RouteContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 274`** (2 nodes): `ClaimPayload`, `RouteContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 275`** (2 nodes): `I18N_NAMESPACES`, `I18nNamespace`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 279`** (2 nodes): `csvInput()`, `inputFromBytes()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 280`** (1 nodes): `DATASET_DIR`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 282`** (2 nodes): `LoginLayoutProps`, `metadata`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 284`** (1 nodes): `{ withEntitlementsPlist }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 286`** (2 nodes): `child`, `ROOT`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 290`** (1 nodes): `size`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 291`** (1 nodes): `size`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 292`** (1 nodes): `size`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 293`** (1 nodes): `AppleSignInBody`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 294`** (1 nodes): `Body`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 295`** (1 nodes): `ExternalLinkProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 296`** (1 nodes): `SettingsAnimatedCardProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 297`** (2 nodes): `productContent`, `ProductSectionId`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 298`** (1 nodes): `DocumentImportPreviewResult`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 299`** (1 nodes): `RouteContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 300`** (1 nodes): `GridViewport`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 301`** (1 nodes): `PageProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 302`** (2 nodes): `getModKeyLabel()`, `getSearchShortcutLabel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 303`** (1 nodes): `Params`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 305`** (1 nodes): `PatchBody`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 306`** (1 nodes): `PreparedVisionImage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 307`** (1 nodes): `QuickAdjustPayload`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 308`** (1 nodes): `QuickReceivePayload`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 309`** (1 nodes): `RegisterDeviceBody`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 310`** (1 nodes): `RelocatePayload`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 311`** (2 nodes): `inputPath`, `outputPath`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 312`** (1 nodes): `result`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 313`** (1 nodes): `MarketingSectionProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 314`** (2 nodes): `TabBarVisibilityState`, `useTabBarVisibilityStore`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 327`** (1 nodes): `eslintConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 333`** (1 nodes): `userCopyEn`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 334`** (1 nodes): `userCopyRu`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 339`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 348`** (1 nodes): `steps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 349`** (1 nodes): `companyId`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `normalizeCompanyId()` connect `Community 35` to `Community 53`, `Community 4`, `Community 39`, `Community 38`, `Community 54`, `Community 177`, `Community 63`, `Community 28`, `Community 44`, `Community 15`, `Community 250`, `Community 243`, `Community 20`, `Community 128`, `Community 22`, `Community 7`, `Community 10`, `Community 56`, `Community 171`, `Community 230`, `Community 116`, `Community 208`, `Community 13`, `Community 2`, `Community 93`, `Community 42`, `Community 31`, `Community 77`, `Community 153`, `Community 117`, `Community 86`, `Community 62`, `Community 150`, `Community 41`, `Community 200`, `Community 61`, `Community 16`, `Community 137`, `Community 216`, `Community 129`, `Community 52`, `Community 83`, `Community 72`, `Community 172`, `Community 106`, `Community 78`, `Community 68`, `Community 118`, `Community 30`, `Community 149`, `Community 173`, `Community 157`, `Community 102`, `Community 98`, `Community 19`, `Community 211`, `Community 6`, `Community 67`, `Community 192`, `Community 79`, `Community 82`, `Community 24`, `Community 11`, `Community 236`, `Community 218`, `Community 12`, `Community 26`, `Community 37`, `Community 123`, `Community 1`, `Community 76`, `Community 114`, `Community 3`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 13` to `Community 43`, `Community 19`, `Community 53`, `Community 119`, `Community 36`, `Community 3`, `Community 49`, `Community 24`, `Community 64`, `Community 50`, `Community 1`, `Community 75`, `Community 4`, `Community 183`, `Community 41`, `Community 10`, `Community 7`, `Community 31`, `Community 77`, `Community 140`, `Community 27`, `Community 51`, `Community 110`, `Community 136`, `Community 39`, `Community 73`, `Community 42`, `Community 29`, `Community 159`, `Community 129`, `Community 22`, `Community 125`, `Community 67`, `Community 141`, `Community 84`, `Community 59`, `Community 188`, `Community 76`, `Community 12`, `Community 34`, `Community 65`, `Community 44`, `Community 2`, `Community 46`, `Community 8`, `Community 26`, `Community 81`, `Community 40`, `Community 99`, `Community 14`, `Community 204`, `Community 195`, `Community 161`, `Community 186`, `Community 196`, `Community 222`, `Community 228`, `Community 62`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `userCopy` connect `Community 1` to `Community 43`, `Community 19`, `Community 53`, `Community 36`, `Community 119`, `Community 3`, `Community 49`, `Community 4`, `Community 24`, `Community 74`, `Community 50`, `Community 64`, `Community 75`, `Community 10`, `Community 22`, `Community 41`, `Community 7`, `Community 31`, `Community 25`, `Community 26`, `Community 136`, `Community 39`, `Community 13`, `Community 44`, `Community 2`, `Community 55`, `Community 29`, `Community 42`, `Community 65`, `Community 77`, `Community 98`, `Community 40`, `Community 120`, `Community 129`, `Community 67`, `Community 56`, `Community 141`, `Community 84`, `Community 114`, `Community 175`, `Community 34`, `Community 76`, `Community 16`, `Community 12`, `Community 73`, `Community 144`, `Community 62`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `ENTER_FADE`, `EXIT_FADE`, `sheetIn` to the rest of the system?**
  _2311 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.015177152232989797 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03653650980182683 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.026176597582037997 - nodes in this community are weakly interconnected._