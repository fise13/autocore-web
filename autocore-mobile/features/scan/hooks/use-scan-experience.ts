import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Linking } from 'react-native';
import { useIsFocused, useRouter, type Href } from 'expo-router';

import { toast } from '@/components/ui';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import {
  useMobileScanDisambiguate,
  useMobileScanFeedback,
  useMobileScanOcr,
  useMobileScanResolve,
  useSession,
} from '@/hooks';
import { useMobileRelocate, useMobileAssignAssetLocation } from '@/hooks/use-mobile-relocate';
import { rememberRecentScan } from '@/lib/scan/recent-scans';
import { readScanResolveCache, writeScanResolveCache } from '@/lib/scan/scan-resolve-cache';
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
import { classifyScanPayload, isHttpUrl } from '../lib/classify-payload';
import { interpretRelocateScan } from '../lib/interpret-relocate-scan';
import type { ParsedDocument } from '../lib/parse-document';
import { relocatePendingStore } from '../lib/relocate-pending-store';

function useDevMockFallback(): boolean {
  return __DEV__;
}

function sheetPresentationKey(state: ScanServiceSnapshot): string | null {
  if (state.phase !== 'confirmed' || !state.sheetKind) return null;
  if (state.sheetKind === 'code-picker') {
    const payloads = (state.pendingDetections ?? []).map((entry) => entry.payload).join('|');
    return `code-picker:${payloads}`;
  }
  return `${state.sheetKind}:${state.pendingPayload ?? ''}`;
}

export function useScanExperience(initialContext?: ScanContext) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { can } = useSession();
  const allowMock = useDevMockFallback();
  const scanResolve = useMobileScanResolve();
  const scanDisambiguate = useMobileScanDisambiguate();
  const scanOcr = useMobileScanOcr();
  const scanFeedback = useMobileScanFeedback();
  const relocate = useMobileRelocate();
  const assignAsset = useMobileAssignAssetLocation();
  const addToOrderFlow = useAddToOrderFlow();

  const productSheetRef = useRef<BottomSheetModal>(null);
  const candidatesSheetRef = useRef<BottomSheetModal>(null);
  const notFoundSheetRef = useRef<BottomSheetModal>(null);
  const documentSheetRef = useRef<BottomSheetModal>(null);
  const codePickerSheetRef = useRef<BottomSheetModal>(null);
  const moveSheetRef = useRef<BottomSheetModal>(null);
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const relocateBusyRef = useRef(false);
  const relocateMutateRef = useRef(relocate.mutateAsync);
  relocateMutateRef.current = relocate.mutateAsync;
  const assignAssetMutateRef = useRef(assignAsset.mutateAsync);
  assignAssetMutateRef.current = assignAsset.mutateAsync;

  const [snapshot, setSnapshot] = useState<ScanServiceSnapshot>(() => ({
    phase: 'idle',
    context: initialContext ?? { mode: 'standalone' },
    detection: null,
    outcome: null,
    sheetKind: null,
    activeResult: null,
    pendingPayload: null,
    pendingDetections: null,
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
      resolveInventory: async (barcode, source) => {
        const cached = readScanResolveCache(barcode);
        if (cached) return cached;
        const result = await scanResolveRef.current.mutateAsync({ barcode, source });
        if (result.found) writeScanResolveCache(barcode, result);
        return result;
      },
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
      // Clear immediately so a fast re-scan can present again (avoids stuck key).
      presentedKeyRef.current = null;
      afterDismissRef.current = afterClose ?? null;
      sheetRef.current?.dismiss();

      // Fallback if onDismiss does not fire (already closed / race).
      setTimeout(() => {
        if (!dismissingRef.current) return;
        handleSheetClosed();
      }, 320);
    },
    [handleSheetClosed],
  );

  /** Force-close every scan modal + clear service sheet state (blur / leave tab). */
  const dismissAllSheets = useCallback(() => {
    afterDismissRef.current = null;
    dismissingRef.current = false;
    presentedKeyRef.current = null;
    setShowConfirmFlash(false);
    productSheetRef.current?.dismiss();
    candidatesSheetRef.current?.dismiss();
    notFoundSheetRef.current?.dismiss();
    documentSheetRef.current?.dismiss();
    codePickerSheetRef.current?.dismiss();
    moveSheetRef.current?.dismiss();
    relocatePendingStore.clear();
    service.dismissSheet();
  }, [service]);

  const completePendingRelocateFromScan = useCallback(
    async (payload: string) => {
      const pending = relocatePendingStore.get();
      if (!pending || relocateBusyRef.current) return true;

      // Fill location: next scan should be a motor (or specific) entity QR.
      if (pending.kind === 'fill-location') {
        const classified = classifyScanPayload(payload);
        if (classified.type !== 'entity-link' || classified.entity !== 'motor') {
          toast({
            title: 'Сканируйте двигатель',
            description: `Размещаем в ${pending.displayCode}`,
            variant: 'warning',
          });
          service.dismissSheet();
          return true;
        }

        relocateBusyRef.current = true;
        try {
          const result = await assignAssetMutateRef.current({
            entityType: 'motor',
            entityId: classified.id,
            toLocationId: pending.locationId,
            warehouseId: pending.warehouseId,
          });
          relocatePendingStore.clear();
          haptics.success();
          void rememberRecentScan({
            payload,
            label: `→ ${result.toLocationCode}`,
            itemId: classified.id,
          });
          toast({
            title: 'Размещено',
            description: `${classified.id} → ${result.toLocationCode}`,
            variant: 'success',
          });
          service.dismissSheet();
        } catch (error) {
          toast({
            title: 'Не удалось разместить',
            description: error instanceof Error ? error.message : undefined,
            variant: 'destructive',
          });
          service.dismissSheet();
        } finally {
          relocateBusyRef.current = false;
        }
        return true;
      }

      const target = interpretRelocateScan(payload);
      if (target.kind === 'reject') {
        toast({
          title: 'Нужно место',
          description: target.reason,
          variant: 'warning',
        });
        service.dismissSheet();
        return true;
      }

      relocateBusyRef.current = true;
      try {
        if (pending.kind === 'assign-asset') {
          const result = await assignAssetMutateRef.current({
            entityType: pending.entityType,
            entityId: pending.entityId,
            toLocationId: target.kind === 'locationId' ? target.id : undefined,
            toLocationCode: target.kind === 'locationCode' ? target.code : undefined,
          });
          relocatePendingStore.clear();
          haptics.success();
          void rememberRecentScan({
            payload: target.payload,
            label: `${pending.title} → ${result.toLocationCode}`,
            itemId: pending.entityId,
          });
          toast({
            title: 'Размещено',
            description: `${pending.title} → ${result.toLocationCode}`,
            variant: 'success',
          });
          service.dismissSheet();
          return true;
        }

        const result = await relocateMutateRef.current({
          itemId: pending.itemId,
          warehouseId: pending.warehouseId,
          toLocationId: target.kind === 'locationId' ? target.id : undefined,
          toLocationCode: target.kind === 'locationCode' ? target.code : undefined,
          quantity: pending.quantity,
          reason: 'Перемещение со сканера',
        });
        relocatePendingStore.clear();
        haptics.success();
        void rememberRecentScan({
          payload: target.payload,
          label: `${pending.itemTitle} → ${result.toLocationCode}`,
          itemId: pending.itemId,
        });
        toast({
          title: 'Перемещено',
          description: `${pending.itemTitle} → ${result.toLocationCode}`,
          variant: 'success',
        });
        service.dismissSheet();
      } catch (error) {
        toast({
          title: 'Не удалось переместить',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
        service.dismissSheet();
      } finally {
        relocateBusyRef.current = false;
      }
      return true;
    },
    [service],
  );

  const handleInstantOutcome = useCallback(
    (outcome: ScanOutcome) => {
      if (relocatePendingStore.get()) {
        const payload =
          outcome.kind === 'foreign-url'
            ? outcome.url
            : 'payload' in outcome
              ? outcome.payload
              : snapshotRef.current.pendingPayload ?? '';
        void completePendingRelocateFromScan(payload);
        return;
      }

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
        if (!isFocusedRef.current) return;
        const key = `not-found:${outcome.url}`;
        if (presentedKeyRef.current === key) return;
        presentedKeyRef.current = key;
        notFoundSheetRef.current?.present();
      }
    },
    [completePendingRelocateFromScan, router, service],
  );

  const handleOrderOutcome = useCallback(
    (outcome: ScanOutcome) => {
      const ctx = snapshotRef.current.context;
      if (ctx.mode !== 'order') return false;

      if (outcome.kind === 'product') {
        const itemId = outcome.result.id;
        scanContextStore.complete({ type: 'added', itemId });
        presentedKeyRef.current = null;
        service.dismissSheet();
        productSheetRef.current?.dismiss();
        candidatesSheetRef.current?.dismiss();
        notFoundSheetRef.current?.dismiss();

        requestAnimationFrame(() => {
          if (router.canGoBack()) router.back();
        });

        haptics.success();
        toast({ title: 'Запчасть добавлена в наряд', variant: 'success' });
        return true;
      }

      return false;
    },
    [router, service],
  );

  const presentSheetForSnapshot = useCallback(
    (state: ScanServiceSnapshot) => {
      if (!isFocusedRef.current) return;
      if (!state.sheetKind || state.phase !== 'confirmed') return;

      const key = sheetPresentationKey(state);
      if (!key || presentedKeyRef.current === key) return;

      // A new confirmed result wins over an in-flight dismiss (common after close + immediate re-scan).
      if (dismissingRef.current) {
        dismissingRef.current = false;
        afterDismissRef.current = null;
      }

      if (state.context.mode === 'order' && state.outcome) {
        if (handleOrderOutcome(state.outcome)) return;
      }

      // Avoid presenting empty shells (minHeight: 1) — remount + stuck Gorhom backdrop.
      if (state.sheetKind === 'product' && !state.activeResult) return;
      if (state.sheetKind === 'not-found' && !state.pendingPayload) return;
      if (state.sheetKind === 'document' && state.outcome?.kind !== 'document') return;
      if (state.sheetKind === 'code-picker' && !(state.pendingDetections?.length)) return;

      const previousKey = presentedKeyRef.current;
      const previousKind = previousKey?.split(':')[0] ?? null;
      const replacingOpenSheet =
        Boolean(previousKind) && previousKind === state.sheetKind && previousKey !== key;

      presentedKeyRef.current = key;

      const presentWithRetry = (sheetRef: RefObject<BottomSheetModal | null>, attempt = 0) => {
        const modal = sheetRef.current;
        if (modal) {
          // Replacing content in an already-open sheet — snap up, skip full re-present.
          if (replacingOpenSheet) {
            try {
              modal.snapToIndex(0);
            } catch {
              modal.present();
            }
            return;
          }
          modal.present();
          return;
        }
        if (attempt >= 4) {
          // Ref never ready — clear key so the next effect/snapshot can retry.
          if (presentedKeyRef.current === key) presentedKeyRef.current = null;
          return;
        }
        requestAnimationFrame(() => presentWithRetry(sheetRef, attempt + 1));
      };

      if (state.sheetKind === 'product') presentWithRetry(productSheetRef);
      else if (state.sheetKind === 'candidates') presentWithRetry(candidatesSheetRef);
      else if (state.sheetKind === 'not-found') presentWithRetry(notFoundSheetRef);
      else if (state.sheetKind === 'document') presentWithRetry(documentSheetRef);
      else if (state.sheetKind === 'code-picker') presentWithRetry(codePickerSheetRef);

      setShowConfirmFlash(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setShowConfirmFlash(false), 220);
    },
    [handleOrderOutcome],
  );

  useEffect(() => {
    const state = snapshot;

    if (state.phase === 'confirmed' && state.sheetKind === 'code-picker') {
      if (relocatePendingStore.get()) {
        const first = state.pendingDetections?.[0]?.payload;
        if (first) void completePendingRelocateFromScan(first);
        return;
      }
      presentSheetForSnapshot(state);
      return;
    }

    if (!state.outcome) return;

    if (relocatePendingStore.get() && state.pendingPayload) {
      void completePendingRelocateFromScan(state.pendingPayload);
      return;
    }

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
    completePendingRelocateFromScan,
    handleInstantOutcome,
    presentSheetForSnapshot,
    snapshot.outcome,
    snapshot.phase,
    snapshot.sheetKind,
    snapshot.pendingPayload,
    snapshot.pendingDetections,
    snapshot.context.mode,
  ]);

  const onDetection = useCallback(
    (detection: ScanDetection) => {
      service.onDetection(detection);
    },
    [service],
  );

  const onDetections = useCallback(
    (detections: ScanDetection[]) => {
      service.onDetections(detections);
    },
    [service],
  );

  const handlePickDetectedCode = useCallback(
    (detection: ScanDetection) => {
      dismissSheet(codePickerSheetRef, () => {
        service.pickDetectedCode(detection.payload);
      });
    },
    [dismissSheet, service],
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
            scanContextStore.complete({ type: 'added', itemId: outcome.result.id });
            requestAnimationFrame(() => {
              if (router.canGoBack()) router.back();
            });
            haptics.success();
            toast({ title: 'Запчасть добавлена в наряд', variant: 'success' });
            return;
          }

          if (!isFocusedRef.current) return;
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
    if (!payload.trim()) return;

    const orderMode = state.context.mode === 'order';
    const orderId = state.context.mode === 'order' ? state.context.orderId : undefined;
    const orderLabel = state.context.mode === 'order' ? state.context.orderLabel : undefined;

    dismissSheet(notFoundSheetRef, () => {
      const query = new URLSearchParams({ barcode: payload.trim() });
      if (orderMode) {
        query.set('context', 'order');
        if (orderId) query.set('orderId', orderId);
        if (orderLabel) query.set('orderLabel', orderLabel);
      }
      router.push(`/(tabs)/orders/create-item?${query.toString()}` as Href);
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

  const scanEnabled = !ocrBusy;

  return {
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
    onSheetClosed: handleSheetClosed,
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
    setParsedDocument,
  };
}
