import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import {
  useTheme,
  useSession,
  useMobileScanResolve,
  useMobileScanDisambiguate,
  useMobileScanOcr,
  useMobileScanFeedback,
  useMobileQuickReceive,
} from '@/hooks';
import { loadRecentScans, rememberRecentScan } from '@/lib/scan/recent-scans';
import { mapResolveResultToScanResult } from '@/lib/scan/map-resolve-result';
import { haptics } from '@/theme';
import type { MobileScanResolveResult } from '@/types/inventory';

import { resolveScanPayload } from './data/mock-scan-registry';
import { ScanCamera } from './components/scan-camera';
import { ScanCandidatesSheet } from './components/scan-candidates-sheet';
import { ScanFrameOverlay } from './components/scan-frame-overlay';
import { ScanGlassPanel } from './components/scan-glass-panel';
import { ScanHeader } from './components/scan-header';
import { ScanResultSheet } from './components/scan-result-sheet';
import { ScanUnknownSheet } from './components/scan-unknown-sheet';
import { scanLayout } from './layout';
import type { RecentScan, ScanCandidate, ScanResult } from './types';

type SheetKind = 'result' | 'unknown' | 'candidates' | null;

function useDevMockFallback(): boolean {
  return __DEV__;
}

export function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const scanResolve = useMobileScanResolve();
  const scanDisambiguate = useMobileScanDisambiguate();
  const scanOcr = useMobileScanOcr();
  const scanFeedback = useMobileScanFeedback();
  const quickReceive = useMobileQuickReceive();
  const { can } = useSession();
  const allowMock = useDevMockFallback();

  const resultSheetRef = useRef<BottomSheetModal>(null);
  const unknownSheetRef = useRef<BottomSheetModal>(null);
  const candidatesSheetRef = useRef<BottomSheetModal>(null);
  const recentSheetRef = useRef<BottomSheetModal>(null);

  const [torchOn, setTorchOn] = useState(false);
  const [detected, setDetected] = useState(false);
  const [scanningPaused, setScanningPaused] = useState(false);
  const [activeResult, setActiveResult] = useState<ScanResult | null>(null);
  const [unknownPayload, setUnknownPayload] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const pendingPayloadRef = useRef<string | null>(null);
  const sheetKindRef = useRef<SheetKind>(null);
  const resolveDoneRef = useRef(false);
  const animDoneRef = useRef(false);

  const openSheetByKind = useCallback((kind: SheetKind) => {
    sheetKindRef.current = kind;
    if (kind === 'result') resultSheetRef.current?.present();
    else if (kind === 'unknown') unknownSheetRef.current?.present();
    else if (kind === 'candidates') candidatesSheetRef.current?.present();
  }, []);

  const tryOpenSheet = useCallback(() => {
    if (!resolveDoneRef.current || !animDoneRef.current) return;
    openSheetByKind(sheetKindRef.current);
  }, [openSheetByKind]);

  const applyResolve = useCallback(
    async (payload: string, apiResult: MobileScanResolveResult | null, source: 'camera' | 'photo' | 'ocr') => {
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
      setScanningPaused(true);
      setDetected(true);
      resolveDoneRef.current = false;
      animDoneRef.current = false;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pendingPayloadRef.current = payload;

      try {
        if (can('inventory_view')) {
          const result = await scanResolve.mutateAsync({ barcode: payload, source });
          await applyResolve(payload, result, source);
        } else if (allowMock) {
          await applyResolve(payload, null, source);
        } else {
          setActiveResult(null);
          setUnknownPayload(payload);
          sheetKindRef.current = 'unknown';
        }
      } catch {
        if (allowMock) {
          await applyResolve(payload, null, source);
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
    [allowMock, applyResolve, can, scanResolve, tryOpenSheet],
  );

  const openSheet = useCallback(() => {
    animDoneRef.current = true;
    tryOpenSheet();
  }, [tryOpenSheet]);

  const resetScan = useCallback(() => {
    setDetected(false);
    setScanningPaused(false);
    setActiveResult(null);
    setUnknownPayload(null);
    pendingPayloadRef.current = null;
    sheetKindRef.current = null;
    resolveDoneRef.current = false;
    animDoneRef.current = false;
  }, []);

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

  const navigateToSearch = useCallback(
    (query?: string) => {
      const q = query?.trim();
      router.navigate(q ? `/(tabs)/search?q=${encodeURIComponent(q)}` : '/(tabs)/search');
      resetScan();
    },
    [resetScan, router],
  );

  const handleQuickReceive = useCallback(async () => {
    if (!activeResult?.id || activeResult.id === 'candidates') return;
    if (!can('inventory_edit')) {
      Alert.alert('Нет доступа', 'Для приёмки нужно право редактирования склада.');
      return;
    }
    try {
      await quickReceive.mutateAsync({ itemId: activeResult.id, quantity: 1 });
      Alert.alert('Готово', 'Позиция принята на склад (+1).');
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось принять на склад');
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
        }
      } catch (error) {
        Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось сохранить выбор');
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
      await applyResolve(payload, result, 'ocr');
      resolveDoneRef.current = true;
      openSheetByKind(sheetKindRef.current);
    } catch (error) {
      Alert.alert('AI', error instanceof Error ? error.message : 'Не удалось уточнить позицию');
    } finally {
      setIsAiLoading(false);
    }
  }, [applyResolve, openSheetByKind, scanDisambiguate, unknownPayload]);

  const handleBindPart = useCallback(() => {
    const payload = unknownPayload ?? pendingPayloadRef.current;
    unknownSheetRef.current?.dismiss();
    navigateToSearch(payload ?? undefined);
  }, [navigateToSearch, unknownPayload]);

  const handleOpenPhotos = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (pick.canceled || !pick.assets[0]?.uri) return;

    setScanningPaused(true);
    setDetected(true);
    resolveDoneRef.current = false;
    animDoneRef.current = false;

    try {
      const ocrResult = await scanOcr.mutateAsync(pick.assets[0].uri);
      const code = ocrResult.extractedCodes[0] ?? ocrResult.resolve?.barcode;
      if (!code) {
        Alert.alert('Фото', 'Не удалось найти штрихкод на изображении.');
        resetScan();
        return;
      }
      pendingPayloadRef.current = code;
      await applyResolve(code, ocrResult.resolve, 'photo');
    } catch (error) {
      Alert.alert('Фото', error instanceof Error ? error.message : 'Не удалось распознать фото');
      resetScan();
      return;
    }

    resolveDoneRef.current = true;
    animDoneRef.current = true;
    openSheetByKind(sheetKindRef.current);
  }, [applyResolve, openSheetByKind, resetScan, scanOcr]);

  return (
    <BottomSheetModalProvider>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.previewShell}>
          <ScanCamera torch={torchOn} active={!scanningPaused} onBarcode={(payload) => presentResult(payload, 'camera')} />
        </View>

        <View style={styles.overlayCenter} pointerEvents="none">
          <ScanFrameOverlay detected={detected} onDetectComplete={openSheet} />
        </View>

        <ScanHeader
          torchOn={torchOn}
          onToggleTorch={() => setTorchOn((value) => !value)}
          onSettingsPress={() => router.navigate('/(tabs)/profile')}
        />

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
          onSearch={() => {
            unknownSheetRef.current?.dismiss();
            navigateToSearch(unknownPayload ?? undefined);
          }}
          onDismiss={handleDismiss}
        />

        <BottomSheetModal
          ref={recentSheetRef}
          snapPoints={['36%']}
          enablePanDownToClose
          backgroundStyle={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 4 }}>
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
});
