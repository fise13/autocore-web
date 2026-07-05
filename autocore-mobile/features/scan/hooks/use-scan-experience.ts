import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Linking } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { toast } from '@/components/ui';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import {
  navigateEditOrderWithPart,
  navigateNewOrderWithPart,
} from '@/features/orders/lib/order-composition-nav';
import {
  useMobileScanDisambiguate,
  useMobileScanFeedback,
  useMobileScanOcr,
  useMobileScanResolve,
  useSession,
} from '@/hooks';
import { rememberRecentScan } from '@/lib/scan/recent-scans';
import { scanNavigationGuard } from '@/lib/navigation/navigation-guard';
import { haptics } from '@/theme';
import {
  ScanService,
  scanContextStore,
  type ScanContext,
  type ScanDetection,
  type ScanOutcome,
  type ScanServiceSnapshot,
} from '@/services/scan';

import { entityLinkLabel, openEntityLink } from '../lib/open-entity';
import { isHttpUrl } from '../lib/classify-payload';
import type { ParsedDocument } from '../lib/parse-document';

function useDevMockFallback(): boolean {
  return __DEV__;
}

function sheetPresentationKey(state: ScanServiceSnapshot): string | null {
  if (state.phase !== 'confirmed' || !state.sheetKind) return null;
  return `${state.sheetKind}:${state.pendingPayload ?? ''}`;
}

export function useScanExperience(initialContext?: ScanContext) {
  const router = useRouter();
  const { can } = useSession();
  const allowMock = useDevMockFallback();
  const scanResolve = useMobileScanResolve();
  const scanDisambiguate = useMobileScanDisambiguate();
  const scanOcr = useMobileScanOcr();
  const scanFeedback = useMobileScanFeedback();
  const addToOrderFlow = useAddToOrderFlow();

  const productSheetRef = useRef<BottomSheetModal>(null);
  const candidatesSheetRef = useRef<BottomSheetModal>(null);
  const notFoundSheetRef = useRef<BottomSheetModal>(null);
  const documentSheetRef = useRef<BottomSheetModal>(null);

  const [snapshot, setSnapshot] = useState<ScanServiceSnapshot>(() => ({
    phase: 'idle',
    context: initialContext ?? { mode: 'standalone' },
    detection: null,
    outcome: null,
    sheetKind: null,
    activeResult: null,
    pendingPayload: null,
  }));
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showConfirmFlash, setShowConfirmFlash] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [ocrBusy, setOcrBusy] = useState(false);

  const presentedKeyRef = useRef<string | null>(null);
  const afterDismissRef = useRef<(() => void) | null>(null);
  const dismissingRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const scanResolveRef = useRef(scanResolve);
  const scanDisambiguateRef = useRef(scanDisambiguate);
  const scanOcrRef = useRef(scanOcr);
  const scanFeedbackRef = useRef(scanFeedback);
  const canRef = useRef(can);
  const allowMockRef = useRef(allowMock);

  scanResolveRef.current = scanResolve;
  scanDisambiguateRef.current = scanDisambiguate;
  scanOcrRef.current = scanOcr;
  scanFeedbackRef.current = scanFeedback;
  canRef.current = can;
  allowMockRef.current = allowMock;

  const serviceRef = useRef<ScanService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new ScanService({
      resolveInventory: async (barcode, source) =>
        scanResolveRef.current.mutateAsync({ barcode, source }),
      disambiguate: async (barcode) => scanDisambiguateRef.current.mutateAsync(barcode),
      resolveOcr: async (uri) => scanOcrRef.current.mutateAsync(uri),
      feedbackPick: async ({ barcode, itemId, score }) => {
        const response = await scanFeedbackRef.current.mutateAsync({
          barcode,
          itemId,
          outcome: 'user_picked_candidate',
          confidence: score,
        });
        return response.result ?? null;
      },
      canInventoryView: () => canRef.current('inventory_view'),
      allowMock: () => allowMockRef.current,
    });
  }
  const service = serviceRef.current;

  useEffect(() => {
    const context = initialContext ?? scanContextStore.peek() ?? { mode: 'standalone' as const };
    service.setContext(context);
    return service.subscribe(setSnapshot);
  }, [initialContext, service]);

  const handleSheetClosed = useCallback(() => {
    dismissingRef.current = false;
    presentedKeyRef.current = null;
    setShowConfirmFlash(false);
    service.dismissSheet();

    const next = afterDismissRef.current;
    afterDismissRef.current = null;
    if (!next) return;

    requestAnimationFrame(() => {
      try {
        next();
      } catch (error) {
        toast({
          title: 'Не удалось выполнить действие',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    });
  }, [service]);

  const dismissSheet = useCallback(
    (sheetRef: RefObject<BottomSheetModal | null>, afterClose?: () => void) => {
      if (dismissingRef.current) return;
      dismissingRef.current = true;
      afterDismissRef.current = afterClose ?? null;
      sheetRef.current?.dismiss();

      // Fallback if onDismiss does not fire (already closed / race).
      setTimeout(() => {
        if (!dismissingRef.current) return;
        handleSheetClosed();
      }, 420);
    },
    [handleSheetClosed],
  );

  const handleInstantOutcome = useCallback(
    (outcome: ScanOutcome) => {
      if (outcome.kind === 'navigate-entity') {
        if (scanNavigationGuard.isLocked) return;
        scanNavigationGuard.tryNavigate(() => {
          haptics.success();
          void rememberRecentScan({
            payload: outcome.payload,
            label: entityLinkLabel(outcome.entity),
            itemId: outcome.id,
          });
          openEntityLink(outcome.entity, outcome.id, router);
          service.dismissSheet();
          scanNavigationGuard.release();
        });
        return;
      }

      if (outcome.kind === 'navigate-vin') {
        if (scanNavigationGuard.isLocked) return;
        scanNavigationGuard.tryNavigate(() => {
          haptics.success();
          void rememberRecentScan({ payload: outcome.payload, label: `VIN ${outcome.vin}` });
          router.push(`/(tabs)/orders/new?vin=${encodeURIComponent(outcome.vin)}` as Href);
          service.dismissSheet();
          scanNavigationGuard.release();
        });
        return;
      }

      if (outcome.kind === 'foreign-url') {
        const key = `not-found:${outcome.url}`;
        if (presentedKeyRef.current === key) return;
        presentedKeyRef.current = key;
        notFoundSheetRef.current?.present();
      }
    },
    [router, service],
  );

  const handleOrderOutcome = useCallback(
    (outcome: ScanOutcome) => {
      const ctx = snapshotRef.current.context;
      if (ctx.mode !== 'order') return false;

      if (outcome.kind === 'product') {
        const itemId = outcome.result.id;
        const ctx = snapshotRef.current.context;
        scanContextStore.complete({ type: 'added', itemId });
        presentedKeyRef.current = null;
        service.dismissSheet();
        productSheetRef.current?.dismiss();
        candidatesSheetRef.current?.dismiss();
        notFoundSheetRef.current?.dismiss();

        requestAnimationFrame(() => {
          if (ctx.mode === 'order' && ctx.orderId) {
            navigateEditOrderWithPart(router, ctx.orderId, itemId);
          } else {
            navigateNewOrderWithPart(router, itemId);
          }
          if (router.canGoBack()) router.back();
        });

        haptics.success();
        toast({ title: 'Добавлено в наряд', variant: 'success' });
        return true;
      }

      return false;
    },
    [router, service],
  );

  const presentSheetForSnapshot = useCallback(
    (state: ScanServiceSnapshot) => {
      if (!state.sheetKind || state.phase !== 'confirmed') return;

      const key = sheetPresentationKey(state);
      if (!key || presentedKeyRef.current === key) return;

      if (state.context.mode === 'order' && state.outcome) {
        if (handleOrderOutcome(state.outcome)) return;
      }

      presentedKeyRef.current = key;
      setShowConfirmFlash(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setShowConfirmFlash(false), 520);

      if (state.sheetKind === 'product') productSheetRef.current?.present();
      else if (state.sheetKind === 'candidates') candidatesSheetRef.current?.present();
      else if (state.sheetKind === 'not-found') notFoundSheetRef.current?.present();
      else if (state.sheetKind === 'document') documentSheetRef.current?.present();
    },
    [handleOrderOutcome],
  );

  useEffect(() => {
    const state = snapshot;
    if (!state.outcome) return;

    if (
      state.outcome.kind === 'navigate-entity' ||
      state.outcome.kind === 'navigate-vin' ||
      state.outcome.kind === 'foreign-url'
    ) {
      handleInstantOutcome(state.outcome);
      return;
    }

    if (state.phase === 'confirmed' && state.sheetKind) {
      if (state.outcome.kind === 'product') {
        void rememberRecentScan({
          payload: state.pendingPayload ?? state.outcome.result.code,
          label: state.outcome.result.title,
          itemId: state.outcome.result.id,
        });
      }
      if (state.outcome.kind === 'document') {
        setParsedDocument(state.outcome.document);
      }
      presentSheetForSnapshot(state);
    }
  }, [
    handleInstantOutcome,
    presentSheetForSnapshot,
    snapshot.outcome,
    snapshot.phase,
    snapshot.sheetKind,
    snapshot.pendingPayload,
    snapshot.context.mode,
  ]);

  const onDetection = useCallback(
    (detection: ScanDetection) => {
      service.onDetection(detection);
    },
    [service],
  );

  const handlePickCandidate = useCallback(
    async (candidateId: string, score: number) => {
      const payload = snapshotRef.current.pendingPayload;
      if (!payload) return;

      try {
        const outcome = await service.pickCandidate(payload, candidateId, score);
        if (!outcome || outcome.kind !== 'product') return;

        dismissSheet(candidatesSheetRef, () => {
          void rememberRecentScan({ payload, label: outcome.result.title, itemId: outcome.result.id });

          if (snapshotRef.current.context.mode === 'order') {
            const ctx = snapshotRef.current.context;
            if (ctx.mode === 'order') {
              scanContextStore.complete({ type: 'added', itemId: outcome.result.id });
              if (ctx.orderId) {
                navigateEditOrderWithPart(router, ctx.orderId, outcome.result.id);
              } else {
                navigateNewOrderWithPart(router, outcome.result.id);
              }
              if (router.canGoBack()) router.back();
            }
            return;
          }

          presentedKeyRef.current = `product:${payload}`;
          productSheetRef.current?.present();
          toast({ title: 'Запомним выбор для этого кода', variant: 'success' });
        });
      } catch (error) {
        toast({
          title: 'Не удалось сохранить выбор',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    },
    [dismissSheet, router, service],
  );

  const handleTryAi = useCallback(() => {
    const payload = snapshotRef.current.pendingPayload;
    if (!payload) return;
    setIsAiLoading(true);
    dismissSheet(notFoundSheetRef, () => {
      void service
        .disambiguate(payload)
        .catch((error) => {
          toast({
            title: 'Не удалось уточнить позицию',
            description: error instanceof Error ? error.message : undefined,
            variant: 'destructive',
          });
        })
        .finally(() => setIsAiLoading(false));
    });
  }, [dismissSheet, service]);

  const navigateToSearch = useCallback(
    (query?: string, sheetRef: RefObject<BottomSheetModal | null> = productSheetRef) => {
      const q = query?.trim();
      dismissSheet(sheetRef, () => {
        router.navigate((q ? `/(tabs)/search?q=${encodeURIComponent(q)}` : '/(tabs)/search') as Href);
      });
    },
    [dismissSheet, router],
  );

  const handleCreateItem = useCallback(() => {
    const state = snapshotRef.current;
    const payload = state.pendingPayload ?? '';
    const orderMode = state.context.mode === 'order';
    const orderId = state.context.mode === 'order' ? state.context.orderId : undefined;

    dismissSheet(notFoundSheetRef, () => {
      if (orderMode) {
        scanContextStore.complete({ type: 'create-item', barcode: payload });
        if (router.canGoBack()) {
          router.back();
        } else if (orderId) {
          router.navigate(`/(tabs)/orders/${encodeURIComponent(orderId)}/edit` as Href);
        } else {
          router.navigate('/(tabs)/orders/new' as Href);
        }
        return;
      }

      router.navigate(
        payload
          ? (`/(tabs)/search?q=${encodeURIComponent(payload)}` as Href)
          : ('/(tabs)/search' as Href),
      );
    });
  }, [dismissSheet, router]);

  const handleAddAsSpecific = useCallback(() => {
    const state = snapshotRef.current;
    const payload = state.pendingPayload ?? '';
    const orderMode = state.context.mode === 'order';
    const orderId = state.context.mode === 'order' ? state.context.orderId : undefined;

    dismissSheet(notFoundSheetRef, () => {
      if (orderMode) {
        scanContextStore.complete({ type: 'adhoc', barcode: payload });
        if (router.canGoBack()) {
          router.back();
        } else if (orderId) {
          router.navigate(`/(tabs)/orders/${encodeURIComponent(orderId)}/edit` as Href);
        } else {
          router.navigate('/(tabs)/orders/new' as Href);
        }
        return;
      }

      const q = payload.trim();
      router.navigate((q ? `/(tabs)/search?q=${encodeURIComponent(q)}` : '/(tabs)/search') as Href);
    });
  }, [dismissSheet, router]);

  const handleOpenUrl = useCallback(() => {
    const payload = snapshotRef.current.pendingPayload;
    if (!payload || !isHttpUrl(payload)) return;
    dismissSheet(notFoundSheetRef, () => {
      void Linking.openURL(payload);
    });
  }, [dismissSheet]);

  const handleCancelNotFound = useCallback(() => {
    const orderMode = snapshotRef.current.context.mode === 'order';
    dismissSheet(notFoundSheetRef, () => {
      if (orderMode && router.canGoBack()) router.back();
    });
  }, [dismissSheet, router]);

  const cameraActive =
    snapshot.phase === 'idle' || snapshot.phase === 'tracking';

  return {
    snapshot,
    parsedDocument,
    isAiLoading,
    showConfirmFlash,
    cameraActive: cameraActive && !ocrBusy,
    ocrBusy,
    cameraLayout,
    setCameraLayout,
    onDetection,
    onSheetClosed: handleSheetClosed,
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
    setParsedDocument,
  };
}
