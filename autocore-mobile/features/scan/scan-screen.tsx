import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, LayoutChangeEvent, Linking, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useIsFocused, useRouter, type Href } from 'expo-router';

import { Text, toast } from '@/components/ui';
import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import {
  useFloatingTabBarInset,
  useModalBottomSheet,
  useSession,
  useTheme,
} from '@/hooks';
import { tabNavigationGuard, scanNavigationGuard } from '@/lib/navigation/navigation-guard';
import { loadRecentScans } from '@/lib/scan/recent-scans';
import { haptics, rhythm } from '@/theme';

import { ScanCamera, type ScanCameraHandle } from './components/scan-camera';
import { ScanCandidatesSheet } from './components/scan-candidates-sheet';
import { ScanCodePickerSheet } from './components/scan-code-picker-sheet';
import { ScanConfirmFlash } from './components/scan-confirm-flash';
import { ScanDetectionOverlay } from './components/scan-detection-overlay';
import { ScanDocumentSheet } from './components/scan-document-sheet';
import { ScanGlassPanel } from './components/scan-glass-panel';
import { ScanHeader } from './components/scan-header';
import { ScanIdleIndicator } from './components/scan-idle-indicator';
import { ScanMoveSheet, type ScanMoveTarget } from './components/scan-move-sheet';
import { ScanNotFoundSheet } from './components/scan-not-found-sheet';
import { ScanOrderContextBanner } from './components/scan-order-context-banner';
import { ScanProductSheet } from './components/scan-product-sheet';
import { ScanRelocateBanner } from './components/scan-relocate-banner';
import { useScanExperience } from './hooks/use-scan-experience';
import { relocatePendingStore } from './lib/relocate-pending-store';
import type { RecentScan, ScanCandidate } from './types';
import { scanContextStore } from '@/services/scan';

type ScanScreenProps = {
  onClose?: () => void;
};

export function ScanScreen({ onClose }: ScanScreenProps = {}) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const sheet = useModalBottomSheet();
  const { footerBottom } = useFloatingTabBarInset();
  const { can } = useSession();

  const cameraRef = useRef<ScanCameraHandle>(null);
  const recentSheetRef = useRef<BottomSheetModal>(null);

  const [torchOn, setTorchOn] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [moveTarget, setMoveTarget] = useState<ScanMoveTarget | null>(null);
  const [relocatePending, setRelocatePending] = useState(() => relocatePendingStore.get());

  const experience = useScanExperience();
  const {
    snapshot,
    parsedDocument,
    isAiLoading,
    showConfirmFlash,
    scanEnabled,
    ocrBusy,
    cameraLayout,
    setCameraLayout,
    onDetection,
    onDetections,
    onSheetClosed,
    dismissSheet,
    dismissAllSheets,
    handlePickCandidate,
    handlePickDetectedCode,
    handleTryAi,
    handleCreateItem,
    handleAddAsSpecific,
    handleOpenUrl,
    handleCancelNotFound,
    navigateToSearch,
    addToOrderFlow,
    productSheetRef,
    candidatesSheetRef,
    notFoundSheetRef,
    documentSheetRef,
    codePickerSheetRef,
    moveSheetRef,
    service,
    setOcrBusy,
  } = experience;

  useEffect(() => {
    return relocatePendingStore.subscribe((value) => {
      setRelocatePending(value);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      tabNavigationGuard.release();
      scanNavigationGuard.release();
      service.resume();

      return () => {
        // Portal backdrops sit above the whole app — leave them open and every tab dies.
        dismissAllSheets();
        recentSheetRef.current?.dismiss();
        addToOrderFlow.pickerRef.current?.dismiss();
        setMoveTarget(null);
        setTorchOn(false);
      };
    }, [addToOrderFlow.pickerRef, dismissAllSheets, service]),
  );

  const activeResult = snapshot.activeResult;
  const isOrderContext = snapshot.context.mode === 'order';
  const orderLabel = snapshot.context.mode === 'order' ? snapshot.context.orderLabel : undefined;
  const canMove = can('inventory_edit') && !isOrderContext;

  const openMoveFlow = useCallback(() => {
    if (!activeResult || activeResult.id === 'candidates') return;
    const warehouseId = activeResult.stockLevels?.[0]?.warehouseId;
    if (!warehouseId) {
      toast({
        title: 'Нет склада',
        description: 'У позиции нет остатка на складе — сначала оприходуйте.',
        variant: 'warning',
      });
      return;
    }
    const target: ScanMoveTarget = {
      itemId: activeResult.id,
      itemTitle: activeResult.title,
      warehouseId,
      shelf: activeResult.shelf,
    };
    setMoveTarget(target);
    dismissSheet(productSheetRef, () => {
      moveSheetRef.current?.present();
    });
  }, [activeResult, dismissSheet, moveSheetRef, productSheetRef]);

  const cancelRelocate = useCallback(() => {
    relocatePendingStore.clear();
    setMoveTarget(null);
    moveSheetRef.current?.dismiss();
  }, [moveSheetRef]);

  const handleClose = useCallback(() => {
    if (isOrderContext) {
      scanContextStore.cancel();
    }
    onClose?.();
  }, [isOrderContext, onClose]);

  const onCameraLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setCameraLayout({ width, height });
    },
    [setCameraLayout],
  );

  const refreshRecentScans = useCallback(async () => {
    const items = await loadRecentScans();
    setRecentScans(items);
  }, []);

  useEffect(() => {
    void refreshRecentScans();
  }, [refreshRecentScans]);

  const runOcrOnUri = useCallback(
    async (uri: string, preferDocument: boolean) => {
      setOcrBusy(true);
      service.pause();
      try {
        const outcome = await service.resolvePhoto(uri, preferDocument);
        if (outcome === 'retry') {
          toast({
            title: 'Ничего не распознано',
            description: 'Попробуйте снять чётче.',
            variant: 'warning',
          });
        }
      } catch (error) {
        toast({
          title: 'Ошибка распознавания',
          description: error instanceof Error ? error.message : 'Не удалось распознать фото',
          variant: 'destructive',
        });
        onSheetClosed();
      } finally {
        setOcrBusy(false);
      }
    },
    [onSheetClosed, service, setOcrBusy],
  );

  const handleOpenPhotos = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({
        title: 'Нет доступа к фото',
        description: 'Разрешите доступ к галерее в настройках.',
        variant: 'warning',
      });
      void Linking.openSettings();
      return;
    }
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (pick.canceled || !pick.assets[0]?.uri) return;
    await runOcrOnUri(pick.assets[0].uri, false);
  }, [runOcrOnUri]);

  const replayPayload = useCallback(
    (payload: string) => {
      recentSheetRef.current?.dismiss();
      setTimeout(() => void service.commitPayload(payload, 'camera'), 220);
    },
    [service],
  );

  const handleDocumentPrimary = useCallback(() => {
    if (!parsedDocument) return;
    const doc = parsedDocument;
    dismissSheet(documentSheetRef, () => {
      if (doc.kind === 'work-order' || doc.vin) {
        const vin = doc.vin;
        router.push(
          vin
            ? (`/(tabs)/orders/new?vin=${encodeURIComponent(vin)}` as const)
            : ('/(tabs)/orders/new' as const),
        );
        return;
      }
      if (doc.kind === 'receipt') {
        router.navigate('/(tabs)/accounting' as const);
        return;
      }
      const query = doc.lines[0]?.name ?? doc.number ?? doc.merchant;
      const q = query?.trim();
      router.navigate((q ? `/(tabs)/search?q=${encodeURIComponent(q)}` : '/(tabs)/search') as Href);
    });
  }, [dismissSheet, parsedDocument, router]);

  const overlayLayout = useMemo(() => {
    if (cameraLayout.width > 0 && cameraLayout.height > 0) return cameraLayout;
    const { width, height } = Dimensions.get('window');
    return { width, height };
  }, [cameraLayout.height, cameraLayout.width]);

  return (
      <View style={styles.root}>
        <View style={styles.viewport} onLayout={onCameraLayout}>
          <ScanCamera
            ref={cameraRef}
            torch={torchOn && isFocused}
            active={isFocused && !ocrBusy}
            scanEnabled={isFocused && scanEnabled && !ocrBusy}
            onDetection={onDetection}
            onDetections={onDetections}
          />
          <ScanIdleIndicator phase={snapshot.phase} />
          <ScanDetectionOverlay
            detection={snapshot.detection}
            phase={snapshot.phase}
            layout={overlayLayout}
          />
          <ScanConfirmFlash visible={showConfirmFlash} />
          {ocrBusy ? (
            <View style={styles.ocrOverlay} pointerEvents="none">
              <ActivityIndicator color="#fff" />
              <Text variant="caption" style={styles.ocrLabel}>
                Распознаём…
              </Text>
            </View>
          ) : null}

          <ScanHeader
            torchOn={torchOn}
            onToggleTorch={() => setTorchOn((value) => !value)}
            onSettingsPress={() => router.navigate('/(tabs)/profile' as const)}
            orderContext={isOrderContext}
            orderLabel={orderLabel}
            onBackPress={isOrderContext ? handleClose : undefined}
          />

          {isOrderContext ? <ScanOrderContextBanner orderLabel={orderLabel} /> : null}
          {relocatePending && !isOrderContext ? (
            <ScanRelocateBanner
              title={
                relocatePending.kind === 'fill-location'
                  ? 'Сканируйте двигатель'
                  : 'Сканируйте место'
              }
              subtitle={
                relocatePending.kind === 'fill-location'
                  ? `Разместить в ${relocatePending.displayCode}`
                  : relocatePending.kind === 'assign-asset'
                    ? `Куда переместить «${relocatePending.title}»`
                    : `Куда переместить «${relocatePending.itemTitle}»`
              }
              onCancel={cancelRelocate}
            />
          ) : null}
        </View>

        <View style={[styles.footer, { paddingBottom: footerBottom }]}>
          <Text variant="caption" style={styles.hint}>
            {relocatePending
              ? relocatePending.kind === 'fill-location'
                ? 'Наведите на QR двигателя'
                : 'Наведите камеру на QR места или код ячейки'
              : isOrderContext
                ? 'Наведите камеру на штрихкод — позиция добавится в наряд'
                : 'Наведите камеру на штрихкод'}
          </Text>
          {!isOrderContext ? (
            <ScanGlassPanel
              onManualSearch={() => navigateToSearch()}
              onOpenPhotos={() => void handleOpenPhotos()}
              onImportDocument={() => {
                haptics.selection();
                router.push('/(tabs)/import' as Href);
              }}
              onRecentScans={() => {
                void refreshRecentScans();
                recentSheetRef.current?.present();
              }}
            />
          ) : null}
        </View>

        <ScanProductSheet
          ref={productSheetRef}
          result={activeResult?.id === 'candidates' ? null : activeResult}
          onSell={() => {
            if (!activeResult) return;
            const itemId = activeResult.id;
            dismissSheet(productSheetRef, () => addToOrderFlow.addPartToOrder(itemId));
          }}
          onEdit={() => {
            navigateToSearch(activeResult?.subtitle ?? activeResult?.code);
          }}
          onOpenCard={() => {
            navigateToSearch(activeResult?.subtitle ?? activeResult?.title);
          }}
          onMove={canMove ? openMoveFlow : undefined}
          onAddToOrder={
            activeResult?.id && activeResult.id !== 'candidates' && !isOrderContext
              ? () => {
                  const itemId = activeResult.id;
                  dismissSheet(productSheetRef, () => addToOrderFlow.addPartToOrder(itemId));
                }
              : undefined
          }
          onClose={() => dismissSheet(productSheetRef)}
          onDismiss={onSheetClosed}
        />

        <ScanMoveSheet
          ref={moveSheetRef}
          target={moveTarget}
          onMoved={() => {
            relocatePendingStore.clear();
            setMoveTarget(null);
            moveSheetRef.current?.dismiss();
          }}
          onCancel={() => {
            cancelRelocate();
          }}
          onPreferScan={() => {
            if (!moveTarget) return;
            relocatePendingStore.setRelocateItem({
              ...moveTarget,
              startedAt: Date.now(),
            });
            moveSheetRef.current?.dismiss();
          }}
          onDismiss={() => {
            setMoveTarget(null);
          }}
        />

        <ScanCandidatesSheet
          ref={candidatesSheetRef}
          result={activeResult}
          payload={snapshot.pendingPayload}
          onPick={(candidate: ScanCandidate) => void handlePickCandidate(candidate.id, candidate.score)}
          onSearch={() => navigateToSearch(snapshot.pendingPayload ?? undefined, candidatesSheetRef)}
          onDismiss={onSheetClosed}
        />

        <ScanCodePickerSheet
          ref={codePickerSheetRef}
          detections={snapshot.pendingDetections ?? []}
          onPick={handlePickDetectedCode}
          onDismiss={onSheetClosed}
        />

        <ScanNotFoundSheet
          ref={notFoundSheetRef}
          payload={snapshot.pendingPayload}
          isAiLoading={isAiLoading}
          orderContext={isOrderContext}
          onCreateItem={handleCreateItem}
          onAddAsSpecific={handleAddAsSpecific}
          onTryAi={!isOrderContext ? handleTryAi : undefined}
          onOpenUrl={handleOpenUrl}
          onCancel={handleCancelNotFound}
          onDismiss={onSheetClosed}
        />

        <ScanDocumentSheet
          ref={documentSheetRef}
          document={parsedDocument}
          onPrimary={handleDocumentPrimary}
          onSearchVin={
            parsedDocument?.vin
              ? () => navigateToSearch(parsedDocument.vin)
              : undefined
          }
          onDismiss={onSheetClosed}
        />

        <BottomSheetModal
          ref={recentSheetRef}
          {...sheet.sheetLayout}
          index={0}
          snapPoints={sheet.compactSnapPoints(36)}
          enablePanDownToClose
          backdropComponent={sheet.renderBackdrop}
          backgroundStyle={sheet.backgroundStyle}
          handleIndicatorStyle={sheet.handleIndicatorStyle}
        >
          <BottomSheetView style={{ ...sheet.compactContentStyle, gap: 4 }}>
            <Text variant="body" style={{ fontSize: 15, fontWeight: '600', marginBottom: 8 }}>
              Недавние сканы
            </Text>
            {recentScans.length === 0 ? (
              <Text variant="caption" color="muted">
                Пока пусто — отсканируйте первую позицию.
              </Text>
            ) : (
              recentScans.map((item, index) => (
                <RecentScanRow
                  key={item.id}
                  item={item}
                  isLast={index === recentScans.length - 1}
                  onPress={() => {
                    haptics.selection();
                    replayPayload(item.payload);
                  }}
                />
              ))
            )}
          </BottomSheetView>
        </BottomSheetModal>

        <OrderPickerSheet
          ref={addToOrderFlow.pickerRef}
          drafts={addToOrderFlow.drafts}
          onSelectNew={addToOrderFlow.handleSelectNew}
          onSelectOrder={addToOrderFlow.handleSelectOrder}
          onDismiss={addToOrderFlow.handlePickerDismiss}
        />
      </View>
  );
}

function RecentScanRow({
  item,
  isLast,
  onPress,
}: {
  item: RecentScan;
  isLast: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
        }}
      >
        <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
          {item.label}
        </Text>
        <Text variant="caption" color="muted">
          {item.time}
        </Text>
      </Pressable>
      {!isLast ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  footer: {
    paddingHorizontal: rhythm.pad,
    paddingTop: rhythm.inline,
    gap: rhythm.inline,
    backgroundColor: '#000',
  },
  hint: {
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  ocrOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  ocrLabel: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 8,
  },
});
