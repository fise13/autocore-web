import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  LayoutChangeEvent,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useIsFocused, useRouter, type Href } from 'expo-router';

import { Text, toast } from '@/components/ui';
import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import {
  useFloatingTabBarInset,
  useModalBottomSheet,
  useSession,
} from '@/hooks';
import { tabNavigationGuard, scanNavigationGuard } from '@/lib/navigation/navigation-guard';
import { loadRecentScans } from '@/lib/scan/recent-scans';
import { haptics } from '@/theme';

import { ScanCamera, type ScanCameraHandle } from './components/scan-camera';
import { ScanCandidatesSheet } from './components/scan-candidates-sheet';
import { ScanCodePickerSheet } from './components/scan-code-picker-sheet';
import { ScanConfirmFlash } from './components/scan-confirm-flash';
import { ScanDetectionOverlay } from './components/scan-detection-overlay';
import { ScanDocumentSheet } from './components/scan-document-sheet';
import { ScanFrameOverlay } from './components/scan-frame-overlay';
import { ScanIdleIndicator } from './components/scan-idle-indicator';
import { ScanModeControl } from './components/scan-mode-control';
import { ScanMoveSheet, type ScanMoveTarget } from './components/scan-move-sheet';
import { ScanNotFoundSheet } from './components/scan-not-found-sheet';
import { ScanOrderContextBanner } from './components/scan-order-context-banner';
import { ScanProductSheet } from './components/scan-product-sheet';
import { ScanRelocateBanner } from './components/scan-relocate-banner';
import {
  ScanSheetHairline,
  ScanSheetHeader,
  ScanSheetRow,
} from './components/scan-sheet-chrome';
import { ScanShutterButton } from './components/scan-shutter-button';
import { ScanStatusLine } from './components/scan-status-line';
import { ScanToolbar } from './components/scan-toolbar';
import { ScanTopBar } from './components/scan-top-bar';
import { useScanExperience } from './hooks/use-scan-experience';
import { useScanChromeColors } from './lib/scan-chrome-colors';
import { relocatePendingStore } from './lib/relocate-pending-store';
import { uploadScanDocument } from './lib/upload-scan-document';
import { findVinInText, normalizeVin } from './lib/vin';
import { scanLayout, type ScanCaptureMode } from './layout';
import type { RecentScan, ScanCandidate } from './types';
import { scanContextStore, type ScanDetection } from '@/services/scan';

type ScanScreenProps = {
  onClose?: () => void;
};

export function ScanScreen({ onClose }: ScanScreenProps = {}) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const sheet = useModalBottomSheet();
  const chrome = useScanChromeColors();
  const { footerBottom } = useFloatingTabBarInset();
  const { can } = useSession();

  const cameraRef = useRef<ScanCameraHandle>(null);
  const recentSheetRef = useRef<BottomSheetModal>(null);
  /** True while ImagePicker / another system UI owns the screen — skip camera teardown. */
  const overlayBusyRef = useRef(false);
  const blurTeardownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [torchOn, setTorchOn] = useState(false);
  const [captureMode, setCaptureMode] = useState<ScanCaptureMode>('auto');
  const captureModeRef = useRef<ScanCaptureMode>('auto');
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [moveTarget, setMoveTarget] = useState<ScanMoveTarget | null>(null);
  const [relocatePending, setRelocatePending] = useState(() => relocatePendingStore.get());
  /** Keep CameraView warm across brief blurs (picker, sheet focus glitches). */
  const [cameraMounted, setCameraMounted] = useState(isFocused);

  const [documentBatchId, setDocumentBatchId] = useState<string | null>(null);

  useEffect(() => {
    captureModeRef.current = captureMode;
  }, [captureMode]);

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

  const refreshRecentScans = useCallback(async () => {
    const items = await loadRecentScans();
    setRecentScans(items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (blurTeardownRef.current) {
        clearTimeout(blurTeardownRef.current);
        blurTeardownRef.current = null;
      }

      tabNavigationGuard.release();
      scanNavigationGuard.release();
      setCameraMounted(true);
      service.resume();

      const recentTimer = setTimeout(() => {
        void refreshRecentScans();
      }, 280);

      return () => {
        clearTimeout(recentTimer);
        service.pause();
        setTorchOn(false);

        // ImagePicker / system sheets briefly blur this screen. Immediate
        // dismissAllSheets + CameraView unmount made modals vanish and then
        // hitch hard on remount when focus returned.
        blurTeardownRef.current = setTimeout(() => {
          blurTeardownRef.current = null;
          if (overlayBusyRef.current) return;
          dismissAllSheets();
          recentSheetRef.current?.dismiss();
          addToOrderFlow.pickerRef.current?.dismiss();
          setMoveTarget(null);
          setCameraMounted(false);
        }, 650);
      };
    }, [addToOrderFlow.pickerRef, dismissAllSheets, refreshRecentScans, service]),
  );

  const activeResult = snapshot.activeResult;
  const isOrderContext = snapshot.context.mode === 'order';
  const orderLabel = snapshot.context.mode === 'order' ? snapshot.context.orderLabel : undefined;
  const canMove = can('inventory_edit') && !isOrderContext;
  const frame = scanLayout.frames[captureMode];
  const frameDetected =
    Boolean(snapshot.detection) &&
    (snapshot.phase === 'tracking' ||
      snapshot.phase === 'resolving' ||
      snapshot.phase === 'confirmed');

  const openMoveFlow = useCallback(() => {
    if (!activeResult || activeResult.id === 'candidates') return;
    const warehouseId = activeResult.stockLevels?.[0]?.warehouseId;
    if (!warehouseId) {
      toast({
        title: 'No warehouse',
        description: 'This item has no stock on hand — receive it first.',
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

  const runOcrOnUri = useCallback(
    async (uri: string, preferDocument: boolean) => {
      setOcrBusy(true);
      service.pause();
      try {
        const outcome = await service.resolvePhoto(uri, preferDocument);
        if (outcome === 'retry') {
          toast({
            title: 'Nothing recognized',
            description: 'Try taking a clearer shot.',
            variant: 'warning',
          });
        }
      } catch (error) {
        // A 500 here is almost always the server's vision provider being
        // unconfigured or out of credit — say so instead of surfacing a raw
        // backend string, which reads as a bug in the scanner itself.
        const status = (error as { status?: number })?.status;
        const serverDown = status != null && status >= 500;
        toast({
          title: serverDown ? 'Recognition unavailable' : 'Recognition error',
          description: serverDown
            ? 'The recognition service is not responding. Scan the barcode instead, or try again later.'
            : error instanceof Error
              ? error.message
              : 'Could not recognize the photo',
          variant: 'destructive',
        });
        onSheetClosed();
      } finally {
        setOcrBusy(false);
      }
    },
    [onSheetClosed, service, setOcrBusy],
  );

  const runDocumentImport = useCallback(
    async (uris: string[]) => {
      if (uris.length === 0) return;
      setOcrBusy(true);
      service.pause();
      let batchId = documentBatchId ?? undefined;
      let uploaded = 0;
      try {
        for (let i = 0; i < uris.length; i += 1) {
          const uri = uris[i];
          if (!uri) continue;
          const result = await uploadScanDocument(uri, { batchId });
          if (result.batchId) {
            batchId = result.batchId;
            setDocumentBatchId(result.batchId);
          }
          uploaded += 1;
        }
        haptics.success();
        void refreshRecentScans();
        toast({
          title: uploaded === 1 ? 'Document uploaded' : `${uploaded} documents uploaded`,
          description: 'Parsing continues in the background.',
          variant: 'success',
        });
      } catch (error) {
        haptics.warning();
        toast({
          title: uploaded > 0 ? 'Some uploads failed' : 'Upload failed',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      } finally {
        setOcrBusy(false);
        service.resume();
      }
    },
    [documentBatchId, refreshRecentScans, service, setOcrBusy],
  );

  const preferDocumentOcr = captureMode === 'document';

  const handleOpenPhotos = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({
        title: 'No photo access',
        description: 'Allow access to your photo library in Settings.',
        variant: 'warning',
      });
      void Linking.openSettings();
      return;
    }
    overlayBusyRef.current = true;
    let pick: ImagePicker.ImagePickerResult;
    try {
      pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: preferDocumentOcr ? 0.9 : 0.8,
        allowsMultipleSelection: preferDocumentOcr,
        selectionLimit: preferDocumentOcr ? 12 : 1,
      });
    } finally {
      overlayBusyRef.current = false;
    }
    if (pick.canceled || !pick.assets?.length) return;
    const uris = pick.assets.map((asset) => asset.uri).filter(Boolean);
    if (uris.length === 0) return;

    if (preferDocumentOcr) {
      await runDocumentImport(uris);
      return;
    }
    await runOcrOnUri(uris[0]!, false);
  }, [preferDocumentOcr, runDocumentImport, runOcrOnUri]);

  const handleCapture = useCallback(async () => {
    if (ocrBusy) return;
    const uri = await cameraRef.current?.takePicture();
    if (!uri) {
      toast({
        title: 'Could not capture',
        description: 'Try again in a moment.',
        variant: 'warning',
      });
      return;
    }
    if (captureModeRef.current === 'document') {
      await runDocumentImport([uri]);
      return;
    }
    await runOcrOnUri(uri, false);
  }, [ocrBusy, runDocumentImport, runOcrOnUri]);

  const handleLiveDetection = useCallback(
    (detection: ScanDetection) => {
      const mode = captureModeRef.current;
      if (mode === 'document') return;
      if (mode === 'vin') {
        const vin = normalizeVin(detection.payload) ?? findVinInText(detection.payload);
        if (!vin) return;
        onDetection({ ...detection, payload: vin });
        return;
      }
      onDetection(detection);
    },
    [onDetection],
  );

  const handleLiveDetections = useCallback(
    (detections: ScanDetection[]) => {
      const mode = captureModeRef.current;
      if (mode === 'document') return;
      if (mode === 'vin') {
        const vins = detections.flatMap((detection) => {
          const vin = normalizeVin(detection.payload) ?? findVinInText(detection.payload);
          return vin ? [{ ...detection, payload: vin }] : [];
        });
        if (vins.length === 0) return;
        if (vins.length === 1) {
          onDetection(vins[0]!);
          return;
        }
        onDetections(vins);
        return;
      }
      onDetections(detections);
    },
    [onDetection, onDetections],
  );

  const showShutter = captureMode === 'document' || captureMode === 'vin';

  const setMode = useCallback((mode: ScanCaptureMode) => {
    setCaptureMode(mode);
  }, []);

  const replayPayload = useCallback(
    (payload: string) => {
      recentSheetRef.current?.dismiss();
      if (payload.startsWith('document:')) {
        toast({
          title: 'Document already uploaded',
          description: 'Switch to Document mode to capture another page.',
          variant: 'default',
        });
        setCaptureMode('document');
        return;
      }
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
            ? (`/orders/new?vin=${encodeURIComponent(vin)}` as const)
            : ('/orders/new' as const),
        );
        return;
      }
      if (doc.kind === 'receipt') {
        router.navigate('/(tabs)/accounting' as const);
        return;
      }
      const query = doc.lines[0]?.name ?? doc.number ?? doc.merchant;
      const q = query?.trim();
      router.navigate((q ? `/search?q=${encodeURIComponent(q)}` : '/search') as Href);
    });
  }, [dismissSheet, parsedDocument, router]);

  const overlayLayout = useMemo(() => {
    if (cameraLayout.width > 0 && cameraLayout.height > 0) return cameraLayout;
    const { width, height } = Dimensions.get('window');
    return { width, height };
  }, [cameraLayout.height, cameraLayout.width]);

  const relocateHint =
    relocatePending && !isOrderContext
      ? relocatePending.kind === 'fill-location'
        ? 'Point at the engine QR'
        : 'Point at the location QR'
      : null;

  const orderHint = isOrderContext ? 'Scan to add to the work order' : null;

  return (
    <View style={[styles.root, { backgroundColor: chrome.stage }]}>
      <View style={styles.viewport} onLayout={onCameraLayout}>
        <ScanCamera
          ref={cameraRef}
          torch={torchOn && isFocused}
          mounted={cameraMounted}
          // Keep the native session warm during OCR/upload — flipping this
          // re-arms the barcode pipeline and feels like a hard hitch.
          sessionActive={cameraMounted}
          scanEnabled={isFocused && scanEnabled && !ocrBusy}
          captureMode={captureMode}
          onDetection={handleLiveDetection}
          onDetections={handleLiveDetections}
        />
        <ScanIdleIndicator phase={snapshot.phase} />
        <ScanDetectionOverlay
          detection={snapshot.detection}
          phase={snapshot.phase}
          layout={overlayLayout}
        />
        <ScanConfirmFlash visible={showConfirmFlash} />
        {ocrBusy ? (
          <View
            style={[styles.ocrOverlay, { backgroundColor: chrome.ocrScrim }]}
            pointerEvents="none"
          >
            <ActivityIndicator color={chrome.ocrLabel} />
            <Text variant="caption" style={[styles.ocrLabel, { color: chrome.ocrLabel }]}>
              {captureMode === 'document' ? 'Uploading…' : 'Recognizing…'}
            </Text>
          </View>
        ) : null}

        <ScanTopBar
          torchOn={torchOn}
          onToggleTorch={() => setTorchOn((value) => !value)}
          onBackPress={isOrderContext ? handleClose : undefined}
        />

        {isOrderContext ? <ScanOrderContextBanner orderLabel={orderLabel} /> : null}
        {relocatePending && !isOrderContext ? (
          <ScanRelocateBanner
            title={
              relocatePending.kind === 'fill-location' ? 'Scan item' : 'Scan location'
            }
            subtitle={
              relocatePending.kind === 'fill-location'
                ? `Place at ${relocatePending.displayCode}`
                : relocatePending.kind === 'assign-asset'
                  ? `Where to move “${relocatePending.title}”`
                  : `Where to move “${relocatePending.itemTitle}”`
            }
            onCancel={cancelRelocate}
          />
        ) : null}

        <View style={styles.viewfinderStage} pointerEvents="none">
          <ScanFrameOverlay
            detected={frameDetected}
            width={frame.width}
            height={frame.height}
          />
          <View style={{ height: 16 }} />
          <ScanStatusLine
            phase={snapshot.phase}
            mode={captureMode}
            ocrBusy={ocrBusy}
            detectedPayload={snapshot.detection?.payload}
            relocateHint={relocateHint}
            orderHint={orderHint}
          />
        </View>
      </View>

      <View
        style={[styles.footer, { paddingBottom: footerBottom, backgroundColor: chrome.stage }]}
      >
        <ScanModeControl mode={captureMode} onChange={setMode} />
        <View
          pointerEvents={showShutter ? 'auto' : 'none'}
          style={{ opacity: showShutter ? 1 : 0, height: showShutter ? undefined : 0, overflow: 'hidden' }}
        >
          <ScanShutterButton
            disabled={ocrBusy || !isFocused || !showShutter}
            onPress={() => void handleCapture()}
            accessibilityLabel={
              captureMode === 'vin' ? 'Capture VIN plate' : 'Capture document'
            }
          />
        </View>
        <ScanToolbar
          onPhotos={() => void handleOpenPhotos()}
          onSearch={() => navigateToSearch()}
          onRecents={() => {
            void refreshRecentScans();
            recentSheetRef.current?.present();
          }}
        />
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
          navigateToSearch(activeResult?.code ?? activeResult?.subtitle ?? activeResult?.title);
        }}
        onOpenCard={() => {
          navigateToSearch(activeResult?.code ?? activeResult?.title ?? activeResult?.subtitle);
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
          parsedDocument?.vin ? () => navigateToSearch(parsedDocument.vin) : undefined
        }
        onDismiss={onSheetClosed}
      />

      <BottomSheetModal
        ref={recentSheetRef}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={sheet.compactSnapPoints(42)}
        enablePanDownToClose
        backdropComponent={sheet.renderBackdrop}
        backgroundStyle={sheet.backgroundStyle}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
      >
        <BottomSheetView style={{ ...sheet.compactContentStyle, gap: 0 }}>
          <ScanSheetHeader title="Recents" meta="Tap a code to scan it again" />
          <View style={{ height: 8 }} />
          {recentScans.length === 0 ? (
            <Text variant="caption" color="muted" style={{ paddingVertical: 12 }}>
              Nothing here yet
            </Text>
          ) : (
            recentScans.map((item, index) => (
              <View key={item.id}>
                <ScanSheetRow
                  label={item.label}
                  detail={item.time}
                  onPress={() => {
                    haptics.selection();
                    replayPayload(item.payload);
                  }}
                />
                {index < recentScans.length - 1 ? <ScanSheetHairline /> : null}
              </View>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  viewfinderStage: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: scanLayout.pad,
    paddingTop: 12,
    gap: 14,
  },
  ocrOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrLabel: {
    fontWeight: '600',
    marginTop: 8,
  },
});
