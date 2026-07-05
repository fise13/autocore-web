import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, LayoutChangeEvent, Linking, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, toast } from '@/components/ui';
import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import {
  useModalBottomSheet,
  useTheme,
} from '@/hooks';
import { loadRecentScans } from '@/lib/scan/recent-scans';
import { haptics, rhythm } from '@/theme';

import { ScanCamera, type ScanCameraHandle } from './components/scan-camera';
import { ScanCandidatesSheet } from './components/scan-candidates-sheet';
import { ScanConfirmFlash } from './components/scan-confirm-flash';
import { ScanDetectionOverlay } from './components/scan-detection-overlay';
import { ScanDocumentSheet } from './components/scan-document-sheet';
import { ScanGlassPanel } from './components/scan-glass-panel';
import { ScanHeader } from './components/scan-header';
import { ScanIdleIndicator } from './components/scan-idle-indicator';
import { ScanModeStrip, scanModeHint, type ScanCaptureMode } from './components/scan-mode-strip';
import { ScanNotFoundSheet } from './components/scan-not-found-sheet';
import { ScanOrderContextBanner } from './components/scan-order-context-banner';
import { ScanProductSheet } from './components/scan-product-sheet';
import { useScanExperience } from './hooks/use-scan-experience';
import type { RecentScan, ScanCandidate } from './types';
import { scanContextStore } from '@/services/scan';

type ScanScreenProps = {
  onClose?: () => void;
};

export function ScanScreen({ onClose }: ScanScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isFocused = useIsFocused();
  const sheet = useModalBottomSheet();

  const cameraRef = useRef<ScanCameraHandle>(null);
  const recentSheetRef = useRef<BottomSheetModal>(null);

  const [torchOn, setTorchOn] = useState(false);
  const [captureMode, setCaptureMode] = useState<ScanCaptureMode>('auto');
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  const experience = useScanExperience();
  const {
    snapshot,
    parsedDocument,
    isAiLoading,
    showConfirmFlash,
    cameraActive,
    ocrBusy,
    cameraLayout,
    setCameraLayout,
    onDetection,
    onSheetClosed,
    dismissSheet,
    handlePickCandidate,
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
    service,
    setOcrBusy,
  } = experience;

  const showShutter = captureMode !== 'auto';
  const activeResult = snapshot.activeResult;
  const isOrderContext = snapshot.context.mode === 'order';
  const orderLabel = snapshot.context.mode === 'order' ? snapshot.context.orderLabel : undefined;

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

  const handleShutter = useCallback(async () => {
    if (ocrBusy || !cameraActive) return;
    haptics.light();
    const uri = await cameraRef.current?.takePicture();
    if (!uri) {
      toast({ title: 'Не удалось сделать снимок', variant: 'warning' });
      return;
    }
    await runOcrOnUri(uri, captureMode === 'document');
  }, [cameraActive, captureMode, ocrBusy, runOcrOnUri]);

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
    await runOcrOnUri(pick.assets[0].uri, captureMode === 'document');
  }, [captureMode, runOcrOnUri]);

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

  const focusedCameraActive = cameraActive;

  const overlayLayout = useMemo(() => {
    if (cameraLayout.width > 0 && cameraLayout.height > 0) return cameraLayout;
    const { width, height } = Dimensions.get('window');
    return { width, height };
  }, [cameraLayout.height, cameraLayout.width]);

  return (
    <BottomSheetModalProvider>
      <View style={styles.root}>
        <View style={styles.cameraShell} onLayout={onCameraLayout}>
          <ScanCamera
            ref={cameraRef}
            torch={torchOn && isFocused}
            active={focusedCameraActive && isFocused}
            onDetection={onDetection}
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
        </View>

        <ScanHeader
          torchOn={torchOn}
          onToggleTorch={() => setTorchOn((value) => !value)}
          onSettingsPress={() => router.navigate('/(tabs)/profile' as const)}
          orderContext={isOrderContext}
          orderLabel={orderLabel}
          onBackPress={isOrderContext ? handleClose : undefined}
        />

        {isOrderContext ? <ScanOrderContextBanner orderLabel={orderLabel} /> : null}

        <View style={[styles.modeArea, { bottom: Math.max(insets.bottom, 8) + (isOrderContext ? 108 : 148) }]} pointerEvents="box-none">
          <Text variant="caption" style={styles.hint}>
            {isOrderContext
              ? 'Наведите камеру на штрихкод — позиция добавится в наряд'
              : scanModeHint(captureMode)}
          </Text>
          {!isOrderContext ? (
            <ScanModeStrip mode={captureMode} onChange={setCaptureMode} />
          ) : null}
          {showShutter ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Сделать снимок"
              disabled={ocrBusy || !cameraActive}
              onPress={() => void handleShutter()}
              style={[styles.shutter, { opacity: ocrBusy || !cameraActive ? 0.45 : 1 }]}
            >
              <View style={styles.shutterInner} />
            </Pressable>
          ) : null}
        </View>

        {!isOrderContext ? (
          <ScanGlassPanel
            onManualSearch={() => navigateToSearch()}
            onOpenPhotos={() => void handleOpenPhotos()}
            onRecentScans={() => {
              void refreshRecentScans();
              recentSheetRef.current?.present();
            }}
          />
        ) : null}

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

        <ScanCandidatesSheet
          ref={candidatesSheetRef}
          result={activeResult}
          payload={snapshot.pendingPayload}
          onPick={(candidate: ScanCandidate) => void handlePickCandidate(candidate.id, candidate.score)}
          onSearch={() => navigateToSearch(snapshot.pendingPayload ?? undefined, candidatesSheetRef)}
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
    </BottomSheetModalProvider>
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
  cameraShell: {
    ...StyleSheet.absoluteFill,
  },
  modeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: rhythm.inline,
  },
  hint: {
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
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
