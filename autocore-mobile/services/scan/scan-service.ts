import { readScanResolveCache } from '@/lib/scan/scan-resolve-cache';
import { scanPayloadKey } from '@/lib/scan/normalize-scan-payload';
import { ScanDebounce } from './scan-debounce';
import { mapApiResolve } from './handlers/resolve-handler';
import {
  disambiguateScanPayload,
  pickScanCandidate,
  resolveScanPayload,
  resolveScanPhoto,
  type ScanServiceDeps,
} from './scan-resolver';
import type {
  ScanContext,
  ScanDetection,
  ScanOutcome,
  ScanServiceListener,
  ScanServiceSnapshot,
  ScanSheetKind,
  ScanSource,
} from './types';

function sheetKindForOutcome(outcome: ScanOutcome | null): ScanSheetKind {
  if (!outcome) return null;
  switch (outcome.kind) {
    case 'product':
      return 'product';
    case 'candidates':
      return 'candidates';
    case 'not-found':
    case 'foreign-url':
      return 'not-found';
    case 'document':
      return 'document';
    default:
      return null;
  }
}

function activeResultForOutcome(outcome: ScanOutcome | null) {
  if (!outcome) return null;
  if (outcome.kind === 'product' || outcome.kind === 'candidates') return outcome.result;
  return null;
}

function isInstantOutcome(outcome: ScanOutcome): boolean {
  return (
    outcome.kind === 'navigate-entity' ||
    outcome.kind === 'navigate-vin' ||
    outcome.kind === 'foreign-url'
  );
}

function acceptsCameraInput(snapshot: ScanServiceSnapshot): boolean {
  // Allow re-scan while a result sheet is open so the next barcode replaces content
  // instead of feeling "dead" until the user dismisses the modal.
  if (snapshot.phase === 'paused' || snapshot.phase === 'resolving') return false;
  return true;
}

export class ScanService {
  private debounce = new ScanDebounce({ commitCooldownMs: 0, samePayloadCooldownMs: 450 });
  private listeners = new Set<ScanServiceListener>();
  private snapshot: ScanServiceSnapshot = {
    phase: 'idle',
    context: { mode: 'standalone' },
    detection: null,
    outcome: null,
    sheetKind: null,
    activeResult: null,
    pendingPayload: null,
    pendingDetections: null,
  };

  constructor(private readonly deps: ScanServiceDeps) {}

  subscribe(listener: ScanServiceListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  getState(): ScanServiceSnapshot {
    return this.snapshot;
  }

  setContext(context: ScanContext): void {
    this.patch({ context });
  }

  onDetection(detection: ScanDetection): void {
    if (!acceptsCameraInput(this.snapshot)) return;

    const payload = detection.payload.trim();
    if (!payload) return;

    const payloadKey = scanPayloadKey(payload);
    if (!this.debounce.canTrack(payloadKey)) return;

    this.debounce.noteSeen(payloadKey);
    this.patch({
      phase: 'tracking',
      detection: { ...detection, payload },
      pendingDetections: null,
    });

    void this.commitPayload(payload, 'camera').catch(() => undefined);
  }

  onDetections(detections: ScanDetection[]): void {
    if (detections.length === 1) {
      this.onDetection(detections[0]!);
    }
  }

  pickDetectedCode(payload: string): void {
    const detection =
      this.snapshot.pendingDetections?.find((entry) => entry.payload === payload) ?? null;
    this.patch({
      pendingDetections: null,
      sheetKind: null,
      detection,
    });
    void this.commitPayload(payload, 'camera').catch(() => undefined);
  }

  async commitPayload(payload: string, source: ScanSource = 'camera'): Promise<ScanOutcome | null> {
    if (!acceptsCameraInput(this.snapshot)) return null;

    const rawPayload = payload.trim();
    if (!rawPayload) return null;

    const payloadKey = scanPayloadKey(rawPayload);
    if (!this.debounce.canTrack(payloadKey)) return null;

    this.debounce.markCommitted(payloadKey);
    this.patch({
      phase: 'resolving',
      pendingPayload: rawPayload,
      // Keep prior product visible during resolve so the sheet does not collapse.
    });

    try {
      const cached = readScanResolveCache(rawPayload);
      // Cache-first: apply synchronously — no microtask/network on hot path.
      if (cached && (cached.found || cached.candidates.length > 0)) {
        return this.applyOutcome(mapApiResolve(rawPayload, cached, source), rawPayload);
      }

      const outcome = await resolveScanPayload(this.deps, {
        payload: rawPayload,
        source,
        canInventoryView: this.deps.canInventoryView(),
        allowMock: this.deps.allowMock(),
      });

      return this.applyOutcome(outcome, rawPayload);
    } catch (error) {
      console.warn('Scan resolve failed:', error);
      return this.applyOutcome({ kind: 'not-found', payload: rawPayload }, rawPayload);
    }
  }

  async pickCandidate(barcode: string, itemId: string, score: number): Promise<ScanOutcome | null> {
    const outcome = await pickScanCandidate(this.deps, { barcode, itemId, score });
    if (!outcome) return null;
    return this.applyOutcome(outcome, barcode);
  }

  async disambiguate(barcode: string): Promise<ScanOutcome | null> {
    const outcome = await disambiguateScanPayload(this.deps, barcode);
    return this.applyOutcome(outcome, barcode);
  }

  async resolvePhoto(uri: string, preferDocument: boolean): Promise<ScanOutcome | 'retry' | null> {
    if (this.snapshot.phase === 'resolving') return null;
    this.patch({ phase: 'resolving' });

    const outcome = await resolveScanPhoto(this.deps, uri, preferDocument, {
      canInventoryView: this.deps.canInventoryView(),
      allowMock: this.deps.allowMock(),
    });

    if (outcome === 'retry') {
      this.resume();
      return outcome;
    }

    return this.applyOutcome(outcome, this.snapshot.pendingPayload ?? uri);
  }

  private applyOutcome(outcome: ScanOutcome, payload: string): ScanOutcome {
    if (outcome.kind === 'product') {
      this.debounce.markCommitResult('success');
    } else if (outcome.kind === 'not-found' || outcome.kind === 'candidates') {
      this.debounce.markCommitResult('miss');
    }

    if (isInstantOutcome(outcome)) {
      this.patch({
        phase: 'paused',
        outcome,
        pendingPayload: payload,
      });
      return outcome;
    }

    const sheetKind = sheetKindForOutcome(outcome);
    this.patch({
      phase: sheetKind ? 'confirmed' : 'paused',
      outcome,
      sheetKind,
      activeResult: activeResultForOutcome(outcome),
      pendingPayload: payload,
    });
    return outcome;
  }

  pause(): void {
    this.patch({ phase: 'paused' });
  }

  resume(): void {
    this.debounce.reset();
    this.patch({
      phase: 'idle',
      detection: null,
      outcome: null,
      sheetKind: null,
      activeResult: null,
      pendingPayload: null,
      pendingDetections: null,
    });
  }

  dismissSheet(): void {
    this.debounce.fullReset();
    this.resume();
  }

  private patch(patch: Partial<ScanServiceSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }
}

export type { ScanServiceDeps };
