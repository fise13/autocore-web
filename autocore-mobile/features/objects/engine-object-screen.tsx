import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { Badge, Button, EmptyState, Screen, ScreenScroll, Text, toast } from '@/components/ui';
import { CarIcon } from '@/assets/icons';
import { EngineDocumentationCard, EngineFactStrip, EngineNoteCard, EngineSectionLabel } from '@/features/engines/components/engine-detail-blocks';
import { EngineHero } from '@/features/engines/components/engine-hero';
import { EnginePhotoStrip } from '@/features/engines/components/engine-photo-strip';
import { EngineLocationSheet } from '@/features/engines/components/engine-location-sheet';
import { EnginePhotoViewer } from '@/features/engines/components/engine-photo-viewer';
import { SellMotorSheet, type SellMotorSheetRef } from '@/features/search/components/sell-motor-sheet';
import { documentationLine, engineFacts } from '@/features/engines/lib/engine-facts';
import { engineStatusLabel, engineStatusTone } from '@/features/engines/lib/engine-variants';
import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import { useMobileAssignAssetLocation } from '@/hooks/use-mobile-relocate';
import { useSession } from '@/hooks/use-session';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useTheme } from '@/hooks/use-theme';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import { rhythm, spacing } from '@/theme';
import type { MobileWarehouseLocation } from '@/hooks/use-mobile-relocate';
import type { MotorEntity } from '@/types/motor';
import type { WarehouseEntity } from '@/types/warehouse';

const STATUS_VARIANT = {
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  progress: 'default',
  muted: 'secondary',
} as const;

function engineTitle(motor: MotorEntity): string {
  return (
    [motor.brandName, motor.engineCode || motor.configuration].filter(Boolean).join(' ') || 'Engine'
  );
}

/**
 * Canonical Engine object — opened from Search, Work, Engines, AI, Intake.
 *
 * Photo-led: the block itself is the headline, then identity, then three facts
 * side by side, then what you can do with it. The previous version was five
 * stacked sections of `label → one muted line`, which read as a database dump
 * and buried the photos halfway down.
 */
export function EngineObjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId, uid, can } = useSession();
  const router = useRouter();
  const { colors } = useTheme();
  const addToOrderFlow = useAddToOrderFlow();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const sellSheetRef = useRef<SellMotorSheetRef>(null);
  const locationSheetRef = useRef<BottomSheetModal>(null);
  const assignLocation = useMobileAssignAssetLocation();

  const motors = useSessionQueryData<MotorEntity[]>(
    ['realtime', 'motors', companyId, uid],
    Boolean(companyId && uid),
    [],
  );
  const motor = useMemo(() => motors.find((m) => m.id === id), [id, motors]);

  const photos = useMemo(
    () => (motor?.photoUrls ?? []).filter((url) => url.trim().length > 0),
    [motor?.photoUrls],
  );

  // Only subscribe when this engine actually came through intake.
  const intakeJobId = motor?.intakeJobId ?? null;
  const canSeeIntake = can('engine_intake_view');
  const intake = useEngineIntakeJobs(intakeJobId && canSeeIntake ? companyId : null);
  const docLine = useMemo(() => {
    if (!intakeJobId) return null;
    const job = intake.jobs.find((entry) => entry.id === intakeJobId);
    return documentationLine(job?.documentationChecklist?.summary);
  }, [intake.jobs, intakeJobId]);

  const warehouses = useSessionQueryData<WarehouseEntity[]>(
    ['realtime', 'warehouses', companyId],
    Boolean(companyId),
    [],
  );
  const warehouseId = useMemo(() => {
    const preferred = warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0];
    return preferred?.id ?? null;
  }, [warehouses]);

  const relocate = useCallback(
    async (location: MobileWarehouseLocation) => {
      if (!id) return;
      try {
        await assignLocation.mutateAsync({
          entityType: 'motor',
          entityId: id,
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
    [assignLocation, id, warehouseId],
  );

  const facts = useMemo(() => (motor ? engineFacts(motor) : []), [motor]);
  const closeViewer = useCallback(() => setViewerIndex(null), []);
  const goBack = useCallback(
    () => goBackOrReplace(router, '/objects/engines' as Href),
    [router],
  );

  if (!motor) {
    return (
      <Screen>
        <ScreenScroll tabBarInset>
          <EmptyState
            icon={CarIcon}
            title="Engine not found"
            description="This engine is not in the current company cache. Try Search."
            primaryAction={{ label: 'Open search', onPress: () => router.push('/search' as Href) }}
            secondaryAction={{ label: 'Back', onPress: goBack }}
          />
        </ScreenScroll>
      </Screen>
    );
  }

  const serial = motor.serialCode?.trim() || motor.id;
  const title = engineTitle(motor);
  const notes = motor.notes?.trim();
  const sold = Boolean(motor.soldDate) || motor.status === 'sold';
  const canAddToOrder = can('work_orders_edit') && !sold;
  const canSell = can('accounting_edit') && !sold && motor.status !== 'installed';
  const canRelocate = can('inventory_edit') && !sold;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <ScreenScroll tabBarInset topFade={false} contentStyle={{ paddingBottom: spacing[8] }}>
          <EngineHero urls={photos} onBack={goBack} onOpenPhoto={setViewerIndex} />

          <View
            style={{
              paddingHorizontal: rhythm.pad,
              paddingTop: spacing[4],
              paddingBottom: spacing[5],
              gap: spacing[2],
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing[3],
              }}
            >
              <Text variant="title1" style={{ flex: 1, color: colors.foreground }}>
                {title}
              </Text>
              <Badge variant={STATUS_VARIANT[engineStatusTone(motor)]} emphasis="subtle">
                {engineStatusLabel(motor)}
              </Badge>
            </View>
            <Text variant="identifier" color="muted">
              {serial}
            </Text>
          </View>

          <EngineFactStrip facts={facts} />

          <View
            style={{
              paddingHorizontal: rhythm.pad,
              paddingTop: spacing[5],
              gap: spacing[2],
            }}
          >
            {canSell ? (
              <Button native={false} onPress={() => sellSheetRef.current?.present(motor)}>
                Sell engine
              </Button>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {canAddToOrder ? (
                <View style={{ flex: 1 }}>
                  <Button
                    native={false}
                    variant={canSell ? 'outline' : 'default'}
                    onPress={() => addToOrderFlow.addMotorToOrder(motor.id)}
                  >
                    Add to order
                  </Button>
                </View>
              ) : null}
              {canRelocate ? (
                <View style={{ flex: 1 }}>
                  <Button
                    native={false}
                    variant="outline"
                    loading={assignLocation.isPending}
                    onPress={() => locationSheetRef.current?.present()}
                  >
                    Relocate
                  </Button>
                </View>
              ) : null}
            </View>
          </View>

          {docLine ? (
            <View style={{ paddingTop: spacing[6] }}>
              <EngineSectionLabel>Documentation</EngineSectionLabel>
              <EngineDocumentationCard
                line={docLine}
                onPress={
                  can('engine_intake_view') ? () => router.push('/intake' as Href) : undefined
                }
              />
            </View>
          ) : null}

          {photos.length > 1 ? (
            <View style={{ paddingTop: spacing[6] }}>
              <EngineSectionLabel>All photos</EngineSectionLabel>
              <View style={{ paddingHorizontal: rhythm.pad }}>
                <EnginePhotoStrip urls={photos} serial={serial} onOpen={setViewerIndex} />
              </View>
            </View>
          ) : null}

          {notes ? (
            <View style={{ paddingTop: spacing[6] }}>
              <EngineSectionLabel>Condition notes</EngineSectionLabel>
              <EngineNoteCard>
                <Text variant="callout" style={{ color: colors.foreground }}>
                  {notes}
                </Text>
              </EngineNoteCard>
            </View>
          ) : null}
        </ScreenScroll>
      </Screen>

      <SellMotorSheet
        ref={sellSheetRef}
        companyId={companyId}
        uid={uid ?? ''}
        userId={uid ?? ''}
        onSold={(sold) =>
          toast({ title: 'Engine sold', description: sold.serialCode, variant: 'success' })
        }
      />

      <EngineLocationSheet
        ref={locationSheetRef}
        warehouseId={warehouseId}
        currentLocationCode={motor.primaryLocationCode ?? motor.warehouseLocation ?? null}
        busyLocationId={assignLocation.isPending ? 'pending' : null}
        onSelect={(location) => void relocate(location)}
      />

      <OrderPickerSheet
        ref={addToOrderFlow.pickerRef}
        drafts={addToOrderFlow.drafts}
        onSelectNew={addToOrderFlow.handleSelectNew}
        onSelectOrder={addToOrderFlow.handleSelectOrder}
        onDismiss={addToOrderFlow.handlePickerDismiss}
      />

      {viewerIndex != null && photos.length > 0 ? (
        <EnginePhotoViewer
          urls={photos}
          serial={serial}
          initialIndex={viewerIndex}
          onClose={closeViewer}
        />
      ) : null}
    </View>
  );
}
