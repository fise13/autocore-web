import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import type { EngineIntakeJob } from '@autocore/engine-intake';

import {
  catalogBarState,
  CATALOG_BAR_AT_TOP,
  type CatalogBarState,
} from '@/components/ui/catalog-header-collapse';
import {
  CatalogAddButton,
  CatalogNavBar,
  ContentState,
  Screen,
  ScreenGate,
  toast,
  useCatalogNavBarHeight,
} from '@/components/ui';
import { useFloatingTabBarInset, useMobileAssignAssetLocation, useSession } from '@/hooks';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import type { MobileWarehouseLocation } from '@/hooks/use-mobile-relocate';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import { isRealtimeReady } from '@/lib/realtime/subscription-registry';
import type { MotorEntity } from '@/types/motor';
import type { WarehouseEntity } from '@/types/warehouse';

import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import { SellMotorSheet, type SellMotorSheetRef } from '@/features/search/components/sell-motor-sheet';
import { EnginePhotoViewer } from '@/features/engines/components/engine-photo-viewer';
import { IntakeAcceptSheet } from '@/features/engine-intake/components/intake-accept-sheet';
import { IntakeCreateSerialSheet } from '@/features/engine-intake/components/intake-create-serial-sheet';
import { IntakeOutboxBanner } from '@/features/engine-intake/components/intake-outbox-banner';
import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { useIntakeJobActions } from '@/features/engine-intake/hooks/use-intake-job-actions';
import { useIntakePhotoUploadProgress } from '@/features/engine-intake/hooks/use-intake-photo-upload';
import { isIntakePhotoConflict } from '@/features/engine-intake/lib/count-visible-intake-photos';
import {
  isIntakeOutboxDeployIssue,
  pickIntakeOutboxPhotoIssue,
} from '@/features/engine-intake/lib/intake-outbox-banner-copy';
import { humanizeIntakeOutboxError } from '@/features/engine-intake/store/intake-outbox';

import { EnginesHeaderBlock } from './components/engines-header-block';
import { EnginesList } from './components/engines-list';
import type {
  EngineCatalogActions,
  EngineIncomingActions,
  EngineListHeader,
} from './components/engines-list.types';
import { EngineLocationSheet } from './components/engine-location-sheet';
import {
  ENGINE_QUALITY_FILTER_SEGMENTS,
  type EngineQualityFilterValue,
} from './components/engine-quality-filter-bar';
import { EnginesLiftProvider } from './components/engines-lift-provider';
import {
  ENGINE_LANE_SEGMENTS,
  parseEngineListFilter,
  type EngineListFilter,
} from './lib/engine-lane';
import { deriveEngineCatalog } from './lib/engine-catalog-model';
import { primeEngineSearch } from './lib/engine-variants';
import { incomingJobForMotor } from './lib/motor-from-intake-job';
import { newEngineHref } from './navigation';

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;
}

/** One shared empty catalog, so a viewer without catalog access keeps a stable input. */
const NO_MOTORS: MotorEntity[] = [];
/** Motors whose search text is prepared per idle tick. */
const SEARCH_PRIME_SLICE = 500;

export function EnginesScreen() {
  return (
    <EnginesLiftProvider>
      <EnginesScreenBody />
    </EnginesLiftProvider>
  );
}

function EnginesScreenBody() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string | string[]; new?: string | string[] }>();
  const { scrollBottom } = useFloatingTabBarInset();
  const { companyId, uid, can } = useSession();
  const rbac = useRbacPolicy();
  const motorsEnabled = useCompanyModuleEnabled('motors');
  const [query, setQuery] = useState('');
  const [quality, setQuality] = useState<EngineQualityFilterValue>('all');
  const [bar, setBar] = useState<CatalogBarState>(CATALOG_BAR_AT_TOP);
  const navBarHeight = useCatalogNavBarHeight();
  const deferredQuery = useDeferredValue(query.trim());

  const canViewCatalog =
    motorsEnabled && rbac.can('inventory_view') && rbac.scopes.motors !== 'none';
  const canSeeIntake = can('engine_intake_view');
  const canOpen = canViewCatalog || canSeeIntake;
  const canEdit = motorsEnabled && rbac.can('inventory_edit');
  const canPhotograph = can('engine_intake_execute');
  const canAdd = canEdit || canPhotograph;

  const requestedFilter = parseEngineListFilter(params.filter);
  const wantsComposer = (Array.isArray(params.new) ? params.new[0] : params.new) === '1';
  const [filter, setFilter] = useState<EngineListFilter>(
    () => requestedFilter ?? (canViewCatalog ? 'all' : 'incoming'),
  );

  useEffect(() => {
    if (wantsComposer) {
      router.replace(newEngineHref());
    }
  }, [router, wantsComposer]);

  useEffect(() => {
    if (requestedFilter) setFilter(requestedFilter);
  }, [requestedFilter]);

  const lane: EngineListFilter = !canViewCatalog
    ? 'incoming'
    : !canSeeIntake
      ? 'yard'
      : filter;

  const motorsKey = useMemo(
    () => ['realtime', 'motors', companyId, uid] as const,
    [companyId, uid],
  );
  const motors = useSessionQueryData<MotorEntity[]>(
    motorsKey,
    Boolean(companyId && uid) && canViewCatalog,
    [],
  );
  const catalogLoading = canViewCatalog && motors.length === 0 && !isRealtimeReady(motorsKey);

  const intake = useEngineIntakeJobs(canSeeIntake && companyId ? companyId : null);
  const actions = useIntakeJobActions(companyId || null);
  const photoUploadProgress = useIntakePhotoUploadProgress(companyId, actions.outbox.photos);

  /**
   * Newest local capture per intake job, for rows whose photo has not reached
   * the server yet.
   *
   * Built once for the whole list. The row used to derive this itself, by
   * copying the entire outbox, reversing it and scanning for its own job — so a
   * bay of twenty engines with sixty queued photos did twenty reversals and
   * twelve hundred comparisons on every render, to answer twenty questions.
   */
  const previewUriByJobId = useMemo(() => {
    const map = new Map<string, string>();
    for (const photo of actions.outbox.photos) {
      if (!photo.localUri || isIntakePhotoConflict(photo)) continue;
      // Later rows overwrite earlier ones, so the last write is the newest shot.
      map.set(photo.jobId, photo.localUri);
    }
    return map;
  }, [actions.outbox.photos]);

  const jobsById = useMemo(() => {
    const map = new Map<string, EngineIntakeJob>();
    for (const job of intake.jobs) map.set(job.id, job);
    return map;
  }, [intake.jobs]);

  const jobForMotor = useCallback(
    (motor: MotorEntity) => incomingJobForMotor(motor, jobsById),
    [jobsById],
  );

  const catalog = useMemo(
    () =>
      deriveEngineCatalog({
        jobs: intake.jobs,
        motors: canViewCatalog ? motors : NO_MOTORS,
        query: deferredQuery,
        quality,
        lane,
      }),
    [canViewCatalog, deferredQuery, intake.jobs, lane, motors, quality],
  );
  const { rows } = catalog;

  // Warm search text in idle slices so the first keystroke is as quick as the rest.
  useEffect(() => {
    if (!canViewCatalog || motors.length === 0) return;
    let cancelled = false;
    let next = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const slice = () => {
      if (cancelled) return;
      next = primeEngineSearch(motors, next, SEARCH_PRIME_SLICE);
      if (next < motors.length) timer = setTimeout(slice, 0);
    };
    const handle = InteractionManager.runAfterInteractions(slice);
    return () => {
      cancelled = true;
      handle.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [canViewCatalog, motors]);
  const unitCount =
    lane === 'incoming'
      ? catalog.incomingCount
      : lane === 'yard'
        ? catalog.yardCount
        : catalog.incomingCount + catalog.yardCount;

  const openEngine = useCallback(
    (motorId: string) => {
      router.push(`/objects/engine/${motorId}` as Href);
    },
    [router],
  );

  const addEngine = useCallback(() => {
    router.push(newEngineHref(deferredQuery ? { serial: deferredQuery } : undefined));
  }, [deferredQuery, router]);

  const handleUnitPress = useCallback(
    (motor: MotorEntity, laneKind: 'incoming' | 'yard') => {
      if (laneKind === 'incoming') {
        const job = jobForMotor(motor);
        if (job) {
          actions.handleIncomingPress(job);
          return;
        }
      }
      openEngine(motor.id);
    },
    [actions, jobForMotor, openEngine],
  );

  const incomingActions = useMemo<EngineIncomingActions>(
    () => ({
      onContinue: (motor) => {
        const job = jobForMotor(motor);
        if (job) actions.claimAndOpen(job);
      },
      onAccept: (motor) => {
        const job = jobForMotor(motor);
        if (job) void actions.openAcceptSheet(job);
      },
      onEdit: (motor) => {
        const job = jobForMotor(motor);
        if (job) actions.openEditSheet(job);
      },
      onCancel: (motor) => {
        const job = jobForMotor(motor);
        if (job) actions.cancelJob(job);
      },
    }),
    [actions, jobForMotor],
  );

  const addToOrderFlow = useAddToOrderFlow();
  const sellSheetRef = useRef<SellMotorSheetRef>(null);
  const locationSheetRef = useRef<BottomSheetModal>(null);
  const relocateMotorRef = useRef<MotorEntity | null>(null);
  const [relocateMotor, setRelocateMotor] = useState<MotorEntity | null>(null);
  const assignLocation = useMobileAssignAssetLocation();

  const warehouses = useSessionQueryData<WarehouseEntity[]>(
    ['realtime', 'warehouses', companyId],
    Boolean(companyId) && canViewCatalog,
    [],
  );
  const warehouseId = useMemo(() => {
    const preferred = warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0];
    return preferred?.id ?? null;
  }, [warehouses]);

  const addMotorToOrder = addToOrderFlow.addMotorToOrder;
  const catalogActions = useMemo<EngineCatalogActions>(
    () => ({
      onRelocate: (motor) => {
        relocateMotorRef.current = motor;
        setRelocateMotor(motor);
        requestAnimationFrame(() => locationSheetRef.current?.present());
      },
      onAddToOrder: (motor) => {
        addMotorToOrder(motor.id);
      },
      onSell: (motor) => {
        sellSheetRef.current?.present(motor);
      },
    }),
    [addMotorToOrder],
  );

  const relocate = useCallback(
    async (location: MobileWarehouseLocation) => {
      const motor = relocateMotorRef.current;
      if (!motor) return;
      try {
        await assignLocation.mutateAsync({
          entityType: 'motor',
          entityId: motor.id,
          toLocationId: location.id,
          warehouseId: location.warehouseId || warehouseId || undefined,
        });
        locationSheetRef.current?.dismiss();
        toast({
          title: 'Engine moved',
          description: location.displayCode || location.code,
          variant: 'success',
        });
      } catch (error) {
        toast({
          title: 'Could not move the engine',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    },
    [assignLocation, warehouseId],
  );

  const onScrollOffset = useCallback((offsetY: number) => {
    // `catalogBarState` hands back the very same object when nothing crossed a
    // threshold, and React bails out of a render that changes nothing — so this
    // stays cheap despite firing on every frame from either list.
    setBar((current) => catalogBarState({ offsetY, current }));
  }, []);

  const rawOutboxIssue = pickIntakeOutboxPhotoIssue(actions.outbox.photos, companyId);
  const outboxIssue = rawOutboxIssue ? humanizeIntakeOutboxError(rawOutboxIssue) : null;
  const outboxNeedsDeploy = isIntakeOutboxDeployIssue(outboxIssue);

  if (!canOpen) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Engines"
        description="Your role cannot browse engines or receive them."
      />
    );
  }

  const loading = catalogLoading || (canSeeIntake && intake.loading && catalog.incomingTotal === 0);
  const filtering = Boolean(deferredQuery) || (lane !== 'incoming' && quality !== 'all');
  const { unplacedCount } = catalog;

  const subtitle = loading
    ? 'Loading…'
    : lane === 'incoming'
      ? `${plural(catalog.incomingCount, 'engine', 'engines')} incoming`
      : filtering
        ? `${plural(unitCount, 'match', 'matches')}`
        : unplacedCount > 0
          ? `${plural(unitCount, 'engine', 'engines')} · ${unplacedCount.toLocaleString('en-US')} without a shelf`
          : `${plural(unitCount, 'engine', 'engines')}`;

  const showLaneControl = canViewCatalog && canSeeIntake;
  const showQuality = lane !== 'incoming' && canViewCatalog;

  /**
   * What the bar says once the large title has gone under it.
   *
   * "Engines" alone would leave someone looking at a list of rows with no way
   * to tell whether they are in Incoming, the yard, or a search result — the
   * three look alike at a glance, and the controls that would have said so
   * have scrolled away by then.
   */
  const laneLabel = lane === 'incoming' ? 'Incoming' : lane === 'yard' ? 'Yard' : 'All';
  const barTitle = deferredQuery
    ? `“${deferredQuery}” · ${unitCount}`
    : showLaneControl
      ? `Engines · ${laneLabel}`
      : 'Engines';

  const header: EngineListHeader = {
    title: 'Engines',
    subtitle,
    query,
    onQueryChange: setQuery,
    searchPlaceholder: 'Serial, brand, code, or shelf',
    lanes: showLaneControl ? ENGINE_LANE_SEGMENTS : null,
    lane,
    onLaneChange: (next) => setFilter(next as EngineListFilter),
    qualities: showQuality ? ENGINE_QUALITY_FILTER_SEGMENTS : null,
    quality,
    onQualityChange: (next) => setQuality(next as EngineQualityFilterValue),
    topInset: navBarHeight,
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        {/* The list is full-bleed and its frame never changes: the bar floats
            over it, and the title, search and filters ride inside it as rows.
            That is how iOS builds a catalog, and it is why nothing above the
            rows can re-lay them out mid-scroll. */}
        {loading ? (
          <View style={{ flex: 1 }}>
            <EnginesHeaderBlock header={header} />
            <ContentState state="loading">{null}</ContentState>
          </View>
        ) : (
          <EnginesList
            rows={rows}
            header={header}
            emptyMessage={
              rows.length === 0
                ? filtering
                  ? {
                      title: 'No engines match',
                      hint: 'Try the serial, the engine code, the shelf, or another grade.',
                    }
                  : lane === 'incoming'
                    ? {
                        title: 'Nothing incoming',
                        hint: canPhotograph
                          ? 'Add an engine, then photograph the block.'
                          : 'Engines being photographed show up here.',
                      }
                    : {
                        title: 'No engines yet',
                        hint: canAdd
                          ? 'Add the first one — serial, then photograph or save.'
                          : 'Serialized motors show up here once they are received.',
                      }
                : null
            }
            onUnitPress={handleUnitPress}
            actions={catalogActions}
            incomingActions={incomingActions}
            uploadProgressByJobId={photoUploadProgress}
            previewUriByJobId={previewUriByJobId}
            onScrollOffset={onScrollOffset}
            bottomInset={scrollBottom}
          />
        )}

        <CatalogNavBar
          title={barTitle}
          material={bar.material}
          inlineTitle={bar.inlineTitle}
          onBack={() => goBackOrReplace(router, '/(tabs)/work' as Href)}
          action={
            canAdd ? (
              <CatalogAddButton accessibilityLabel="Add an engine" onPress={addEngine} />
            ) : null
          }
        />

        {/* Pinned under the bar rather than in flow: the list is full-bleed
            now, and a photo that failed to reach the office has to stay
            visible however far down the yard someone has scrolled. It draws
            nothing at all unless there is something to say. */}
        {canSeeIntake ? (
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', top: navBarHeight, left: 0, right: 0 }}
          >
            <IntakeOutboxBanner
              photoPendingCount={actions.outbox.photoPendingCount}
              photoFailedCount={actions.outbox.photoFailedCount}
              syncing={actions.outbox.syncing}
              issue={outboxIssue}
              needsDeploy={outboxNeedsDeploy}
              onPress={actions.retryOutbox}
            />
          </View>
        ) : null}
      </Screen>

      <EngineLocationSheet
        ref={locationSheetRef}
        warehouseId={warehouseId}
        currentLocationCode={
          relocateMotor?.primaryLocationCode ?? relocateMotor?.warehouseLocation ?? null
        }
        busyLocationId={assignLocation.isPending ? 'pending' : null}
        onSelect={(location) => void relocate(location)}
        onDismiss={() => {
          relocateMotorRef.current = null;
          setRelocateMotor(null);
        }}
      />

      <OrderPickerSheet
        ref={addToOrderFlow.pickerRef}
        drafts={addToOrderFlow.drafts}
        onSelectNew={addToOrderFlow.handleSelectNew}
        onSelectOrder={addToOrderFlow.handleSelectOrder}
        onDismiss={addToOrderFlow.handlePickerDismiss}
      />

      {companyId && uid ? (
        <SellMotorSheet
          ref={sellSheetRef}
          companyId={companyId}
          uid={uid}
          userId={uid}
          onSold={(sold) =>
            toast({ title: 'Engine sold', description: sold.serialCode, variant: 'success' })
          }
        />
      ) : null}

      <IntakeCreateSerialSheet
        ref={actions.createSheetRef}
        loading={false}
        onSubmit={(identity, meta) => {
          if (meta.mode === 'edit') actions.saveIdentityEdit(meta.jobId, identity);
        }}
      />
      <IntakeAcceptSheet
        ref={actions.acceptSheetRef}
        loading={false}
        photoUrls={actions.reviewPhotoUrls}
        onOpenPhoto={(index) => {
          if (actions.reviewPhotoUrls.length === 0) return;
          actions.setPhotoViewer({ urls: actions.reviewPhotoUrls, index });
        }}
        onDismiss={actions.releaseAcceptLock}
        onSubmit={actions.submitAccept}
      />
      {actions.photoViewer ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 120 }}>
          <EnginePhotoViewer
            urls={actions.photoViewer.urls}
            serial={
              actions.reviewJob?.expectedIdentity.serialCode ||
              actions.reviewJob?.expectedIdentity.engineCode ||
              'Engine'
            }
            initialIndex={actions.photoViewer.index}
            onClose={() => actions.setPhotoViewer(null)}
          />
        </View>
      ) : null}
    </View>
  );
}
