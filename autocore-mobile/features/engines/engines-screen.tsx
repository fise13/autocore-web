import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter, type Href } from 'expo-router';

import { CarIcon } from '@/assets/icons';
import {
  CatalogScreenHeader,
  ContentState,
  FlashList,
  Screen,
  ScreenGate,
  catalogRowPosition,
  toast,
  type CatalogRowPosition,
} from '@/components/ui';
import { useFloatingTabBarInset, useMobileAssignAssetLocation, useSession } from '@/hooks';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import type { MobileWarehouseLocation } from '@/hooks/use-mobile-relocate';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import { isRealtimeReady } from '@/lib/realtime/subscription-registry';
import { rhythm } from '@/theme';
import type { MotorEntity } from '@/types/motor';
import type { WarehouseEntity } from '@/types/warehouse';

import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import { SellMotorSheet, type SellMotorSheetRef } from '@/features/search/components/sell-motor-sheet';

import {
  EngineCatalogRow,
  type EngineCatalogActions,
} from './components/engine-catalog-row';
import { EngineCatalogSkeleton } from './components/engine-catalog-skeleton';
import { EngineLocationSheet } from './components/engine-location-sheet';
import {
  EngineQualityFilterBar,
  type EngineQualityFilterValue,
} from './components/engine-quality-filter-bar';
import { EngineAddControl } from './components/engine-surface';
import { EngineYardHeading } from './components/engine-yard-heading';
import { EngineYardSearch } from './components/engine-yard-search';
import { EnginesLiftProvider } from './components/engines-lift-provider';
import { eng } from './layout';
import { engineMatchesQualityFilter } from './lib/engine-quality';
import {
  engineMatchesQuery,
  engineUnitLocation,
  groupEnginesByVariant,
  type EngineVariant,
} from './lib/engine-variants';
import { newEngineHref } from './navigation';

type EngineRow =
  | { type: 'header'; key: string; variant: EngineVariant }
  | {
      type: 'unit';
      key: string;
      motor: MotorEntity;
      position: CatalogRowPosition;
    };

function flattenVariants(variants: EngineVariant[]): EngineRow[] {
  const rows: EngineRow[] = [];
  variants.forEach((variant) => {
    rows.push({ type: 'header', key: `h:${variant.id}`, variant });
    variant.units.forEach((motor, index) => {
      rows.push({
        type: 'unit',
        key: `u:${variant.id}:${motor.id}`,
        motor,
        position: catalogRowPosition(index, variant.units.length),
      });
    });
  });
  return rows;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Engines — the yard, filed by motor.
 *
 * The chrome is a navigation bar: back, the one verb this screen owns, a large
 * title that condenses as the catalog scrolls, and a search field plus quality
 * tabs that never move. Quality is a document picker rather than a row of
 * chips, because a unit has exactly one grade. Long-press is hosted here, not
 * in FlashList — same lift menu as work orders.
 */
export function EnginesScreen() {
  return (
    <EnginesLiftProvider>
      <EnginesScreenBody />
    </EnginesLiftProvider>
  );
}

function EnginesScreenBody() {
  const router = useRouter();
  const { scrollBottom } = useFloatingTabBarInset();
  const { companyId, uid } = useSession();
  const rbac = useRbacPolicy();
  const motorsEnabled = useCompanyModuleEnabled('motors');
  const [query, setQuery] = useState('');
  const [quality, setQuality] = useState<EngineQualityFilterValue>('all');
  const [scrolled, setScrolled] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());

  const canView = motorsEnabled && rbac.can('inventory_view') && rbac.scopes.motors !== 'none';
  const canEdit = motorsEnabled && rbac.can('inventory_edit');

  const motorsKey = useMemo(
    () => ['realtime', 'motors', companyId, uid] as const,
    [companyId, uid],
  );
  const motors = useSessionQueryData<MotorEntity[]>(
    motorsKey,
    Boolean(companyId && uid) && canView,
    [],
  );
  const loading = canView && motors.length === 0 && !isRealtimeReady(motorsKey);

  const { rows, unitCount, typeCount, unplacedCount } = useMemo(() => {
    const matched = motors.filter((motor) => {
      if (!engineMatchesQualityFilter(motor, quality)) return false;
      if (!deferredQuery) return true;
      return engineMatchesQuery(motor, deferredQuery);
    });
    const grouped = groupEnginesByVariant(matched);
    return {
      rows: flattenVariants(grouped),
      unitCount: matched.length,
      typeCount: grouped.length,
      unplacedCount: matched.filter((motor) => !engineUnitLocation(motor)).length,
    };
  }, [deferredQuery, motors, quality]);

  const openEngine = useCallback((motorId: string) => {
    router.push(`/objects/engine/${motorId}` as Href);
  }, [router]);

  const addEngine = useCallback(() => {
    router.push(newEngineHref(deferredQuery ? { serial: deferredQuery } : undefined));
  }, [deferredQuery, router]);

  const addToOrderFlow = useAddToOrderFlow();
  const sellSheetRef = useRef<SellMotorSheetRef>(null);
  const locationSheetRef = useRef<BottomSheetModal>(null);
  const relocateMotorRef = useRef<MotorEntity | null>(null);
  const [relocateMotor, setRelocateMotor] = useState<MotorEntity | null>(null);
  const assignLocation = useMobileAssignAssetLocation();

  const warehouses = useSessionQueryData<WarehouseEntity[]>(
    ['realtime', 'warehouses', companyId],
    Boolean(companyId) && canView,
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

  // Hysteresis: the title condenses a little after the list starts moving and
  // only expands again near the top, so a nudge never flickers the chrome.
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrolled((current) => (current ? offsetY > 6 : offsetY > 18));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: EngineRow }) => {
      if (item.type === 'header') {
        return <EngineYardHeading variant={item.variant} />;
      }
      return (
        <EngineCatalogRow
          motor={item.motor}
          position={item.position}
          onPress={openEngine}
          actions={catalogActions}
        />
      );
    },
    [catalogActions, openEngine],
  );

  if (!canView) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Engines"
        description="Your role cannot browse the serialized engine catalog."
      />
    );
  }

  const filtering = Boolean(deferredQuery) || quality !== 'all';

  const subtitle = loading
    ? 'Loading yard…'
    : filtering
      ? `${plural(unitCount, 'match', 'matches')} · ${plural(typeCount, 'motor', 'motors')}`
      : unplacedCount > 0
        ? `${plural(unitCount, 'engine', 'engines')} · ${unplacedCount} without a shelf`
        : `${plural(unitCount, 'engine', 'engines')} · ${plural(typeCount, 'motor', 'motors')}`;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <CatalogScreenHeader
          title="Engines"
          subtitle={subtitle}
          collapsed={scrolled && rows.length > 0}
          onBack={() => goBackOrReplace(router, '/(tabs)/work' as Href)}
          action={
            canEdit ? (
              <EngineAddControl accessibilityLabel="Add an engine" onPress={addEngine} />
            ) : null
          }
          search={
            <View style={{ gap: eng.stack }}>
              <EngineYardSearch value={query} onChangeText={setQuery} />
              <EngineQualityFilterBar value={quality} onChange={setQuality} />
            </View>
          }
        />

        {loading ? (
          <EngineCatalogSkeleton />
        ) : rows.length === 0 ? (
          <ContentState
            state="empty"
            emptyIcon={CarIcon}
            emptyTitle={filtering ? 'Nothing in the yard matches' : 'No engines yet'}
            emptyDescription={
              filtering
                ? 'Try a serial, a motor code, a shelf, or another grade.'
                : canEdit
                  ? 'Add the first unit — serial, motor, quality, shelf.'
                  : 'Serialized motors show up here once they are received.'
            }
            onEmptyAction={canEdit ? addEngine : undefined}
            emptyActionLabel={deferredQuery ? `Add ${deferredQuery}` : 'Add an engine'}
          >
            {null}
          </ContentState>
        ) : (
          <FlashList
            data={rows}
            keyExtractor={(row) => row.key}
            getItemType={(row) => row.type}
            renderItem={renderItem}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingBottom: scrollBottom + rhythm.tabBarBreathing,
            }}
          />
        )}
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
    </View>
  );
}
