import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { EmptyState, Screen, ScreenScroll, StickyActionBar, toast } from '@/components/ui';
import type { NativeContextMenuAction } from '@/components/ui/native-context-menu';
import { CarIcon } from '@/assets/icons';
import {
  EngineActionCluster,
  EngineChapter,
  EngineDocumentationRow,
  EngineIdentity,
  EngineNoteBody,
  EngineSpecList,
} from '@/features/engines/components/engine-detail-blocks';
import { EngineHero } from '@/features/engines/components/engine-hero';
import { EngineLocationSheet } from '@/features/engines/components/engine-location-sheet';
import { EnginePhotoViewer } from '@/features/engines/components/engine-photo-viewer';
import { SellMotorSheet, type SellMotorSheetRef } from '@/features/search/components/sell-motor-sheet';
import { documentationLine, engineSpecRows } from '@/features/engines/lib/engine-facts';
import { openEnginesList } from '@/features/engines/navigation';
import { shareEnginePhoto } from '@/features/engines/lib/engine-photo-file';
import { engineUnitLabel, engineVariantTitle } from '@/features/engines/lib/engine-variants';
import { eng } from '@/features/engines/layout';
import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import { useMobileAssignAssetLocation } from '@/hooks/use-mobile-relocate';
import { useSession } from '@/hooks/use-session';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import { haptics, spacing } from '@/theme';
import type { MobileWarehouseLocation } from '@/hooks/use-mobile-relocate';
import type { MotorEntity } from '@/types/motor';
import type { WarehouseEntity } from '@/types/warehouse';

/**
 * Canonical Engine object — opened from Search, Work, Engines, AI, Intake.
 *
 * One document, read top to bottom: the photo is the field, the motor and its
 * serial are the identity, and everything below is a packing slip on hairline
 * frames. The verbs live in a docked bar so Sell stays reachable no matter how
 * far down the intake notes run.
 */
export function EngineObjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId, uid, can } = useSession();
  const router = useRouter();
  const addToOrderFlow = useAddToOrderFlow();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
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

  const specs = useMemo(() => (motor ? engineSpecRows(motor) : []), [motor]);
  const closeViewer = useCallback(() => setViewerIndex(null), []);
  const goBack = useCallback(
    () => goBackOrReplace(router, '/objects/engines' as Href),
    [router],
  );

  const serial = motor ? engineUnitLabel(motor) : '';

  /** Utilities for the unit and the photo on screen — the system sheet, not a menu we drew. */
  const heroActions = useMemo<NativeContextMenuAction[]>(() => {
    const actions: NativeContextMenuAction[] = [
      { id: 'copy-serial', title: 'Copy Serial', systemImage: 'doc.on.doc' },
    ];
    if (photos.length > 0) {
      actions.push({ id: 'share-photo', title: 'Share Photo', systemImage: 'square.and.arrow.up' });
      actions.push({ id: 'copy-link', title: 'Copy Photo Link', systemImage: 'link' });
    }
    return actions;
  }, [photos.length]);

  const onHeroAction = useCallback(
    (action: string) => {
      const url = photos[Math.min(heroIndex, photos.length - 1)];
      void (async () => {
        if (action === 'copy-serial') {
          await Clipboard.setStringAsync(serial);
          haptics.success();
          toast({ title: `${serial} copied`, variant: 'success' });
          return;
        }
        if (!url) return;
        if (action === 'copy-link') {
          await Clipboard.setStringAsync(url);
          toast({ title: 'Photo link copied', variant: 'success' });
          return;
        }
        try {
          await shareEnginePhoto(url, serial, heroIndex);
          haptics.success();
        } catch (error) {
          haptics.error();
          toast({
            title: 'Could not share the photo',
            description: error instanceof Error ? error.message : undefined,
            variant: 'destructive',
          });
        }
      })();
    },
    [heroIndex, photos, serial],
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

  // `documentationLine` reports the danger tone only when the intake checklist
  // is missing a shot the sale gate requires.
  const canOpenIntake = can('engine_intake_view');
  const sellGate =
    docLine?.tone === 'danger'
      ? {
          label: `Sell — ${docLine.detail.replace(/ blocks? sale$/, '')} needed`,
          hint: canOpenIntake ? 'Tap to finish documentation' : 'Documentation is incomplete',
          onPress: canOpenIntake
            ? () => openEnginesList(router, { filter: 'incoming' })
            : undefined,
        }
      : null;

  const title = engineVariantTitle(motor);
  const notes = motor.notes?.trim();
  const sold = Boolean(motor.soldDate) || motor.status === 'sold';
  const canAddToOrder = can('work_orders_edit') && !sold;
  const canSell = can('accounting_edit') && !sold && motor.status !== 'installed';
  const canRelocate = can('inventory_edit') && !sold;

  return (
    <View style={{ flex: 1 }}>
      {/* No floating dock on this route — `Screen`'s default floor vignette
          would only lay a black gradient over the action bar. */}
      <Screen brandWash={false}>
        <EngineHero
          urls={photos}
          onBack={goBack}
          onOpenPhoto={setViewerIndex}
          onIndexChange={setHeroIndex}
          actions={heroActions}
          onAction={onHeroAction}
        />

        <ScreenScroll topFade={false} contentStyle={{ paddingBottom: spacing[8] }}>
          <View
            style={{
              paddingHorizontal: eng.pad,
              paddingTop: photos.length > 0 ? eng.block : eng.stack + 4,
              gap: eng.section,
            }}
          >
            <EngineIdentity motor={motor} serial={serial} title={title} />

            <EngineChapter title="Details">
              <EngineSpecList rows={specs} />
            </EngineChapter>

            {notes ? (
              <EngineChapter title="Condition">
                <EngineNoteBody>{notes}</EngineNoteBody>
              </EngineChapter>
            ) : null}

            {docLine ? (
              <EngineChapter title="Documentation">
                <EngineDocumentationRow
                  line={docLine}
                  onPress={
                    canOpenIntake ? () => openEnginesList(router, { filter: 'incoming' }) : undefined
                  }
                />
              </EngineChapter>
            ) : null}
          </View>
        </ScreenScroll>

        <StickyActionBar>
          <View style={{ flex: 1 }}>
            <EngineActionCluster
              canSell={canSell}
              canAddToOrder={canAddToOrder}
              canRelocate={canRelocate}
              relocating={assignLocation.isPending}
              sellGate={sellGate}
              onSell={() => sellSheetRef.current?.present(motor)}
              onAddToOrder={() => addToOrderFlow.addMotorToOrder(motor.id)}
              onRelocate={() => locationSheetRef.current?.present()}
            />
          </View>
        </StickyActionBar>
      </Screen>

      <SellMotorSheet
        ref={sellSheetRef}
        companyId={companyId}
        uid={uid ?? ''}
        userId={uid ?? ''}
        onSold={(soldMotor) =>
          toast({ title: 'Engine sold', description: soldMotor.serialCode, variant: 'success' })
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
