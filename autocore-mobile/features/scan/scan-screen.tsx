import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useIsFocused, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, toast } from '@/components/ui';
import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import {
  useTheme,
  useSession,
  useModalBottomSheet,
  useMobileScanResolve,
  useMobileScanDisambiguate,
  useMobileScanOcr,
  useMobileScanFeedback,
  useMobileQuickReceive,
} from '@/hooks';
import { loadRecentScans, rememberRecentScan } from '@/lib/scan/recent-scans';
import { mapResolveResultToScanResult } from '@/lib/scan/map-resolve-result';
import { haptics, rhythm } from '@/theme';
import type { MobileScanResolveResult, ScanOcrResolveResponse } from '@/types/inventory';

import { resolveScanPayload } from './data/mock-scan-registry';
import { classifyScanPayload, isHttpUrl } from './lib/classify-payload';
import { openEntityLink, entityLinkLabel } from './lib/open-entity';
import { scanNavigationGuard } from '@/lib/navigation/navigation-guard';
import { parseDocumentText, type ParsedDocument } from './lib/parse-document';
import { findVinInCodes, findVinInText } from './lib/vin';
import { ScanCamera, type ScanCameraHandle } from './components/scan-camera';
import { ScanCandidatesSheet } from './components/scan-candidates-sheet';
import { ScanDocumentSheet } from './components/scan-document-sheet';
import { ScanFrameOverlay } from './components/scan-frame-overlay';
import { ScanGlassPanel } from './components/scan-glass-panel';
import { ScanHeader } from './components/scan-header';
import { ScanModeStrip, scanModeHint, type ScanCaptureMode } from './components/scan-mode-strip';
import { ScanResultSheet } from './components/scan-result-sheet';
import { ScanUnknownSheet } from './components/scan-unknown-sheet';
import { scanLayout } from './layout';
import type { RecentScan, ScanCandidate, ScanResult } from './types';

type SheetKind = 'result' | 'unknown' | 'candidates' | 'document' | null;

function useDevMockFallback(): boolean {
  return __DEV__;
}

export function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const sheet = useModalBottomSheet();
  const scanResolve = useMobileScanResolve();
  const scanDisambiguate = useMobileScanDisambiguate();
  const scanOcr = useMobileScanOcr();
  const scanFeedback = useMobileScanFeedback();
  const quickReceive = useMobileQuickReceive();
  const { can } = useSession();
  const addToOrderFlow = useAddToOrderFlow();
  const allowMock = useDevMockFallback();

  const cameraRef = useRef<ScanCameraHandle>(null);
  const resultSheetRef = useRef<BottomSheetModal>(null);
  const unknownSheetRef = useRef<BottomSheetModal>(null);
  const candidatesSheetRef = useRef<BottomSheetModal>(null);
  const documentSheetRef = useRef<BottomSheetModal>(null);
  const recentSheetRef = useRef<BottomSheetModal>(null);

  const [torchOn, setTorchOn] = useState(false);
  const [captureMode, setCaptureMode] = useState<ScanCaptureMode>('auto');
  const [detected, setDetected] = useState(false);
  const [scanningPaused, setScanningPaused] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [activeResult, setActiveResult] = useState<ScanResult | null>(null);
  const [unknownPayload, setUnknownPayload] = useState<string | null>(null);
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const pendingPayloadRef = useRef<string | null>(null);
  const sheetKindRef = useRef<SheetKind>(null);
  const resolveDoneRef = useRef(false);
  const animDoneRef = useRef(false);

  const frame = scanLayout.frames[captureMode];
  const showShutter = captureMode !== 'auto';

  const openSheetByKind = useCallback((kind: SheetKind) => {
    sheetKindRef.current = kind;
    if (kind === 'result') resultSheetRef.current?.present();
    else if (kind === 'unknown') unknownSheetRef.current?.present();
    else if (kind === 'candidates') candidatesSheetRef.current?.present();
    else if (kind === 'document') documentSheetRef.current?.present();
  }, []);

  const tryOpenSheet = useCallback(() => {
    if (!resolveDoneRef.current || !animDoneRef.current) return;
    openSheetByKind(sheetKindRef.current);
  }, [openSheetByKind]);

  const resetScan = useCallback(() => {
    setDetected(false);
    setScanningPaused(false);
    setOcrBusy(false);
    setActiveResult(null);
    setUnknownPayload(null);
    setParsedDocument(null);
    pendingPayloadRef.current = null;
    sheetKindRef.current = null;
    resolveDoneRef.current = false;
    animDoneRef.current = false;
  }, []);

  const navigateToSearch = useCallback(
    (query?: string) => {
      const q = query?.trim();
      router.navigate((q ? `/(tabs)/search?q=${encodeURIComponent(q)}` : '/(tabs)/search') as Href);
      resetScan();
    },
    [resetScan, router],
  );

  const openVinFlow = useCallback(
    (vin: string, payload: string) => {
      if (scanNavigationGuard.isLocked) return;
      setScanningPaused(true);
      scanNavigationGuard.tryNavigate(() => {
        haptics.success();
        void rememberRecentScan({ payload, label: `VIN ${vin}` });
        router.push(`/(tabs)/orders/new?vin=${encodeURIComponent(vin)}` as Href);
        resetScan();
        scanNavigationGuard.release();
      });
    },
    [resetScan, router],
  );

  const applyResolve = useCallback(
    async (payload: string, apiResult: MobileScanResolveResult | null) => {
      if (apiResult) {
        const mapped = mapResolveResultToScanResult(apiResult);
        if (mapped) {
          setActiveResult(mapped);
          setUnknownPayload(null);
          sheetKindRef.current = 'result';
          void rememberRecentScan({
            payload,
            label: mapped.title,
            itemId: mapped.id,
          });
          return;
        }

        if (apiResult.candidates.length > 0) {
          setActiveResult({
            id: 'candidates',
            kind: 'part',
            code: apiResult.barcode,
            title: 'Несколько совпадений',
            subtitle: payload,
            candidates: apiResult.candidates.map((candidate) => ({
              id: candidate.item.id,
              sku: candidate.item.sku,
              name: candidate.item.name,
              score: candidate.score,
              reason: candidate.reason,
              sellPrice: candidate.item.sellPrice,
              totalAvailable: candidate.item.totalAvailable,
            })),
            aiReasoning: apiResult.aiReasoning,
            confidence: apiResult.confidence,
            matchType: apiResult.matchType,
          });
          setUnknownPayload(payload);
          sheetKindRef.current = 'candidates';
          return;
        }
      }

      if (allowMock) {
        const resolved = resolveScanPayload(payload);
        if (resolved) {
          setActiveResult(resolved);
          setUnknownPayload(null);
          sheetKindRef.current = 'result';
          return;
        }
      }

      setActiveResult(null);
      setUnknownPayload(payload);
      sheetKindRef.current = 'unknown';
    },
    [allowMock],
  );

  const presentResult = useCallback(
    async (payload: string, source: 'camera' | 'photo' | 'ocr' = 'camera') => {
      const classified = classifyScanPayload(payload);

      // Entity QR — fully local: parse → navigate. No network before navigation.
      if (classified.type === 'entity-link') {
        if (scanNavigationGuard.isLocked) return;
        setScanningPaused(true);
        scanNavigationGuard.tryNavigate(() => {
          haptics.success();
          void rememberRecentScan({
            payload,
            label: entityLinkLabel(classified.entity),
            itemId: classified.id,
          });
          openEntityLink(classified.entity, classified.id, router);
          resetScan();
          scanNavigationGuard.release();
        });
        return;
      }

      // VIN — validated locally, open composer prefilled (fastest path for shop floor).
      if (classified.type === 'vin') {
        openVinFlow(classified.vin, payload);
        return;
      }

      // Foreign URL QR — sheet with open-in-browser + search, never auto-open.
      if (classified.type === 'url') {
        setScanningPaused(true);
        setDetected(true);
        setUnknownPayload(classified.url);
        pendingPayloadRef.current = classified.url;
        sheetKindRef.current = 'unknown';
        resolveDoneRef.current = true;
        animDoneRef.current = false;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      setScanningPaused(true);
      setDetected(true);
      resolveDoneRef.current = false;
      animDoneRef.current = false;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pendingPayloadRef.current = payload;

      try {
        if (can('inventory_view')) {
          const result = await scanResolve.mutateAsync({ barcode: payload, source });
          await applyResolve(payload, result);
        } else if (allowMock) {
          await applyResolve(payload, null);
        } else {
          setActiveResult(null);
          setUnknownPayload(payload);
          sheetKindRef.current = 'unknown';
        }
      } catch {
        if (allowMock) {
          await applyResolve(payload, null);
        } else {
          setActiveResult(null);
          setUnknownPayload(payload);
          sheetKindRef.current = 'unknown';
        }
      } finally {
        resolveDoneRef.current = true;
        tryOpenSheet();
      }
    },
    [allowMock, applyResolve, can, openVinFlow, resetScan, router, scanResolve, tryOpenSheet],
  );

  const openSheet = useCallback(() => {
    animDoneRef.current = true;
    tryOpenSheet();
  }, [tryOpenSheet]);

  const handleDismiss = useCallback(() => {
    resetScan();
  }, [resetScan]);

  const refreshRecentScans = useCallback(async () => {
    const items = await loadRecentScans();
    setRecentScans(items);
  }, []);

  useEffect(() => {
    void refreshRecentScans();
  }, [refreshRecentScans]);

  const replayPayload = useCallback(
    (payload: string) => {
      recentSheetRef.current?.dismiss();
      setTimeout(() => presentResult(payload, 'camera'), 220);
    },
    [presentResult],
  );

  const handleQuickReceive = useCallback(async () => {
    if (!activeResult?.id || activeResult.id === 'candidates') return;
    if (!can('inventory_edit')) {
      toast({
        title: 'Нет доступа',
        description: 'Для приёмки нужно право редактирования склада.',
        variant: 'warning',
      });
      return;
    }
    try {
      await quickReceive.mutateAsync({ itemId: activeResult.id, quantity: 1 });
      haptics.success();
      toast({ title: 'Принято на склад', description: '+1 к остатку', variant: 'success' });
    } catch (error) {
      haptics.warning();
      toast({
        title: 'Не удалось принять',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  }, [activeResult, can, quickReceive]);

  const handlePickCandidate = useCallback(
    async (candidate: ScanCandidate) => {
      const payload = unknownPayload ?? pendingPayloadRef.current;
      if (!payload) return;

      try {
        const response = await scanFeedback.mutateAsync({
          barcode: payload,
          itemId: candidate.id,
          outcome: 'user_picked_candidate',
          confidence: candidate.score,
        });
        const mapped = response.result ? mapResolveResultToScanResult(response.result) : null;
        if (mapped) {
          setActiveResult(mapped);
          setUnknownPayload(null);
          candidatesSheetRef.current?.dismiss();
          resultSheetRef.current?.present();
          void rememberRecentScan({ payload, label: mapped.title, itemId: mapped.id });
          toast({ title: 'Запомним выбор для этого кода', variant: 'success' });
        }
      } catch (error) {
        toast({
          title: 'Не удалось сохранить выбор',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    },
    [scanFeedback, unknownPayload],
  );

  const handleTryAi = useCallback(async () => {
    const payload = unknownPayload ?? pendingPayloadRef.current;
    if (!payload) return;
    setIsAiLoading(true);
    try {
      const result = await scanDisambiguate.mutateAsync(payload);
      unknownSheetRef.current?.dismiss();
      await applyResolve(payload, result);
      resolveDoneRef.current = true;
      openSheetByKind(sheetKindRef.current);
    } catch (error) {
      toast({
        title: 'Не удалось уточнить позицию',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsAiLoading(false);
    }
  }, [applyResolve, openSheetByKind, scanDisambiguate, unknownPayload]);

  const handleBindPart = useCallback(() => {
    const payload = unknownPayload ?? pendingPayloadRef.current;
    unknownSheetRef.current?.dismiss();
    navigateToSearch(payload ?? undefined);
  }, [navigateToSearch, unknownPayload]);

  const handleOpenUrl = useCallback(() => {
    const payload = unknownPayload ?? pendingPayloadRef.current;
    if (!payload || !isHttpUrl(payload)) return;
    unknownSheetRef.current?.dismiss();
    void Linking.openURL(payload);
    resetScan();
  }, [resetScan, unknownPayload]);

  const presentOcrResult = useCallback(
    async (ocrResult: ScanOcrResolveResponse, preferDocument: boolean) => {
      const codes = ocrResult.extractedCodes;
      const rawText = ocrResult.ocr.rawText?.trim() ?? '';
      const vin = findVinInCodes(codes) ?? (rawText ? findVinInText(rawText) : null);

      // VIN mode: any valid VIN opens the composer immediately.
      if (captureMode === 'vin' && vin) {
        openVinFlow(vin, vin);
        return;
      }

      // Document mode (or long OCR text) → deterministic parse → review sheet.
      if (preferDocument || rawText.length >= 40) {
        const doc = parseDocumentText(rawText || codes.join('\n'), codes);
        if (doc.kind !== 'unknown' || doc.lines.length > 0 || doc.total != null || doc.vin) {
          setParsedDocument(doc);
          sheetKindRef.current = 'document';
          void rememberRecentScan({
            payload: doc.number ?? doc.vin ?? codes[0] ?? 'document',
            label: doc.number ? `Док. ${doc.number}` : 'Документ',
          });
          return;
        }
      }

      // Auto / photo: VIN beats product codes when both appear.
      if (vin) {
        openVinFlow(vin, vin);
        return;
      }

      const code = codes[0] ?? ocrResult.resolve?.barcode;
      if (!code) {
        toast({
          title: 'Ничего не распознано',
          description: preferDocument
            ? 'Наведите чётче на документ и попробуйте ещё раз.'
            : 'На фото не удалось распознать код или VIN.',
          variant: 'warning',
        });
        resetScan();
        return;
      }

      const classified = classifyScanPayload(code);
      if (classified.type === 'entity-link') {
        openEntityLink(classified.entity, classified.id, router);
        resetScan();
        return;
      }
      if (classified.type === 'vin') {
        openVinFlow(classified.vin, code);
        return;
      }

      pendingPayloadRef.current = code;
      await applyResolve(code, ocrResult.resolve);
    },
    [applyResolve, captureMode, openVinFlow, resetScan, router],
  );

  const runOcrOnUri = useCallback(
    async (uri: string, preferDocument: boolean) => {
      setScanningPaused(true);
      setDetected(true);
      setOcrBusy(true);
      resolveDoneRef.current = false;
      animDoneRef.current = false;

      try {
        const ocrResult = await scanOcr.mutateAsync(uri);
        await presentOcrResult(ocrResult, preferDocument);
      } catch (error) {
        toast({
          title: 'Ошибка распознавания',
          description: error instanceof Error ? error.message : 'Не удалось распознать фото',
          variant: 'destructive',
        });
        resetScan();
        return;
      } finally {
        setOcrBusy(false);
      }

      resolveDoneRef.current = true;
      animDoneRef.current = true;
      openSheetByKind(sheetKindRef.current);
    },
    [openSheetByKind, presentOcrResult, resetScan, scanOcr],
  );

  const handleShutter = useCallback(async () => {
    if (ocrBusy || scanningPaused) return;
    haptics.light();
    const uri = await cameraRef.current?.takePicture();
    if (!uri) {
      toast({ title: 'Не удалось сделать снимок', variant: 'warning' });
      return;
    }
    await runOcrOnUri(uri, captureMode === 'document');
  }, [captureMode, ocrBusy, runOcrOnUri, scanningPaused]);

  const handleOpenPhotos = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Нет доступа к фото',
        'Разрешите доступ к галерее в настройках, чтобы распознавать коды с фото.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Настройки',
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ],
      );
      return;
    }
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (pick.canceled || !pick.assets[0]?.uri) return;
    await runOcrOnUri(pick.assets[0].uri, captureMode === 'document');
  }, [captureMode, runOcrOnUri]);

  const handleDocumentPrimary = useCallback(() => {
    if (!parsedDocument) return;
    documentSheetRef.current?.dismiss();

    if (parsedDocument.kind === 'work-order' || parsedDocument.vin) {
      const vin = parsedDocument.vin;
      router.push(
        (vin
          ? `/(tabs)/orders/new?vin=${encodeURIComponent(vin)}`
          : '/(tabs)/orders/new') as Href,
      );
      resetScan();
      return;
    }

    if (parsedDocument.kind === 'receipt') {
      toast({
        title: 'Расход распознан',
        description:
          parsedDocument.total != null
            ? `${parsedDocument.merchant ?? 'Чек'} · ${parsedDocument.total}`
            : 'Откройте учёт, чтобы записать операцию.',
        variant: 'success',
      });
      router.navigate('/(tabs)/accounting' as Href);
      resetScan();
      return;
    }

    if (parsedDocument.kind === 'invoice' || parsedDocument.kind === 'waybill') {
      const query = parsedDocument.lines[0]?.name ?? parsedDocument.number ?? parsedDocument.merchant;
      toast({
        title: 'Документ распознан',
        description: 'Проверьте позиции и оформите приход.',
        variant: 'success',
      });
      navigateToSearch(query ?? undefined);
      return;
    }

    navigateToSearch(parsedDocument.number ?? parsedDocument.merchant ?? undefined);
  }, [navigateToSearch, parsedDocument, resetScan, router]);

  const onBarcode = useCallback(
    (payload: string) => {
      void presentResult(payload, 'camera');
    },
    [presentResult],
  );

  const cameraActive = isFocused && !scanningPaused && !ocrBusy;

  const ocrOverlay = useMemo(() => {
    if (!ocrBusy) return null;
    return (
      <View style={styles.ocrOverlay} pointerEvents="none">
        <ActivityIndicator color="#fff" />
        <Text variant="caption" style={{ color: '#fff', fontWeight: '600', marginTop: 8 }}>
          Распознаём…
        </Text>
      </View>
    );
  }, [ocrBusy]);

  return (
    <BottomSheetModalProvider>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.previewShell}>
          <ScanCamera
            ref={cameraRef}
            torch={torchOn && isFocused}
            active={cameraActive}
            onBarcode={onBarcode}
          />
          {ocrOverlay}
        </View>

        <View style={styles.overlayCenter} pointerEvents="none">
          <ScanFrameOverlay
            detected={detected}
            width={frame.width}
            height={frame.height}
            onDetectComplete={openSheet}
          />
        </View>

        <ScanHeader
          torchOn={torchOn}
          onToggleTorch={() => setTorchOn((value) => !value)}
          onSettingsPress={() => router.navigate('/(tabs)/profile')}
        />

        <View style={styles.modeArea} pointerEvents="box-none">
          <Text variant="caption" style={styles.hint}>
            {scanModeHint(captureMode)}
          </Text>
          <ScanModeStrip mode={captureMode} onChange={setCaptureMode} />
          {showShutter ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Сделать снимок"
              disabled={ocrBusy || scanningPaused}
              onPress={() => void handleShutter()}
              style={[
                styles.shutter,
                {
                  borderColor: colors.primary,
                  opacity: ocrBusy || scanningPaused ? 0.45 : 1,
                },
              ]}
            >
              <View style={[styles.shutterInner, { backgroundColor: colors.primary }]} />
            </Pressable>
          ) : null}
        </View>

        <ScanGlassPanel
          onManualSearch={() => navigateToSearch()}
          onOpenPhotos={() => void handleOpenPhotos()}
          onRecentScans={() => {
            void refreshRecentScans();
            recentSheetRef.current?.present();
          }}
        />

        <ScanResultSheet
          ref={resultSheetRef}
          result={activeResult?.id === 'candidates' ? null : activeResult}
          isReceiving={quickReceive.isPending}
          onAddToOrder={
            activeResult?.id && activeResult.id !== 'candidates'
              ? () => {
                  resultSheetRef.current?.dismiss();
                  addToOrderFlow.addPartToOrder(activeResult.id);
                  resetScan();
                }
              : undefined
          }
          onOpen={() => {
            resultSheetRef.current?.dismiss();
            navigateToSearch(activeResult?.subtitle ?? activeResult?.code);
          }}
          onReceive={() => void handleQuickReceive()}
          onReserve={() => {
            resultSheetRef.current?.dismiss();
            resetScan();
          }}
          onSearch={() => {
            resultSheetRef.current?.dismiss();
            navigateToSearch(activeResult?.subtitle ?? activeResult?.code);
          }}
          onDismiss={handleDismiss}
        />

        <ScanCandidatesSheet
          ref={candidatesSheetRef}
          result={activeResult}
          payload={unknownPayload ?? pendingPayloadRef.current}
          onPick={(candidate) => void handlePickCandidate(candidate)}
          onSearch={() => {
            candidatesSheetRef.current?.dismiss();
            navigateToSearch(unknownPayload ?? pendingPayloadRef.current ?? undefined);
          }}
          onDismiss={handleDismiss}
        />

        <ScanUnknownSheet
          ref={unknownSheetRef}
          payload={unknownPayload}
          isAiLoading={isAiLoading || scanDisambiguate.isPending}
          onTryAi={() => void handleTryAi()}
          onBindPart={handleBindPart}
          onOpenUrl={handleOpenUrl}
          onSearch={() => {
            unknownSheetRef.current?.dismiss();
            navigateToSearch(unknownPayload ?? undefined);
          }}
          onDismiss={handleDismiss}
        />

        <ScanDocumentSheet
          ref={documentSheetRef}
          document={parsedDocument}
          onPrimary={handleDocumentPrimary}
          onSearchVin={
            parsedDocument?.vin
              ? () => {
                  documentSheetRef.current?.dismiss();
                  navigateToSearch(parsedDocument.vin);
                }
              : undefined
          }
          onDismiss={handleDismiss}
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
                <View key={item.id}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      haptics.selection();
                      replayPayload(item.payload);
                    }}
                    onLongPress={() => {
                      haptics.medium();
                      recentSheetRef.current?.dismiss();
                      setTimeout(() => presentResult(item.payload, 'camera'), 120);
                    }}
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
                  {index < recentScans.length - 1 ? (
                    <View style={{ height: 1, backgroundColor: colors.border }} />
                  ) : null}
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
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewShell: {
    ...StyleSheet.absoluteFill,
    marginHorizontal: scanLayout.pad,
    marginTop: 108,
    marginBottom: 220,
    borderRadius: scanLayout.radius,
    overflow: 'hidden',
  },
  overlayCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 120,
  },
  modeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 168,
    alignItems: 'center',
    gap: rhythm.inline,
  },
  hint: {
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  ocrOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
